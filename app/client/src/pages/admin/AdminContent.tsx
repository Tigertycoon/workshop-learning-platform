import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface Chapter {
  id: number;
  title: string;
  description: string;
  chapter_order: number;
  type: string;
  icon: string;
  task_count: number;
}

interface Step {
  id?: number;
  step_order: number;
  text: string;
  media_url?: string;
}

interface Criterion {
  id?: number;
  criteria_order: number;
  text: string;
}

interface Media {
  id: number;
  media_type: string;
  url: string;
  caption?: string;
}

interface Task {
  id: number;
  chapter_id: number;
  title: string;
  description: string;
  task_order: number;
  default_status: string;
  steps: Step[];
  criteria: Criterion[];
  media: Media[];
}

interface ChapterDetail extends Chapter {
  tasks: Task[];
}

// ─── Kapitel-Übersicht ───────────────────────────────────────────────

function ChapterList({
  chapters,
  onSelect,
  onRefresh,
}: {
  chapters: Chapter[];
  onSelect: (id: number) => void;
  onRefresh: () => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await api.createChapter({
        title: newTitle.trim(),
        chapter_order: chapters.length,
        type: 'frei',
        icon: '📝',
      });
      setNewTitle('');
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Kapitel "${title}" wirklich löschen? Alle Aufgaben darin werden ebenfalls gelöscht!`)) return;
    await api.deleteChapter(id);
    onRefresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Kapitel</h2>

      {/* Create */}
      <div className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Neues Kapitel..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTitle.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Erstellen
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {chapters.map(ch => (
          <div
            key={ch.id}
            className="bg-white border rounded-lg p-3 flex items-center justify-between hover:shadow-sm cursor-pointer"
            onClick={() => onSelect(ch.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ch.icon || '📝'}</span>
              <div>
                <div className="font-medium">
                  <span className="text-gray-400 text-sm mr-2">#{ch.chapter_order}</span>
                  {ch.title}
                </div>
                <div className="text-xs text-gray-500">
                  {ch.task_count} Aufgabe{ch.task_count !== 1 ? 'n' : ''} · {ch.type}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); handleDelete(ch.id, ch.title); }}
                className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Kapitel-Editor (mit Tasks) ──────────────────────────────────────

function ChapterEditor({
  chapterId,
  onBack,
}: {
  chapterId: number;
  onBack: () => void;
}) {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<number | null>(null);

  // Chapter edit fields
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [order, setOrder] = useState(0);
  const [type, setType] = useState('frei');
  const [icon, setIcon] = useState('📝');
  const [saving, setSaving] = useState(false);

  // New task
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getContentChapter(chapterId);
      setChapter(data);
      setTitle(data.title);
      setDesc(data.description || '');
      setOrder(data.chapter_order);
      setType(data.type || 'frei');
      setIcon(data.icon || '📝');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [chapterId]);

  const saveChapter = async () => {
    setSaving(true);
    try {
      await api.updateChapter(chapterId, {
        title, description: desc, chapter_order: order, type, icon,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    await api.createTask({
      chapter_id: chapterId,
      title: newTaskTitle.trim(),
      task_order: (chapter?.tasks.length || 0),
    });
    setNewTaskTitle('');
    await load();
  };

  const deleteTask = async (taskId: number, taskTitle: string) => {
    if (!confirm(`Aufgabe "${taskTitle}" wirklich löschen?`)) return;
    await api.deleteTask(taskId);
    await load();
  };

  if (loading) return <div className="p-4">Laden...</div>;
  if (!chapter) return <div className="p-4">Kapitel nicht gefunden.</div>;

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Zurück zur Übersicht
      </button>

      {/* Chapter meta editor */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="font-bold text-lg mb-3">Kapitel bearbeiten</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Titel</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Beschreibung</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reihenfolge</label>
            <input type="number" value={order} onChange={e => setOrder(parseInt(e.target.value) || 0)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Typ</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="linear">Linear (der Reihe nach)</option>
              <option value="frei">Frei (beliebige Reihenfolge)</option>
              <option value="wahl">Wahl (eine aus mehreren)</option>
              <option value="inspiration">Inspiration (nur Bilder, keine Haken)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Icon</label>
            <input value={icon} onChange={e => setIcon(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button
              onClick={saveChapter}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Kapitel speichern'}
            </button>
          </div>
        </div>
      </div>

      {/* Task list */}
      <h3 className="font-bold text-lg mb-3">
        Aufgaben ({chapter.tasks.length})
      </h3>

      <div className="flex gap-2 mb-4">
        <input
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createTask()}
          placeholder="Neue Aufgabe..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={createTask}
          disabled={!newTaskTitle.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
        >
          + Aufgabe
        </button>
      </div>

      <div className="space-y-2">
        {chapter.tasks
          .sort((a, b) => a.task_order - b.task_order)
          .map(task => (
            <div key={task.id}>
              <div
                className={`bg-white border rounded-lg p-3 flex items-center justify-between hover:shadow-sm cursor-pointer ${
                  editingTask === task.id ? 'border-blue-400 ring-1 ring-blue-200' : ''
                }`}
                onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
              >
                <div>
                  <div className="font-medium text-sm">
                    <span className="text-gray-400 mr-2">#{task.task_order}</span>
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.steps.length} Schritte · {task.criteria.length} Kriterien · {task.media.length} Medien ·{' '}
                    <span className={
                      task.default_status === 'pflicht' ? 'text-blue-600' :
                      task.default_status === 'extra' ? 'text-green-600' : 'text-gray-400'
                    }>
                      {task.default_status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteTask(task.id, task.title); }}
                    className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              {editingTask === task.id && (
                <TaskEditor task={task} onSaved={load} />
              )}
            </div>
          ))}
      </div>
    </div>
  );
}


// ─── Task-Editor (Steps, Criteria, Media) ────────────────────────────

function TaskEditor({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [taskOrder, setTaskOrder] = useState(task.task_order);
  const [defaultStatus, setDefaultStatus] = useState(task.default_status);

  const [steps, setSteps] = useState<Step[]>(
    task.steps.map(s => ({ ...s }))
  );
  const [criteria, setCriteria] = useState<Criterion[]>(
    task.criteria.map(c => ({ ...c }))
  );

  // Media add
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('video');
  const [mediaCaption, setMediaCaption] = useState('');

  const [saving, setSaving] = useState(false);

  const saveTask = async () => {
    setSaving(true);
    try {
      // 1. Update task meta
      await api.updateTask(task.id, {
        title, description, task_order: taskOrder, default_status: defaultStatus,
      });

      // 2. Update steps
      await api.updateSteps(task.id, steps.map((s, i) => ({
        step_order: i,
        text: s.text,
        media_url: s.media_url || undefined,
      })));

      // 3. Update criteria
      await api.updateCriteria(task.id, criteria.map((c, i) => ({
        criteria_order: i,
        text: c.text,
      })));

      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    setSteps([...steps, { step_order: steps.length, text: '', media_url: '' }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: string) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { criteria_order: criteria.length, text: '' }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const addMedia = async () => {
    if (!mediaUrl.trim()) return;
    await api.addMedia(task.id, {
      media_type: mediaType,
      url: mediaUrl.trim(),
      caption: mediaCaption.trim() || undefined,
    });
    setMediaUrl('');
    setMediaCaption('');
    await onSaved();
  };

  const deleteMedia = async (mediaId: number) => {
    if (!confirm('Medium löschen?')) return;
    await api.deleteMedia(mediaId);
    await onSaved();
  };

  return (
    <div className="bg-gray-50 border border-t-0 rounded-b-lg p-4 space-y-4">
      {/* Task meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Titel</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Beschreibung</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reihenfolge</label>
          <input type="number" value={taskOrder} onChange={e => setTaskOrder(parseInt(e.target.value) || 0)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Standard-Status</label>
          <select value={defaultStatus} onChange={e => setDefaultStatus(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
            <option value="pflicht">Pflicht</option>
            <option value="extra">Extra</option>
            <option value="versteckt">Versteckt</option>
          </select>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm">Schritte ({steps.length})</h4>
          <button onClick={addStep} className="text-blue-600 hover:text-blue-800 text-xs">+ Schritt</button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="bg-white border rounded p-2 space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 pt-2 w-5 text-center">{i + 1}</span>
                <textarea
                  value={step.text}
                  onChange={e => updateStep(i, 'text', e.target.value)}
                  rows={2}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="Schritt-Text..."
                />
                <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 text-xs pt-2">✕</button>
              </div>
              <div className="ml-7">
                <input
                  value={step.media_url || ''}
                  onChange={e => updateStep(i, 'media_url', e.target.value)}
                  className="w-full border rounded px-2 py-1 text-xs text-gray-600"
                  placeholder="Medien-URL (optional, z.B. /uploads/Videos/...)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Criteria */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-sm">Kriterien ({criteria.length})</h4>
          <button onClick={addCriterion} className="text-blue-600 hover:text-blue-800 text-xs">+ Kriterium</button>
        </div>
        <div className="space-y-1">
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-center">•</span>
              <input
                value={c.text}
                onChange={e => {
                  const updated = [...criteria];
                  updated[i] = { ...updated[i], text: e.target.value };
                  setCriteria(updated);
                }}
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Kriterium..."
              />
              <button onClick={() => removeCriterion(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Media */}
      <div>
        <h4 className="font-bold text-sm mb-2">Medien ({task.media.length})</h4>
        {task.media.length > 0 && (
          <div className="space-y-1 mb-3">
            {task.media.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white border rounded px-2 py-1 text-sm">
                <div>
                  <span className="text-xs text-gray-400 mr-2">[{m.media_type}]</span>
                  <span className="text-gray-700">{m.url}</span>
                  {m.caption && <span className="text-gray-400 text-xs ml-2">— {m.caption}</span>}
                </div>
                <button onClick={() => deleteMedia(m.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
              placeholder="URL (z.B. /uploads/Videos/...)"
            />
          </div>
          <select value={mediaType} onChange={e => setMediaType(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value="video">Video</option>
            <option value="image">Bild</option>
            <option value="gif">GIF</option>
          </select>
          <input
            value={mediaCaption}
            onChange={e => setMediaCaption(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-32"
            placeholder="Beschriftung..."
          />
          <button
            onClick={addMedia}
            disabled={!mediaUrl.trim()}
            className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 disabled:opacity-50"
          >
            + Medium
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2 border-t">
        <button
          onClick={saveTask}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Aufgabe speichern'}
        </button>
      </div>
    </div>
  );
}


// ─── Hauptkomponente ─────────────────────────────────────────────────

export default function AdminContent() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const data = await api.getContentChapters();
      setChapters(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChapters(); }, []);

  if (loading) return <div className="p-8 text-center">Laden...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inhalte verwalten</h1>
        <Link to="/admin" className="text-blue-600 hover:underline text-sm">
          ← Admin Dashboard
        </Link>
      </div>

      {selectedChapter ? (
        <ChapterEditor
          chapterId={selectedChapter}
          onBack={() => { setSelectedChapter(null); loadChapters(); }}
        />
      ) : (
        <ChapterList
          chapters={chapters}
          onSelect={setSelectedChapter}
          onRefresh={loadChapters}
        />
      )}
    </div>
  );
}
