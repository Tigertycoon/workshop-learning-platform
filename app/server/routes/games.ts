import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// GET /api/games — Alle aktiven Spiele, sortiert nach sort_order
router.get('/', (req: Request, res: Response) => {
  try {
    const games = db
      .prepare(
        `SELECT id, title, slug, description, thumbnail_url, tags, sort_order
         FROM games
         WHERE is_active = 1
         ORDER BY sort_order ASC, title ASC`
      )
      .all();

    const gamesWithTags = games.map((game: any) => ({
      ...game,
      tags: game.tags ? game.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    }));

    res.json(gamesWithTags);
  } catch (err) {
    console.error('Fehler beim Laden der Spiele:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/games/:slug — Einzelnes Spiel
router.get('/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const game = db
      .prepare(
        `SELECT id, title, slug, description, thumbnail_url, build_path, tags, sort_order
         FROM games
         WHERE slug = ? AND is_active = 1`
      )
      .get(slug) as any;

    if (!game) {
      return res.status(404).json({ error: 'Spiel nicht gefunden' });
    }

    res.json({
      ...game,
      tags: game.tags ? game.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    });
  } catch (err) {
    console.error('Fehler beim Laden des Spiels:', err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
