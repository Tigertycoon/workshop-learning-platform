import { validateIds, validateBody } from '../validation';
import { z } from 'zod';
import { Router } from 'express';
import db from '../db';
import { authMiddleware } from '../auth';

const router = Router();
validateIds(router);
router.use(authMiddleware);

// So viele in den letzten 7 Tagen genehmigte Aktivitäten schalten die Spiele frei.
const REQUIRED_APPROVED = 1;

function computeGameAccess(userId: number, role: string) {
  if (role === 'admin') {
    return { unlocked: true, reason: 'admin', approvedThisWeek: 0, required: REQUIRED_APPROVED };
  }
  const manual = db.prepare('SELECT 1 FROM game_unlocks WHERE user_id = ?').get(userId);
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM submissions
     WHERE user_id = ? AND status = 'approved' AND reviewed_at >= datetime('now', '-7 days')`
  ).get(userId) as any;
  const approvedThisWeek = (row?.n as number) ?? 0;
  const unlocked = !!manual || approvedThisWeek >= REQUIRED_APPROVED;
  return {
    unlocked,
    reason: manual ? 'lead' : unlocked ? 'activities' : 'locked',
    approvedThisWeek,
    required: REQUIRED_APPROVED,
  };
}

// GET /api/activities — aktive Aktivitäten + mein letzter Status
router.get('/', (req, res) => {
  const userId = req.user!.id;
  const activities = db.prepare(
    `SELECT id, title, description, kind, icon, sort_order
     FROM activities WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
  ).all() as any[];

  const withStatus = activities.map((a) => {
    const sub = db.prepare(
      `SELECT id, status FROM submissions
       WHERE user_id = ? AND activity_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(userId, a.id) as any;
    return { ...a, my_status: sub?.status ?? null, my_submission_id: sub?.id ?? null };
  });

  res.json(withStatus);
});

// GET /api/activities/access — Spiele-Freischaltung für das aktuelle Kind
router.get('/access', (req, res) => {
  res.json(computeGameAccess(req.user!.id, req.user!.role));
});

// POST /api/activities/:id/submit — Aktivität einreichen
router.post('/:id/submit', validateBody(z.object({
  note: z.string().trim().max(4000).optional(),
  payload_json: z.string().max(16000).refine(value => { try { JSON.parse(value); return true; } catch { return false; } }).optional(),
  file_url: z.string().max(2048).refine(value => /^https?:\/\//.test(value) || /^\/uploads\//.test(value)).optional(),
}).refine(data => Boolean(data.note || data.file_url || data.payload_json), 'Eine Einreichung darf nicht leer sein.')), (req, res) => {
  const activityId = parseInt(req.params.id);
  const { note, payload_json, file_url } = req.body;

  const activity = db.prepare('SELECT id FROM activities WHERE id = ? AND is_active = 1').get(activityId);
  if (!activity) {
    res.status(404).json({ error: 'Aktivität nicht gefunden' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO submissions (user_id, activity_id, note, payload_json, file_url) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user!.id, activityId, note ?? null, payload_json ?? null, file_url ?? null);

  res.json({ id: result.lastInsertRowid, status: 'pending' });
});

// GET /api/activities/:id — Detail + meine Einreichungen
router.get('/:id', (req, res) => {
  const activityId = parseInt(req.params.id);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as any;
  if (!activity) {
    res.status(404).json({ error: 'Aktivität nicht gefunden' });
    return;
  }
  const submissions = db.prepare(
    `SELECT id, status, note, feedback, created_at, reviewed_at
     FROM submissions WHERE user_id = ? AND activity_id = ? ORDER BY created_at DESC`
  ).all(req.user!.id, activityId);

  res.json({ ...activity, submissions });
});

export default router;
