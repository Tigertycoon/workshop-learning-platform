import { validateIds, validateBody } from '../validation';
import { z } from 'zod';
import { Router } from 'express';
import db from '../db';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
validateIds(router);
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/review/submissions?status=pending — Review-Queue
router.get('/submissions', (req, res) => {
  const status = (req.query.status as string) || 'pending';
  const rows = db.prepare(
    `SELECT s.id, s.status, s.note, s.payload_json, s.file_url, s.feedback,
            s.created_at, s.reviewed_at, s.user_id, s.activity_id,
            u.username, a.title AS activity_title, a.kind AS activity_kind
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     JOIN activities a ON a.id = s.activity_id
     WHERE s.status = ?
     ORDER BY s.created_at ASC`
  ).all(status);
  res.json(rows);
});

// POST /api/admin/review/submissions/:id — bewerten (approved | rejected) + Feedback
router.post('/submissions/:id', validateBody(z.object({
  status: z.enum(['approved', 'rejected']), feedback: z.string().max(4000).optional(),
})), (req, res) => {
  const id = parseInt(req.params.id);
  const { status, feedback } = req.body;

  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'Status muss approved oder rejected sein' });
    return;
  }

  const sub = db.prepare('SELECT id FROM submissions WHERE id = ?').get(id);
  if (!sub) {
    res.status(404).json({ error: 'Einreichung nicht gefunden' });
    return;
  }

  db.prepare(
    `UPDATE submissions SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = datetime('now')
     WHERE id = ?`
  ).run(status, feedback ?? null, req.user!.id, id);

  res.json({ success: true });
});

// POST /api/admin/review/unlock/:userId — Spiele für ein Kind manuell freischalten
router.post('/unlock/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  db.prepare(
    `INSERT OR REPLACE INTO game_unlocks (user_id, set_by, unlocked_at) VALUES (?, ?, datetime('now'))`
  ).run(userId, req.user!.id);
  res.json({ success: true, unlocked: true });
});

// DELETE /api/admin/review/unlock/:userId — manuelle Freischaltung zurücknehmen
router.delete('/unlock/:userId', (req, res) => {
  db.prepare('DELETE FROM game_unlocks WHERE user_id = ?').run(parseInt(req.params.userId));
  res.json({ success: true, unlocked: false });
});

export default router;
