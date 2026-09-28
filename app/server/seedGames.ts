import fs from 'fs';
import path from 'path';
import db from './db';
import { config } from './config';

const GAMES_DIR       = path.join(config.mediaRoot, 'games');
const SCREENSHOTS_DIR = path.join(config.mediaRoot, 'Screenshots');

// ─── Manuelle Overrides ───────────────────────────────────────────────────────
// Hier kannst du für einzelne Spiele (Slug = Ordnername) Felder überschreiben
// oder ein Spiel mit skip: true aus der DB ausschließen.

interface Override {
  skip?:         boolean;   // true = Spiel wird nicht angezeigt
  title?:        string;
  tags?:         string;    // kommagetrennt, z.B. 'singleplayer,multiplayer,action'
  description?:  string;
}

const OVERRIDES: Record<string, Override> = {};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function findScreenshot(slug: string, screenshots: string[]): string | null {
  const normSlug = normalize(slug);
  const exact = screenshots.find((s) => normalize(path.parse(s).name) === normSlug);
  if (exact) return exact;
  const partial = screenshots.find((s) => {
    const normFile = normalize(path.parse(s).name);
    return normSlug.includes(normFile) || normFile.includes(normSlug);
  });
  return partial ?? null;
}

function guessTags(name: string): string {
  const n = name.toLowerCase();
  const tags: string[] = [];

  if (/multi|multiplayer|coop|co-op|versus|pvp|rts/.test(n)) tags.push('multiplayer');
  else tags.push('singleplayer');

  if      (/rts|strategy|strateg|turn.based|tactic/.test(n))           tags.push('strategie');
  else if (/puzzle|maze|labyrinth|match/.test(n))                       tags.push('puzzle');
  else if (/platform|jump|runner|run/.test(n))                          tags.push('plattformer');
  else if (/racing|race|kart|drive|car/.test(n))                        tags.push('racing');
  else if (/horror|zombie|dead|undead|survive|survival/.test(n))        tags.push('horror');
  else if (/space|galactic|star|cosmos|rocket|alien/.test(n))           tags.push('space');
  else if (/kitchen|cook|chef|food|restaurant/.test(n))                 tags.push('casual');
  else if (/combat|battle|fight|mech|robot|tank|shoot|war|boss/.test(n)) tags.push('action');
  else                                                                   tags.push('action');

  return tags.join(',');
}

// ─── Hauptlogik ──────────────────────────────────────────────────────────────

console.log(`🔍 Scanne games/-Ordner...\n`);

if (!fs.existsSync(GAMES_DIR)) {
  console.error('❌ games/-Ordner nicht gefunden!');
  process.exit(1);
}

const screenshots: string[] = fs.existsSync(SCREENSHOTS_DIR)
  ? fs.readdirSync(SCREENSHOTS_DIR).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
  : [];

console.log(`📸 ${screenshots.length} Screenshot(s) gefunden: ${screenshots.join(', ') || '—'}\n`);

const insertGame = db.prepare(`
  INSERT OR REPLACE INTO games (title, slug, description, thumbnail_url, build_path, tags, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const deleteGame = db.prepare(`DELETE FROM games WHERE slug = ?`);

const gameFolders = fs
  .readdirSync(GAMES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((name) => fs.existsSync(path.join(GAMES_DIR, name, 'index.html')));

if (gameFolders.length === 0) {
  console.warn('⚠️  Keine Spiele mit index.html gefunden.');
  process.exit(0);
}

console.log(`✅ ${gameFolders.length} Spiel(e) gefunden:\n`);

let sortIndex = 0;
for (const folderName of gameFolders) {
  const override = OVERRIDES[folderName] ?? {};

  // Spiel überspringen
  if (override.skip) {
    deleteGame.run(folderName);
    console.log(`  ⛔ "${folderName}" — übersprungen (skip: true)`);
    continue;
  }

  const slug         = folderName;
  const title        = override.title       ?? slugToTitle(folderName);
  const tags         = override.tags        ?? guessTags(folderName);
  const description  = override.description ?? null;

  const screenshot   = findScreenshot(slug, screenshots);
  const thumbnailUrl = screenshot ? `/screenshots/${encodeURIComponent(screenshot)}` : null;

  insertGame.run(title, slug, description, thumbnailUrl, `games/${folderName}`, tags, sortIndex++);

  const screenshotInfo = screenshot ? `📸 ${screenshot}` : '🖼️  kein Screenshot';
  console.log(`  ✅ "${title}" [${tags}] — ${screenshotInfo}`);
}

console.log('\n✨ Fertig!\n');
