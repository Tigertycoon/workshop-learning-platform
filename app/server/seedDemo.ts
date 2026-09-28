import db from './db';
import { seedDemo } from './demoData';

try {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo data is disabled in production.');
  const created = seedDemo(db, process.env.DEMO_ADMIN_PASSWORD ?? '', process.env.DEMO_STUDENT_PASSWORD ?? '');
  console.log(created
    ? 'Created synthetic demo data. Accounts: demo-admin / demo-learner. Passwords: app/.env.'
    : 'Database already contains data; nothing was changed. Use a separate DATABASE_PATH for a fresh demo.');
} finally {
  db.close();
}
