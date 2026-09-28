import type { RequestHandler, Router } from 'express';
import { z } from 'zod';

export const username = z.string().trim().min(2).max(40)
  .regex(/^[\p{L}\p{N}_.-]+$/u, 'Nur Buchstaben, Zahlen, Punkt, Bindestrich und Unterstrich.');
export const password = z.string().min(8).max(72)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Passwort ist zu lang.');
export const groupCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/);
export const positiveId = z.number().int().positive();
export const taskStatus = z.enum(['pflicht', 'extra', 'versteckt', 'default']);

export function validateBody(schema: z.ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Bitte prüfe deine Eingaben.', fields: result.error.issues.map(issue => issue.path.join('.')) });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateIds(router: Router) {
  for (const key of ['id', 'userId', 'groupId', 'taskId']) {
    router.param(key, (_req, res, next, value: string) => {
      if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
        res.status(400).json({ error: 'Ungültige ID.' });
        return;
      }
      next();
    });
  }
}
