import { app } from './app';
import { config } from './config';
import db from './db';

const server = app.listen(config.port, config.host, () => {
  console.log('[Workshop] http://' + config.host + ':' + config.port);
});
server.on('error', error => {
  console.error('[Workshop] Could not start:', error.message);
  db.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => { db.close(); }));
}
