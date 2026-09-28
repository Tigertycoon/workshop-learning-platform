import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { Server } from 'node:http';
import type Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const fixture = mkdtempSync(path.join(tmpdir(), 'workshop-test-'));
const password = 'Only-for-this-test-42';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.DATABASE_PATH = path.join(fixture, 'test.db');
process.env.MEDIA_ROOT = path.join(fixture, 'media');
process.env.NODE_ENV = 'test';
let server: Server;
let db: Database.Database;
let base: string;
let admin: string;
let learner: string;
let learnerId: number;

async function request(route: string, token?: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + route, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

before(async () => {
  db = (await import('../db')).default;
  const { seedDemo } = await import('../demoData');
  assert.equal(seedDemo(db, password, password), true);
  const { app } = await import('../app');
  server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
  const adminLogin = await request('/api/auth/login', undefined, 'POST', { username: 'demo-admin', pin: password });
  const learnerLogin = await request('/api/auth/login', undefined, 'POST', { username: 'demo-learner', pin: password });
  assert.equal(adminLogin.status, 200);
  assert.equal(learnerLogin.status, 200);
  admin = adminLogin.body.token;
  learner = learnerLogin.body.token;
  learnerId = learnerLogin.body.user.id;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (db?.open) db.close();
  rmSync(fixture, { recursive: true, force: true });
});

test('configuration rejects a missing/known secret and invalid port', async () => {
  const { readConfig } = await import('../config');
  assert.throws(() => readConfig({}), /JWT_SECRET/);
  assert.throws(() => readConfig({ JWT_SECRET: 'workshop-platform-secret-change-in-production' }), /JWT_SECRET/);
  assert.throws(() => readConfig({ JWT_SECRET: process.env.JWT_SECRET, PORT: '0' }), /PORT/);
  assert.equal(readConfig({ JWT_SECRET: process.env.JWT_SECRET }).host, '127.0.0.1');
});

test('health, missing API routes and malformed JSON return bounded, typed responses', async () => {
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('x-powered-by'), null);
  assert.equal((await request('/api/does-not-exist')).status, 404);
  const malformed = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.ok((await malformed.json()).error);
  assert.equal((await fetch(base + '/uploads/missing.png')).status, 404);
});

test('anonymous and learner accounts cannot read admin data', async () => {
  assert.equal((await request('/api/admin/groups')).status, 401);
  assert.equal((await request('/api/admin/groups', learner)).status, 403);
  assert.equal((await request('/api/admin/groups', admin)).status, 200);
});

test('registration validates types, password length and bcrypt byte limit', async () => {
  for (const body of [{ username: [], pin: password }, { username: 'short', pin: '1234' }, { username: 'long', pin: '🦊'.repeat(30) }]) {
    assert.equal((await request('/api/auth/register', undefined, 'POST', body)).status, 400);
  }
  const registered = await request('/api/auth/register', undefined, 'POST', { username: 'new-learner', pin: password, role: 'admin' });
  assert.equal(registered.status, 200);
  assert.equal(registered.body.user.role, 'kind');
  const row = db.prepare('SELECT pin_hash FROM users WHERE username = ?').get('new-learner') as { pin_hash: string };
  assert.notEqual(row.pin_hash, password);
  assert.match(row.pin_hash, /^\$2/);
});

test('old fallback signatures and malformed identities are refused', async () => {
  const forged = jwt.sign({ id: 1 }, 'workshop-platform-secret-change-in-production');
  assert.equal((await request('/api/auth/me', forged)).status, 401);
  const malformed = jwt.sign({ id: [] }, process.env.JWT_SECRET!);
  assert.equal((await request('/api/auth/me', malformed)).status, 401);
});

test('authorization uses the current role in the database', async () => {
  db.prepare("UPDATE users SET role = 'kind' WHERE username = 'demo-admin'").run();
  try { assert.equal((await request('/api/admin/groups', admin)).status, 403); }
  finally { db.prepare("UPDATE users SET role = 'admin' WHERE username = 'demo-admin'").run(); }
});

test('group management validates requests and a learner can join by code', async () => {
  assert.equal((await request('/api/admin/groups', admin, 'POST', { name: [] })).status, 400);
  const group = await request('/api/admin/groups', admin, 'POST', { name: 'Demo-Gruppe B' });
  assert.equal(group.status, 200);
  assert.equal((await request('/api/auth/join-group', learner, 'POST', { code: group.body.code })).status, 200);
  assert.equal((await request('/api/admin/groups/1abc/members', admin)).status, 400);
});

test('progress accepts booleans and preserves a real completed task', async () => {
  assert.equal((await request('/api/progress/1', learner, 'POST', { completed: 'false' })).status, 400);
  assert.equal((await request('/api/progress/1', learner, 'POST', { completed: true })).status, 200);
  const progress = await request('/api/progress', learner);
  assert.ok(progress.body.some((row: { task_id: number }) => row.task_id === 1));
});

test('content edits validate before writing and roll back a failed replacement', async () => {
  const route = '/api/admin/content/tasks/1/steps';
  const steps = () => db.prepare('SELECT * FROM task_steps WHERE task_id = 1 ORDER BY step_order').all();
  const original = steps();
  assert.ok(original.length > 0);
  assert.equal((await request(route, admin, 'PUT', { steps: [{ step_order: 0, text: [] }] })).status, 400);
  assert.deepEqual(steps(), original);
  db.exec(`CREATE TRIGGER reject_test_step BEFORE INSERT ON task_steps
    WHEN NEW.text = 'simulate-write-failure' BEGIN SELECT RAISE(ABORT, 'test constraint'); END`);
  try {
    const replacement = [{ step_order: 0, text: 'Would otherwise replace existing work' },
      { step_order: 1, text: 'simulate-write-failure' }];
    assert.equal((await request(route, admin, 'PUT', { steps: replacement })).status, 409);
    assert.deepEqual(steps(), original);
  } finally {
    db.exec('DROP TRIGGER reject_test_step');
  }
  const created = await request('/api/admin/content/chapters', admin, 'POST', { title: 'First chapter', chapter_order: 0 });
  assert.equal(created.status, 200);
  const chapter = await request(`/api/admin/content/chapters/${created.body.id}`, admin);
  assert.equal(chapter.body.chapter_order, 0);
  assert.equal((await request(`/api/admin/content/chapters/${created.body.id}`, admin, 'DELETE')).status, 200);
});

test('learner submission, admin review and game unlock form one complete workflow', async () => {
  assert.equal((await request('/api/activities/access', learner)).body.unlocked, false);
  assert.equal((await request('/api/activities/1/submit', learner, 'POST', {})).status, 400);
  assert.equal((await request('/api/activities/1/submit', learner, 'POST', { note: '   ' })).status, 400);
  assert.equal((await request('/api/activities/1/submit', learner, 'POST', { note: [] })).status, 400);
  assert.equal((await request('/api/activities/1/submit', learner, 'POST', { file_url: 'javascript:alert(1)' })).status, 400);
  const submission = await request('/api/activities/1/submit', learner, 'POST', { note: 'Ein Spiel mit einem klaren Ziel und direktem Feedback.' });
  assert.equal(submission.status, 200);
  const route = `/api/admin/review/submissions/${submission.body.id}`;
  assert.equal((await request(route, learner, 'POST', { status: 'approved' })).status, 403);
  assert.equal((await request(route, admin, 'POST', { status: 'approved', feedback: 'Gut nachvollziehbar.' })).status, 200);
  assert.equal((await request('/api/activities/access', learner)).body.unlocked, true);
});

test('CSV export escapes quotes and neutralizes spreadsheet formulas', async () => {
  const group = await request('/api/admin/groups', admin, 'POST', { name: '=1+1,"Example"' });
  assert.equal(group.status, 200);
  const original = db.prepare('SELECT group_id FROM users WHERE id = ?').get(learnerId) as { group_id: number };
  db.prepare('UPDATE users SET group_id = ? WHERE id = ?').run(group.body.id, learnerId);
  try {
    const response = await fetch(base + '/api/admin/content/progress-csv', { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /text\/csv/);
    assert.ok((await response.text()).includes(`"'=1+1,""Example""","demo-learner"`));
  } finally {
    db.prepare('UPDATE users SET group_id = ? WHERE id = ?').run(original.group_id, learnerId);
  }
});

test('re-running the demo preserves accounts, progress and submissions', async () => {
  const { seedDemo } = await import('../demoData');
  const state = () => ['users', 'progress', 'submissions'].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
  const original = state();
  assert.equal(seedDemo(db, password, password), false);
  assert.deepEqual(state(), original);
  const seedEnv = { ...process.env, DEMO_ADMIN_PASSWORD: password, DEMO_STUDENT_PASSWORD: password };
  for (let i = 0; i < 2; i++) {
    const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'seedDemo.ts'], {
      cwd: path.resolve(__dirname, '..'), env: seedEnv, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(state(), original);
  }
  const production = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'seedDemo.ts'], {
    cwd: path.resolve(__dirname, '..'), env: { ...seedEnv, NODE_ENV: 'production' }, encoding: 'utf8', windowsHide: true,
  });
  assert.notEqual(production.status, 0);
  assert.match(production.stderr, /disabled in production/);
  assert.deepEqual(state(), original);
});

test('uploads reject unauthorized access, traversal, active content and oversized bodies', async () => {
  const upload = (name: string, body: Buffer, token = admin) => fetch(base + '/api/admin/content/upload-simple?filename=' + encodeURIComponent(name), {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(body).buffer,
  });
  assert.equal((await upload('image.png', Buffer.from('test'), learner)).status, 403);
  assert.equal((await upload('../escape.png', Buffer.from('test'))).status, 400);
  assert.equal((await upload('script.html', Buffer.from('<script>'))).status, 415);
  assert.equal((await upload('image.svg', Buffer.from('<svg/>'))).status, 415);
  assert.equal((await upload('empty.png', Buffer.alloc(0))).status, 400);
  assert.equal((await upload('large.png', Buffer.alloc(20 * 1024 * 1024 + 1))).status, 413);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf9sAAAAASUVORK5CYII=', 'base64');
  const accepted = await upload('preview.png', png);
  assert.equal(accepted.status, 201);
  const result = await accepted.json();
  assert.match(result.filename, /^[a-f0-9-]+\.png$/);
  const served = await fetch(base + result.url);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
});

test('failed login attempts are rate limited with retry guidance', async () => {
  let response;
  for (let i = 0; i < 12; i++) {
    response = await request('/api/auth/login', undefined, 'POST', { username: 'demo-learner', pin: 'wrong-password' });
    if (response.status === 429) break;
    assert.equal(response.status, 401);
  }
  assert.equal(response!.status, 429);
  assert.ok(Number(response!.headers.get('retry-after')) > 0);
  assert.equal((await request('/api/auth/me', learner)).body.user.id, learnerId);
});
