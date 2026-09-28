import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { activitiesApi, GameAccess } from '../api';

export default function GamesGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<GameAccess | null>(null);

  useEffect(() => {
    activitiesApi
      .access()
      .then(setAccess)
      .catch(() => setAccess({ unlocked: false, reason: 'error', approvedThisWeek: 0, required: 1 }));
  }, []);

  if (!access) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Laden…</div>;
  }
  if (access.unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="font-black text-3xl mb-2">Spiele noch gesperrt</h1>
      <p className="text-gray-400 max-w-sm mb-6">
        Schließe erst <b>{Math.max(access.required - access.approvedThisWeek, 1)}</b> Selbstlern-Aktivität(en) ab,
        dann schaltest du die Spiele frei. ({access.approvedThisWeek}/{access.required} genehmigt)
      </p>
      <div className="flex gap-3">
        <Link to="/selbstlernen" className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl font-semibold transition-colors">
          Zu den Aktivitäten
        </Link>
        <Link to="/" className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl font-semibold transition-colors">
          Übersicht
        </Link>
      </div>
    </div>
  );
}
