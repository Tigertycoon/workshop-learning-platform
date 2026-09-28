import { randomInt } from 'node:crypto';
import { validateIds, validateBody, positiveId, taskStatus } from '../validation';
import { z } from 'zod';
import { Router } from 'express';
import db from '../db';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
validateIds(router);
router.use(authMiddleware, adminMiddleware);

// =========================================================================
// GRUPPEN
// =========================================================================

// GET /api/admin/groups — Alle Gruppen
router.get('/groups', (_req, res) => {
  const groups = db.prepare(`
    SELECT g.*, COUNT(u.id) as member_count
    FROM groups g
    LEFT JOIN users u ON u.group_id = g.id AND u.role = 'kind'
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();
  res.json(groups);
});

// POST /api/admin/groups — Neue Gruppe erstellen
router.post('/groups', validateBody(z.object({ name: z.string().trim().min(1).max(100) })), (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name ist erforderlich' });
    return;
  }

  // Generate random 6-char code
  const code = generateGroupCode();

  const result = db.prepare(
    'INSERT INTO groups (name, code) VALUES (?, ?)'
  ).run(name, code);

  res.json({ id: result.lastInsertRowid, name, code });
});

// DELETE /api/admin/groups/:id
router.delete('/groups/:id', (req, res) => {
  const groupId = parseInt(req.params.id);

  db.transaction(() => {
    // Unassign users from this group
    db.prepare('UPDATE users SET group_id = NULL WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_task_overrides WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);

  })();

  res.json({ success: true });
});

// =========================================================================
// GRUPPEN-MITGLIEDER
// =========================================================================

// GET /api/admin/groups/:id/members — Mitglieder einer Gruppe mit Fortschritt
router.get('/groups/:id/members', (req, res) => {
  const groupId = parseInt(req.params.id);

  const members = db.prepare(`
    SELECT u.id, u.username, u.created_at,
      (SELECT COUNT(*) FROM progress p
       JOIN tasks t ON t.id = p.task_id
       WHERE p.user_id = u.id AND p.completed = 1) as completed_tasks,
      (SELECT COUNT(*) FROM tasks) as total_tasks
    FROM users u
    WHERE u.group_id = ? AND u.role = 'kind'
    ORDER BY u.username
  `).all(groupId);

  res.json(members);
});

// PUT /api/admin/users/:id/group — User in andere Gruppe verschieben
router.put('/users/:id/group', validateBody(z.object({ groupId: positiveId.nullable() })), (req, res) => {
  const userId = parseInt(req.params.id);
  const { groupId } = req.body;

  db.prepare('UPDATE users SET group_id = ? WHERE id = ?').run(groupId, userId);
  res.json({ success: true });
});

// =========================================================================
// TASK OVERRIDES
// =========================================================================

// GET /api/admin/groups/:id/overrides — Alle Overrides einer Gruppe
router.get('/groups/:id/overrides', (req, res) => {
  const groupId = parseInt(req.params.id);

  const overrides = db.prepare(
    'SELECT task_id, status FROM group_task_overrides WHERE group_id = ?'
  ).all(groupId);

  res.json(overrides);
});

// PUT /api/admin/groups/:id/overrides — Override setzen/entfernen
router.put('/groups/:id/overrides', validateBody(z.object({ taskId: positiveId, status: taskStatus.nullish() })), (req, res) => {
  const groupId = parseInt(req.params.id);
  const { taskId, status } = req.body;

  if (!taskId) {
    res.status(400).json({ error: 'taskId erforderlich' });
    return;
  }

  if (!status || status === 'default') {
    // Remove override → fall back to default
    db.prepare(
      'DELETE FROM group_task_overrides WHERE group_id = ? AND task_id = ?'
    ).run(groupId, taskId);
  } else {
    db.prepare(`
      INSERT INTO group_task_overrides (group_id, task_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(group_id, task_id) DO UPDATE SET status = ?
    `).run(groupId, taskId, status, status);
  }

  res.json({ success: true });
});

// PUT /api/admin/users/:userId/overrides — User-spezifischer Override
router.put('/users/:userId/overrides', validateBody(z.object({ taskId: positiveId, status: taskStatus.nullish() })), (req, res) => {
  const userId = parseInt(req.params.userId);
  const { taskId, status } = req.body;

  if (!taskId) {
    res.status(400).json({ error: 'taskId erforderlich' });
    return;
  }

  if (!status || status === 'default') {
    db.prepare(
      'DELETE FROM user_task_overrides WHERE user_id = ? AND task_id = ?'
    ).run(userId, taskId);
  } else {
    db.prepare(`
      INSERT INTO user_task_overrides (user_id, task_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, task_id) DO UPDATE SET status = ?
    `).run(userId, taskId, status, status);
  }

  res.json({ success: true });
});

// =========================================================================
// HELPERS
// =========================================================================

function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomInt(chars.length));
  }
  // Check uniqueness
  const existing = db.prepare('SELECT id FROM groups WHERE code = ?').get(code);
  if (existing) return generateGroupCode();
  return code;
}

export default router;
