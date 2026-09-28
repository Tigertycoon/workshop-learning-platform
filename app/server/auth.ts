import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from './db';
import { config } from './config';

const JWT_SECRET = config.jwtSecret;

export interface AuthUser {
  id: number;
  username: string;
  role: 'kind' | 'admin';
  group_id: number | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, group_id: user.group_id },
    JWT_SECRET,
    { expiresIn: '8h', algorithm: 'HS256' }
  );
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht eingeloggt' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0) {
      res.status(401).json({ error: 'Ungültiger Token' });
      return;
    }

    // Refresh user data from DB (in case group changed etc.)
    const user = db.prepare(
      'SELECT id, username, role, group_id FROM users WHERE id = ?'
    ).get(decoded.id) as AuthUser | undefined;

    if (!user) {
      res.status(401).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Nur für Workshop-Leiter' });
    return;
  }
  next();
}
