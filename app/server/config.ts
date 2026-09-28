import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const jwtSecret = env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32 || jwtSecret.includes('change-in-production')) {
    throw new Error('JWT_SECRET must be a generated secret of at least 32 characters. Run npm run setup.');
  }
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return {
    jwtSecret,
    port,
    host: env.HOST || '127.0.0.1',
    databasePath: env.DATABASE_PATH
      ? path.resolve(__dirname, '..', env.DATABASE_PATH)
      : path.resolve(__dirname, 'workshop.db'),
    mediaRoot: path.resolve(__dirname, '..', env.MEDIA_ROOT || '.'),
  };
}

export const config = readConfig();
