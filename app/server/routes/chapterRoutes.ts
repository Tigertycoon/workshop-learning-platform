import { validateIds } from '../validation';
import { Router } from 'express';
import db from '../db';
import { authMiddleware } from '../auth';

const router = Router();
validateIds(router);

// GET /api/chapters — Alle Kapitel mit Freischalt-Status
router.get('/', authMiddleware, (req, res) => {
  const user = req.user!;

  const chapters = db.prepare(`
    SELECT id, title, description, chapter_order, type, icon
    FROM chapters ORDER BY chapter_order
  `).all() as any[];

  // Get all completed tasks for this user
  const completedTasks = db.prepare(`
    SELECT task_id FROM progress WHERE user_id = ? AND completed = 1
  `).all(user.id) as any[];
  const completedSet = new Set(completedTasks.map((t: any) => t.task_id));

  // Get prerequisites
  const prerequisites = db.prepare(`
    SELECT chapter_id, prerequisite_id, is_required FROM chapter_prerequisites
  `).all() as any[];

  // Calculate progress and unlock status for each chapter
  const result = chapters.map(chapter => {
    // Get tasks for this chapter (considering group/user overrides)
    const tasks = getVisibleTasks(chapter.id, user.group_id, user.id);
    const pflichtTasks = tasks.filter((t: any) => t.effective_status === 'pflicht');
    const completedPflicht = pflichtTasks.filter((t: any) => completedSet.has(t.id));

    // Check if chapter is unlocked
    const chapterPrereqs = prerequisites.filter((p: any) => p.chapter_id === chapter.id && p.is_required);
    let unlocked = true;

    for (const prereq of chapterPrereqs) {
      const prereqTasks = getVisibleTasks(prereq.prerequisite_id, user.group_id, user.id);
      const prereqPflicht = prereqTasks.filter((t: any) => t.effective_status === 'pflicht');
      const allDone = prereqPflicht.every((t: any) => completedSet.has(t.id));
      if (!allDone) {
        unlocked = false;
        break;
      }
    }

    return {
      ...chapter,
      unlocked,
      totalTasks: pflichtTasks.length,
      completedTasks: completedPflicht.length,
      progress: pflichtTasks.length > 0 ? completedPflicht.length / pflichtTasks.length : 0
    };
  });

  res.json(result);
});

// GET /api/chapters/:id/tasks — Aufgaben eines Kapitels
router.get('/:id/tasks', authMiddleware, (req, res) => {
  const user = req.user!;
  const chapterId = parseInt(req.params.id);

  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
  if (!chapter) {
    res.status(404).json({ error: 'Kapitel nicht gefunden' });
    return;
  }

  const tasks = getVisibleTasks(chapterId, user.group_id, user.id);

  // Get progress for each task
  const progress = db.prepare(`
    SELECT task_id, completed, completed_at FROM progress WHERE user_id = ?
  `).all(user.id) as any[];
  const progressMap = new Map(progress.map((p: any) => [p.task_id, p]));

  const result = tasks.map((task: any) => {
    const p = progressMap.get(task.id);
    return {
      ...task,
      completed: p?.completed === 1,
      completed_at: p?.completed_at
    };
  });

  res.json({ chapter, tasks: result });
});

// Helper: Get visible tasks with effective status for a user
function getVisibleTasks(chapterId: number, groupId: number | null, userId: number) {
  const tasks = db.prepare(`
    SELECT id, chapter_id, title, description, task_order, default_status
    FROM tasks WHERE chapter_id = ? ORDER BY task_order
  `).all(chapterId) as any[];

  // Get group overrides
  const groupOverrides = groupId ? db.prepare(`
    SELECT task_id, status FROM group_task_overrides WHERE group_id = ?
  `).all(groupId) as any[] : [];
  const groupMap = new Map(groupOverrides.map((o: any) => [o.task_id, o.status]));

  // Get user overrides (highest priority)
  const userOverrides = db.prepare(`
    SELECT task_id, status FROM user_task_overrides WHERE user_id = ?
  `).all(userId) as any[];
  const userMap = new Map(userOverrides.map((o: any) => [o.task_id, o.status]));

  return tasks
    .map(task => {
      // Priority: user override > group override > default
      const effectiveStatus = userMap.get(task.id) || groupMap.get(task.id) || task.default_status;
      return { ...task, effective_status: effectiveStatus };
    })
    .filter(task => task.effective_status !== 'versteckt');
}

export default router;
