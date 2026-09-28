import express from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { validateIds, validateBody, positiveId } from '../validation';
import { z } from 'zod';
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
validateIds(router);
router.use(authMiddleware, adminMiddleware);

const text = z.string().trim().min(1).max(200);
const mediaUrl = z.string().max(2048).refine(value => value === '' || /^https?:\/\//.test(value) || /^\/uploads\//.test(value));
const chapterBody = z.object({
  title: text, description: z.string().max(4000).nullish().default(''),
  chapter_order: z.number().int().min(0).max(100000).default(99),
  type: z.enum(['linear', 'frei', 'wahl', 'inspiration']).default('frei'),
  icon: z.string().max(32).nullish().default('📝'),
});
const taskBody = z.object({
  title: text, description: z.string().max(4000).nullish().default(''),
  task_order: z.number().int().min(0).max(100000).default(0),
  default_status: z.enum(['pflicht', 'extra']).default('pflicht'),
});

// =========================================================================
// KAPITEL CRUD
// =========================================================================

// GET /api/admin/content/chapters — Alle Kapitel mit Task-Anzahl
router.get('/chapters', (_req, res) => {
  const chapters = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.chapter_id = c.id) as task_count
    FROM chapters c
    ORDER BY c.chapter_order
  `).all();
  res.json(chapters);
});

// GET /api/admin/content/chapters/:id — Einzelnes Kapitel mit allen Tasks + Details
router.get('/chapters/:id', (req, res) => {
  const chapterId = parseInt(req.params.id);

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
  if (!chapter) {
    res.status(404).json({ error: 'Kapitel nicht gefunden' });
    return;
  }

  const tasks = db.prepare(`
    SELECT * FROM tasks WHERE chapter_id = ? ORDER BY task_order
  `).all(chapterId) as any[];

  const tasksWithDetails = tasks.map(task => {
    const steps = db.prepare(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order'
    ).all(task.id);
    const criteria = db.prepare(
      'SELECT * FROM task_criteria WHERE task_id = ? ORDER BY criteria_order'
    ).all(task.id);
    const media = db.prepare(
      'SELECT * FROM task_media WHERE task_id = ?'
    ).all(task.id);

    return { ...task, steps, criteria, media };
  });

  res.json({ ...chapter, tasks: tasksWithDetails });
});

// PUT /api/admin/content/chapters/:id — Kapitel bearbeiten
router.put('/chapters/:id', validateBody(chapterBody), (req, res) => {
  const chapterId = parseInt(req.params.id);
  const { title, description, chapter_order, type, icon } = req.body;

  db.prepare(`
    UPDATE chapters SET title = ?, description = ?, chapter_order = ?, type = ?, icon = ?
    WHERE id = ?
  `).run(title, description, chapter_order, type, icon, chapterId);

  res.json({ success: true });
});

// POST /api/admin/content/chapters — Neues Kapitel
router.post('/chapters', validateBody(chapterBody), (req, res) => {
  const { title, description, chapter_order, type, icon } = req.body;

  const result = db.prepare(`
    INSERT INTO chapters (title, description, chapter_order, type, icon)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, description, chapter_order ?? 99, type || 'frei', icon || '📝');

  res.json({ id: result.lastInsertRowid });
});

// DELETE /api/admin/content/chapters/:id
router.delete('/chapters/:id', (req, res) => {
  const chapterId = parseInt(req.params.id);

  db.transaction(() => {
    // Cascade: delete tasks, steps, criteria, media, overrides, progress
    const tasks = db.prepare('SELECT id FROM tasks WHERE chapter_id = ?').all(chapterId) as any[];
    for (const task of tasks) {
      db.prepare('DELETE FROM task_steps WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM task_criteria WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM task_media WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM progress WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM group_task_overrides WHERE task_id = ?').run(task.id);
      db.prepare('DELETE FROM user_task_overrides WHERE task_id = ?').run(task.id);
    }
    db.prepare('DELETE FROM tasks WHERE chapter_id = ?').run(chapterId);
    db.prepare('DELETE FROM chapter_prerequisites WHERE chapter_id = ? OR prerequisite_id = ?').run(chapterId, chapterId);
    db.prepare('DELETE FROM chapters WHERE id = ?').run(chapterId);

  })();

  res.json({ success: true });
});


// =========================================================================
// TASK CRUD
// =========================================================================

// POST /api/admin/content/tasks — Neue Aufgabe
router.post('/tasks', validateBody(taskBody.extend({ chapter_id: positiveId })), (req, res) => {
  const { chapter_id, title, description, task_order, default_status } = req.body;

  const result = db.prepare(`
    INSERT INTO tasks (chapter_id, title, description, task_order, default_status)
    VALUES (?, ?, ?, ?, ?)
  `).run(chapter_id, title, description || '', task_order || 0, default_status || 'pflicht');

  res.json({ id: result.lastInsertRowid });
});

// PUT /api/admin/content/tasks/:id — Aufgabe bearbeiten
router.put('/tasks/:id', validateBody(taskBody), (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, task_order, default_status } = req.body;

  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, task_order = ?, default_status = ?
    WHERE id = ?
  `).run(title, description, task_order, default_status, taskId);

  res.json({ success: true });
});

// DELETE /api/admin/content/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);

  db.transaction(() => {
    db.prepare('DELETE FROM task_steps WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM task_criteria WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM task_media WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM progress WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM group_task_overrides WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM user_task_overrides WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

  })();

  res.json({ success: true });
});


// =========================================================================
// STEPS CRUD
// =========================================================================

// PUT /api/admin/content/tasks/:taskId/steps — Alle Steps einer Aufgabe ersetzen
router.put('/tasks/:taskId/steps', validateBody(z.object({ steps: z.array(z.object({ step_order: z.number().int().min(0).max(100000), text: z.string().min(1).max(8000), media_url: mediaUrl.nullish() })).max(100) })), (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { steps } = req.body; // Array of { step_order, text, media_url }

  // Delete all existing steps and re-insert
  db.transaction(() => {
    db.prepare('DELETE FROM task_steps WHERE task_id = ?').run(taskId);

    const insert = db.prepare(
      'INSERT INTO task_steps (task_id, step_order, text, media_url) VALUES (?, ?, ?, ?)'
    );

    for (const step of steps) {
      insert.run(taskId, step.step_order, step.text, step.media_url || null);
    }

  })();

  res.json({ success: true });
});


// =========================================================================
// CRITERIA CRUD
// =========================================================================

// PUT /api/admin/content/tasks/:taskId/criteria — Alle Kriterien ersetzen
router.put('/tasks/:taskId/criteria', validateBody(z.object({ criteria: z.array(z.object({ criteria_order: z.number().int().min(0).max(100000), text: z.string().min(1).max(4000) })).max(100) })), (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { criteria } = req.body; // Array of { criteria_order, text }

  db.transaction(() => {
    db.prepare('DELETE FROM task_criteria WHERE task_id = ?').run(taskId);

    const insert = db.prepare(
      'INSERT INTO task_criteria (task_id, criteria_order, text) VALUES (?, ?, ?)'
    );

    for (const c of criteria) {
      insert.run(taskId, c.criteria_order, c.text);
    }

  })();

  res.json({ success: true });
});


// =========================================================================
// MEDIA CRUD
// =========================================================================

// POST /api/admin/content/tasks/:taskId/media — Medium hinzufügen
router.post('/tasks/:taskId/media', validateBody(z.object({ media_type: z.enum(['image', 'gif', 'video']), url: mediaUrl.refine(value => value.length > 0), caption: z.string().max(500).nullish() })), (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { media_type, url, caption } = req.body;

  const result = db.prepare(
    'INSERT INTO task_media (task_id, media_type, url, caption) VALUES (?, ?, ?, ?)'
  ).run(taskId, media_type, url, caption || null);

  res.json({ id: result.lastInsertRowid });
});

// DELETE /api/admin/content/media/:id — Medium löschen
router.delete('/media/:id', (req, res) => {
  const mediaId = parseInt(req.params.id);
  db.prepare('DELETE FROM task_media WHERE id = ?').run(mediaId);
  res.json({ success: true });
});


// =========================================================================
// FILE UPLOAD
// =========================================================================

// Admin-only, bounded upload of passive media. Active content such as HTML/SVG is rejected.
router.post('/upload-simple', express.raw({ type: 'application/octet-stream', limit: '20mb' }), (req, res) => {
  const filename = req.query.filename;
  const folder = req.query.folder ?? 'uploads';
  if (typeof filename !== 'string' || typeof folder !== 'string' || !/^[A-Za-z0-9_. ()-]{1,120}$/.test(filename)
      || filename.startsWith('.') || !['uploads', 'Videos', 'Bilder'].includes(String(folder))) {
    res.status(400).json({ error: 'Ungültiger Dateiname oder Ordner.' });
    return;
  }
  const extension = path.extname(filename).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm'].includes(extension)) {
    res.status(415).json({ error: 'Erlaubt sind PNG, JPG, GIF, WebP, MP4 und WebM.' });
    return;
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'Leere Datei oder falscher Content-Type.' });
    return;
  }
  const safeName = randomUUID() + extension;
  const targetDir = path.join(config.mediaRoot, String(folder));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, safeName), req.body, { flag: 'wx' });
  res.status(201).json({ success: true, filename: safeName,
    url: '/uploads/' + (folder === 'uploads' ? '' : folder + '/') + safeName,
    size: req.body.length });
});

// GET /api/admin/content/files — Alle verfügbaren Dateien auflisten
router.get('/files', (_req, res) => {
  const baseDir = config.mediaRoot;

  const files: { name: string; url: string; folder: string; size: number }[] = [];

  const folders = ['Videos', 'Bilder', 'uploads'];

  for (const folder of folders) {
    const dir = path.join(baseDir, folder);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const stat = fs.statSync(path.join(dir, entry));
      if (!stat.isFile()) continue;

      const url = folder === 'uploads'
        ? `/uploads/${entry}`
        : `/uploads/${folder}/${entry}`;

      files.push({
        name: entry,
        url,
        folder,
        size: stat.size
      });
    }
  }

  res.json(files);
});


// =========================================================================
// FORTSCHRITTS-ÜBERSICHT
// =========================================================================

// GET /api/admin/content/progress-overview — Gesamtübersicht aller Gruppen/Kinder
router.get('/progress-overview', (_req, res) => {
  // Get all groups with their members and progress
  const groups = db.prepare(`
    SELECT g.id, g.name, g.code,
      (SELECT COUNT(*) FROM users u WHERE u.group_id = g.id AND u.role = 'kind') as member_count
    FROM groups g
    ORDER BY g.name
  `).all() as any[];

  const chapters = db.prepare(`
    SELECT c.id, c.title, c.chapter_order,
      (SELECT COUNT(*) FROM tasks t WHERE t.chapter_id = c.id) as task_count
    FROM chapters c
    ORDER BY c.chapter_order
  `).all() as any[];

  const result = groups.map(group => {
    const members = db.prepare(`
      SELECT u.id, u.username FROM users u
      WHERE u.group_id = ? AND u.role = 'kind'
      ORDER BY u.username
    `).all(group.id) as any[];

    const membersWithProgress = members.map(member => {
      const completedByChapter = chapters.map(ch => {
        const completed = db.prepare(`
          SELECT COUNT(*) as count FROM progress p
          JOIN tasks t ON t.id = p.task_id
          WHERE p.user_id = ? AND t.chapter_id = ? AND p.completed = 1
        `).get(member.id, ch.id) as any;

        return {
          chapter_id: ch.id,
          chapter_title: ch.title,
          completed: completed.count,
          total: ch.task_count
        };
      });

      const totalCompleted = completedByChapter.reduce((sum, c) => sum + c.completed, 0);
      const totalTasks = completedByChapter.reduce((sum, c) => sum + c.total, 0);

      return {
        ...member,
        progress_by_chapter: completedByChapter,
        total_completed: totalCompleted,
        total_tasks: totalTasks,
        percent: totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
      };
    });

    return {
      ...group,
      members: membersWithProgress
    };
  });

  res.json({ groups: result, chapters });
});

function csvCell(value: string): string {
  const literal = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + literal.replace(/"/g, '""') + '"';
}

// GET /api/admin/content/progress-csv — Fortschritt als CSV
router.get('/progress-csv', (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, g.name as group_name
    FROM users u
    LEFT JOIN groups g ON g.id = u.group_id
    WHERE u.role = 'kind'
    ORDER BY g.name, u.username
  `).all() as any[];

  const tasks = db.prepare(`
    SELECT t.id, t.title, c.title as chapter_title
    FROM tasks t
    JOIN chapters c ON c.id = t.chapter_id
    ORDER BY c.chapter_order, t.task_order
  `).all() as any[];

  // CSV Header
  let csv = 'Gruppe,Username';
  for (const task of tasks) {
    csv += `,${csvCell(`${task.chapter_title}: ${task.title}`)}`;
  }
  csv += ',Gesamt,Prozent\n';

  // CSV Rows
  for (const user of users) {
    csv += `${csvCell(user.group_name || 'Keine Gruppe')},${csvCell(user.username)}`;

    let completed = 0;
    for (const task of tasks) {
      const p = db.prepare(
        'SELECT completed FROM progress WHERE user_id = ? AND task_id = ?'
      ).get(user.id, task.id) as any;
      const done = p?.completed === 1 ? 1 : 0;
      csv += `,${done}`;
      completed += done;
    }

    const percent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    csv += `,${completed}/${tasks.length},${percent}%\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fortschritt.csv"');
  res.send('\uFEFF' + csv); // BOM for Excel UTF-8
});


export default router;
