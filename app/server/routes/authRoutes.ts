import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { generateToken, authMiddleware, AuthUser } from '../auth';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { validateBody, username, password, groupCode } from '../validation';

const router = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' },
});
const registrationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 20,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Zu viele Registrierungen. Bitte später erneut versuchen.' },
});

// POST /api/auth/register
router.post('/register', registrationLimit, validateBody(z.object({
  username, pin: password, groupCode: groupCode.optional(),
})), (req, res) => {
  const { username, pin, groupCode } = req.body;

  if (!username || !pin) {
    res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    return;
  }

  // Check if username already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ error: 'Dieser Benutzername ist schon vergeben' });
    return;
  }

  // Validate group code if provided
  let groupId: number | null = null;
  if (groupCode) {
    const group = db.prepare('SELECT id FROM groups WHERE code = ?').get(groupCode) as any;
    if (!group) {
      res.status(400).json({ error: 'Ungültiger Gruppen-Code' });
      return;
    }
    groupId = group.id;
  }

  const pinHash = bcrypt.hashSync(pin, 10);

  const result = db.prepare(
    'INSERT INTO users (username, pin_hash, role, group_id) VALUES (?, ?, ?, ?)'
  ).run(username, pinHash, 'kind', groupId);

  const user: AuthUser = {
    id: result.lastInsertRowid as number,
    username,
    role: 'kind',
    group_id: groupId
  };

  const token = generateToken(user);
  res.json({ token, user });
});

// POST /api/auth/login
router.post('/login', loginLimit, validateBody(z.object({
  username: z.string().trim().min(1).max(40), pin: z.string().min(1).max(72),
})), (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    return;
  }

  const user = db.prepare(
    'SELECT id, username, pin_hash, role, group_id FROM users WHERE username = ?'
  ).get(username) as any;

  if (!user) {
    res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    return;
  }

  if (!bcrypt.compareSync(pin, user.pin_hash)) {
    res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
    return;
  }

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    group_id: user.group_id
  };

  const token = generateToken(authUser);
  res.json({ token, user: authUser });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/join-group — Kind tritt per Workshop-Code einer Gruppe bei
router.post('/join-group', authMiddleware, validateBody(z.object({ code: groupCode })), (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Workshop-Code erforderlich' });
    return;
  }

  const group = db.prepare('SELECT id FROM groups WHERE code = ?').get(code) as any;
  if (!group) {
    res.status(400).json({ error: 'Ungültiger Workshop-Code' });
    return;
  }

  db.prepare('UPDATE users SET group_id = ? WHERE id = ?').run(group.id, req.user!.id);

  const user: AuthUser = {
    id: req.user!.id,
    username: req.user!.username,
    role: req.user!.role,
    group_id: group.id,
  };
  const token = generateToken(user);
  res.json({ token, user });
});

export default router;
