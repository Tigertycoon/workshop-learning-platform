import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import ProgressBar from '../components/ProgressBar';

interface Task {
  id: number;
  title: string;
  description: string;
  task_order: number;
  effective_status: string;
  completed: boolean;
}

export default function ChapterPage() {
  const { id } = useParams();
  const [chapter, setChapter] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getChapterTasks(parseInt(id))
      .then(data => {
        setChapter(data.chapter);
        setTasks(data.tasks);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggle = async (taskId: number, currentlyCompleted: boolean) => {
    const newState = !currentlyCompleted;
    await api.toggleTask(taskId, newState);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: newState } : t
    ));
  };

  if (loading) return <div className="p-8 text-center">Laden...</div>;
  if (!chapter) return <div className="p-8 text-center">Kapitel nicht gefunden.</div>;

  const isInspiration = chapter.type === 'inspiration';
  const pflichtTasks = tasks.filter(t => t.effective_status === 'pflicht');
  const extraTasks = tasks.filter(t => t.effective_status === 'extra');
  const doneCount = pflichtTasks.filter(t => t.completed).length;
  const progress = pflichtTasks.length > 0 ? doneCount / pflichtTasks.length : 0;

  // Inspiration chapter — gallery layout, no checkboxes
  if (isInspiration) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Link to="/workshop" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Zurück zur Übersicht
        </Link>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6 mb-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{chapter.icon || '🎨'}</span>
            <div>
              <h1 className="text-2xl font-bold">{chapter.title}</h1>
              <p className="text-gray-500">{chapter.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tasks.map(task => (
            <Link
              key={task.id}
              to={`/task/${task.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all p-4"
            >
              <h3 className="font-medium text-lg">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to="/workshop" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Zurück zur Übersicht
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{chapter.icon || '📖'}</span>
          <div>
            <h1 className="text-2xl font-bold">{chapter.title}</h1>
            <p className="text-gray-500">{chapter.description}</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={progress} />
          <span className="text-sm text-gray-500">{doneCount} / {pflichtTasks.length} Pflicht-Aufgaben erledigt</span>
        </div>
        {progress === 1 && (
          <div className="mt-3 bg-green-50 text-green-700 rounded p-3 text-sm font-medium">
            Kapitel abgeschlossen!
          </div>
        )}
      </div>

      {/* Pflicht tasks */}
      <div className="space-y-2 mb-6">
        {pflichtTasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={handleToggle} />
        ))}
      </div>

      {/* Extra tasks */}
      {extraTasks.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <span className="text-yellow-500">⭐</span> Bonus-Aufgaben
          </h2>
          <div className="space-y-2">
            {extraTasks.map(task => (
              <TaskRow key={task.id} task={task} onToggle={handleToggle} isExtra />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, isExtra = false }: {
  task: Task;
  onToggle: (id: number, completed: boolean) => void;
  isExtra?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 flex items-start gap-3 ${
      isExtra ? 'border-yellow-200' : 'border-gray-200'
    } ${task.completed ? 'opacity-70' : ''}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id, task.completed)}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <div className="flex-1">
        <Link
          to={`/task/${task.id}`}
          className={`font-medium hover:text-blue-600 ${task.completed ? 'line-through text-gray-400' : ''}`}
        >
          {task.title}
        </Link>
        {task.description && (
          <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
        )}
      </div>
      {task.completed && <span className="text-green-500">✓</span>}
    </div>
  );
}
