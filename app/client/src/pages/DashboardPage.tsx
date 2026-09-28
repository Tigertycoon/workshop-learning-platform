import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ProgressBar from '../components/ProgressBar';

interface Chapter {
  id: number;
  title: string;
  description: string;
  chapter_order: number;
  type: string;
  icon: string;
  unlocked: boolean;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

export default function DashboardPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getChapters().then(setChapters).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Laden...</div>;

  const linearChapters = chapters.filter(c => c.type === 'linear');
  const freeChapters = chapters.filter(c => c.type !== 'linear' && c.type !== 'inspiration');
  const inspirationChapters = chapters.filter(c => c.type === 'inspiration');

  const trackableChapters = chapters.filter(c => c.type !== 'inspiration');
  const totalPflicht = trackableChapters.reduce((sum, c) => sum + c.totalTasks, 0);
  const totalDone = trackableChapters.reduce((sum, c) => sum + c.completedTasks, 0);
  const overallProgress = totalPflicht > 0 ? totalDone / totalPflicht : 0;

  const filtered = search
    ? chapters.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Kapitel suchen"
          placeholder="Kapitel suchen..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">Gesamtfortschritt</h2>
          <span className="text-sm text-gray-500">{totalDone} / {totalPflicht} Aufgaben</span>
        </div>
        <ProgressBar value={overallProgress} />
      </div>

      {/* Search results */}
      {filtered ? (
        <div className="space-y-3">
          <h2 className="font-bold text-lg mb-2">Suchergebnisse</h2>
          {filtered.length === 0 && <p className="text-gray-500">Nichts gefunden.</p>}
          {filtered.map(ch => (
            <ChapterCard key={ch.id} chapter={ch} />
          ))}
        </div>
      ) : (
        <>
          {/* Linear chapters */}
          {linearChapters.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-lg mb-3">Pflicht-Kapitel</h2>
              <div className="space-y-3">
                {linearChapters.map(ch => (
                  <ChapterCard key={ch.id} chapter={ch} />
                ))}
              </div>
            </div>
          )}

          {/* Free chapters */}
          {freeChapters.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-lg mb-3">Freie Kapitel</h2>
              <p className="text-sm text-gray-500 mb-3">
                {linearChapters.length > 0 ? 'Schließe die Pflicht-Kapitel ab, dann kannst du hier frei wählen!' : 'Wähle das Kapitel, mit dem du anfangen möchtest.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {freeChapters.map(ch => (
                  <ChapterCard key={ch.id} chapter={ch} compact />
                ))}
              </div>
            </div>
          )}

          {/* Inspiration */}
          {inspirationChapters.length > 0 && (
            <div>
              <h2 className="font-bold text-lg mb-3">Inspiration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inspirationChapters.map(ch => (
                  <Link
                    key={ch.id}
                    to={`/chapter/${ch.id}`}
                    className="block bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-purple-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ch.icon || '🎨'}</span>
                      <h3 className="font-medium">{ch.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{ch.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChapterCard({ chapter, compact = false }: { chapter: Chapter; compact?: boolean }) {
  const done = chapter.progress === 1;

  if (!chapter.unlocked) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 opacity-60 ${compact ? '' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🔒</span>
          <h3 className="font-medium text-gray-500">{chapter.title}</h3>
        </div>
        {!compact && (
          <p className="text-sm text-gray-400 mt-1">Schließe vorherige Kapitel ab</p>
        )}
      </div>
    );
  }

  return (
    <Link
      to={`/chapter/${chapter.id}`}
      className={`block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 ${
        done ? 'border-2 border-green-400' : 'border border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{chapter.icon || '📖'}</span>
        <h3 className="font-medium">{chapter.title}</h3>
        {chapter.type === 'wahl' && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Wahl</span>
        )}
        {done && <span className="text-green-500 ml-auto">✓</span>}
      </div>
      {!compact && (
        <p className="text-sm text-gray-500 mb-2">{chapter.description}</p>
      )}
      <div className="flex items-center gap-2">
        <ProgressBar value={chapter.progress} className="flex-1" showLabel={false} />
        <span className="text-xs text-gray-400">
          {chapter.completedTasks}/{chapter.totalTasks}
        </span>
      </div>
    </Link>
  );
}
