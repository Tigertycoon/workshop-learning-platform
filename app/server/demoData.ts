import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { password } from './validation';

/** Populate only an empty database. Never replace accounts, progress or submissions. */
export function seedDemo(db: Database.Database, adminPassword: string, studentPassword: string): boolean {
  password.parse(adminPassword);
  password.parse(studentPassword);
  const occupied = ['users', 'groups', 'chapters', 'activities', 'games'].some(table =>
    (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count > 0);
  if (occupied) return false;

  db.transaction(() => {
    const group = db.prepare('INSERT INTO groups (name, code) VALUES (?, ?)')
      .run('Demo-Workshop', 'DEMO01').lastInsertRowid;
    const user = db.prepare('INSERT INTO users (username, pin_hash, role, group_id) VALUES (?, ?, ?, ?)');
    user.run('demo-admin', bcrypt.hashSync(adminPassword, 10), 'admin', null);
    user.run('demo-learner', bcrypt.hashSync(studentPassword, 10), 'kind', group);
    const chapter = db.prepare('INSERT INTO chapters (title, description, chapter_order, type, icon) VALUES (?, ?, ?, ?, ?)');
    const task = db.prepare('INSERT INTO tasks (chapter_id, title, description, task_order) VALUES (?, ?, ?, ?)');
    const step = db.prepare('INSERT INTO task_steps (task_id, step_order, text) VALUES (?, ?, ?)');
    const criterion = db.prepare('INSERT INTO task_criteria (task_id, text) VALUES (?, ?)');
    const chapters = [
      ['Deine erste Szene', 'Orientiere dich im Editor und gestalte einen kleinen Raum.', '🧱',
        ['Den Editor erkunden', 'Einen Raum aus Grundformen bauen']],
      ['Bewegung & Interaktion', 'Verbinde Eingaben mit einem sichtbaren Ergebnis.', '🕹️',
        ['Ein Objekt bewegen', 'Eine Interaktion hinzufügen']],
      ['Dein kleines Spiel', 'Baue einen kurzen, spielbaren Ablauf und hole Feedback ein.', '✨',
        ['Ein klares Spielziel formulieren', 'Testen und verbessern']],
    ] as const;
    chapters.forEach(([title, description, icon, tasks], order) => {
      const id = chapter.run(title, description, order, 'frei', icon).lastInsertRowid;
      tasks.forEach((title, index) => {
        const taskId = task.run(id, title, 'Setze die Idee in deiner eigenen Unity-Szene um.', index).lastInsertRowid;
        step.run(taskId, 0, 'Überlege dir, welches Ergebnis du erreichen möchtest.');
        step.run(taskId, 1, 'Probiere deine Lösung im Play-Modus aus und beschreibe, was du beobachtest.');
        criterion.run(taskId, 'Ich kann meine Lösung vorführen und erklären.');
      });
    });
    const activity = db.prepare('INSERT INTO activities (title, description, kind, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
    activity.run('Deine Spielidee', 'Beschreibe Ziel, Steuerung und die wichtigste Entscheidung in deinem Spiel.', 'generic', '💡', 0);
    activity.run('Was ist ein Game Loop?', 'Erkläre den wiederkehrenden Ablauf eines Spiels an einem eigenen Beispiel.', 'intro', '🔁', 1);
    activity.run('Eine Szene beobachten', 'Nenne drei Details, die eine Spielszene gut lesbar machen.', 'generic', '🔍', 2);
  })();
  return true;
}
