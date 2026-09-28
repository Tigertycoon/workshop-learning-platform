import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { activitiesApi, Activity, GameAccess } from '../api';

const STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Genehmigt ✓', cls: 'bg-emerald-500/20 text-emerald-300' },
  pending: { label: 'Eingereicht', cls: 'bg-yellow-500/20 text-yellow-300' },
  rejected: { label: 'Nochmal', cls: 'bg-red-500/20 text-red-300' },
};

export default function SelbstlernenPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [access, setAccess] = useState<GameAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([activitiesApi.list(), activitiesApi.access()])
      .then(([a, acc]) => {
        setActivities(a);
        setAccess(acc);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-950 to-gray-950 text-white">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Übersicht
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2 text-center">
        <div className="text-5xl mb-3">🚀</div>
        <h1 className="font-black text-3xl sm:text-4xl mb-2">Selbstlernen</h1>
        <p className="text-gray-400 max-w-xl mx-auto">Schließe Aktivitäten ab, um die Spiele freizuschalten.</p>
      </div>

      {/* Spiele-Status-Banner */}
      {access && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          {access.unlocked ? (
            <Link
              to="/spiele"
              className="block rounded-2xl p-4 bg-emerald-500/15 border border-emerald-500/30 text-center hover:bg-emerald-500/25 transition-colors"
            >
              🎉 Spiele sind freigeschaltet — <span className="underline">jetzt spielen</span>
            </Link>
          ) : (
            <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center text-gray-300">
              🔒 Schließe noch <b>{Math.max(access.required - access.approvedThisWeek, 1)}</b> Aktivität(en) ab, um die Spiele freizuschalten
              <span className="text-gray-500"> ({access.approvedThisWeek}/{access.required} genehmigt)</span>
            </div>
          )}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading && <p className="text-gray-400">Laden…</p>}
        {!loading && activities.map((a) => {
          const s = a.my_status ? STATUS[a.my_status] : null;
          return (
            <Link
              key={a.id}
              to={`/selbstlernen/${a.id}`}
              className="relative rounded-2xl p-5 bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all"
            >
              {s && (
                <span className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>
                  {s.label}
                </span>
              )}
              <span className="text-4xl mb-2 block">{a.icon}</span>
              <h2 className="font-bold text-lg mb-1 pr-20">{a.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{a.description}</p>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
