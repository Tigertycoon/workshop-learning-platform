import { validateIds, validateBody } from '../validation';
import { z } from 'zod';
import { Router } from 'express';
import db from '../db';
import { authMiddleware } from '../auth';

const router = Router();
validateIds(router);

// GET /api/progress — Gesamtfortschritt des Users
router.get('/', authMiddleware, (req, res) => {
  const user = req.user!;

  const progress = db.prepare(`
    SELECT p.task_id, p.completed, p.completed_at, t.chapter_id
    FROM progress p
    JOIN tasks t ON t.id = p.task_id
    WHERE p.user_id = ? AND p.completed = 1
  `).all(user.id) as any[];

  res.json(progress);
});

// POST /api/progress/:taskId — Aufgabe abhaken/enthaken
router.post('/:taskId', authMiddleware, validateBody(z.object({ completed: z.boolean() })), (req, res) => {
  const user = req.user!;
  const taskId = parseInt(req.params.taskId);
  const { completed } = req.body;

  // Verify task exists
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    return;
  }

  if (completed) {
    db.prepare(`
      INSERT INTO progress (user_id, task_id, completed, completed_at)
      VALUES (?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, task_id)
      DO UPDATE SET completed = 1, completed_at = datetime('now')
    `).run(user.id, taskId);
  } else {
    db.prepare(`
      INSERT INTO progress (user_id, task_id, completed, completed_at)
      VALUES (?, ?, 0, NULL)
      ON CONFLICT(user_id, task_id)
      DO UPDATE SET completed = 0, completed_at = NULL
    `).run(user.id, taskId);
  }

  res.json({ success: true, taskId, completed: !!completed });
});

// GET /api/tasks/:id — Einzelne Aufgabe mit Details
router.get('/tasks/:id', authMiddleware, (req, res) => {
  const taskId = parseInt(req.params.id);
  const user = req.user!;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    return;
  }

  const steps = db.prepare(
    'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order'
  ).all(taskId);

  const criteria = db.prepare(
    'SELECT * FROM task_criteria WHERE task_id = ? ORDER BY criteria_order'
  ).all(taskId);

  const media = db.prepare(
    'SELECT * FROM task_media WHERE task_id = ?'
  ).all(taskId);

  const progress = db.prepare(
    'SELECT completed, completed_at FROM progress WHERE user_id = ? AND task_id = ?'
  ).get(user.id, taskId) as any;

  res.json({
    ...task,
    steps,
    criteria,
    media,
    completed: progress?.completed === 1,
    completed_at: progress?.completed_at
  });
});

export default router;
