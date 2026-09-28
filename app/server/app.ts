import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import chapterRoutes from './routes/chapterRoutes';
import progressRoutes from './routes/progressRoutes';
import adminRoutes from './routes/adminRoutes';
import contentRoutes from './routes/contentRoutes';
import gamesRoutes from './routes/games';
import activitiesRoutes from './routes/activities';
import leadRoutes from './routes/leadRoutes';

export const app = express();
app.disable('x-powered-by');
// Unity WebGL builds have their own script requirements. Do not claim a strict CSP.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/content', contentRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/admin/review', leadRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API-Endpunkt nicht gefunden.' }));

// Locally supplied, non-confidential workshop media. Never serve the DB or .env.
for (const folder of ['Videos', 'Bilder']) {
  app.use(`/uploads/${folder}`, express.static(path.join(config.mediaRoot, folder), { dotfiles: 'deny' }));
}
app.use('/uploads/Gute_Beispiele', express.static(path.join(config.mediaRoot, 'Bilder', 'Gute Beispiele')));
app.use('/uploads', express.static(path.join(config.mediaRoot, 'uploads'), { dotfiles: 'deny' }));
app.use('/screenshots', express.static(path.join(config.mediaRoot, 'Screenshots')));

// Game access in the UI is a learning incentive, not DRM for these public assets.
app.use('/games', express.static(path.join(config.mediaRoot, 'games'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.gz') || filePath.endsWith('.br')) {
      res.setHeader('Content-Encoding', filePath.endsWith('.gz') ? 'gzip' : 'br');
      res.setHeader('Content-Type', /\.js\.(gz|br)$/.test(filePath)
        ? 'application/javascript' : /\.wasm\.(gz|br)$/.test(filePath)
          ? 'application/wasm' : 'application/octet-stream');
    }
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
  },
}));
app.use(['/uploads', '/screenshots', '/games'], (_req, res) => res.sendStatus(404));

const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  const index = path.join(clientDist, 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(503).json({ error: 'Frontend fehlt. Bitte npm run build ausführen oder npm run dev verwenden.' });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = error.status === 413 ? 413 : error.status === 400 ? 400
    : typeof error.code === 'string' && error.code.startsWith('SQLITE_CONSTRAINT') ? 409 : 500;
  if (status === 500) console.error('[Server] Request failed:', error);
  res.status(status).json({ error: status === 413 ? 'Datei oder Anfrage zu groß.'
    : status === 400 ? 'Ungültige Anfrage.'
      : status === 409 ? 'Die Änderung steht im Konflikt mit vorhandenen Daten.' : 'Interner Serverfehler.' });
};
app.use(errorHandler);
