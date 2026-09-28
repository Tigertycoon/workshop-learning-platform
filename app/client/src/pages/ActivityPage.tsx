import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { activitiesApi, Activity } from '../api';

export default function ActivityPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!id) return;
    activitiesApi.get(parseInt(id)).then(setActivity)
      .catch((error: unknown) => setError(error instanceof Error ? error.message : 'Aktivität konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const submit = async () => {
    if (!id) return;
    setSubmitting(true);
    setError('');
    try {
      await activitiesApi.submit(parseInt(id), { note });
      setNote('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Laden…</div>;
  }
  if (!activity) {
    return <div role="alert" className="min-h-screen bg-gray-950 text-white flex items-center justify-center">{error || 'Aktivität nicht gefunden.'}</div>;
  }

  const isFlagship = activity.kind === 'blender' || activity.kind === 'jingle';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-950 to-gray-950 text-white">
      <header className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/selbstlernen" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Selbstlernen
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-2">{activity.icon}</span>
          <h1 className="font-black text-2xl">{activity.title}</h1>
          <p className="text-gray-400 mt-2">{activity.description}</p>
        </div>

        {isFlagship && (
          <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-center text-gray-300 mb-6">
            ✨ Die interaktive Version dieser Aktivität kommt bald. Bis dahin kannst du kurz beschreiben, was du gemacht hast.
          </div>
        )}

        {/* Einreichen */}
        <div className="rounded-2xl p-5 bg-white/5 border border-white/10 mb-6">
          <label htmlFor="submission" className="block text-sm font-semibold mb-2">Deine Einreichung</label>
          <textarea
            id="submission"
            maxLength={4000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            placeholder="Beschreibe deine Lösung…"
          />
          {error && <p role="alert" className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || !note.trim()}
            className="mt-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl transition-colors"
          >
            {submitting ? 'Senden…' : 'Einreichen'}
          </button>
        </div>

        {/* Meine Einreichungen */}
        {activity.submissions && activity.submissions.length > 0 && (
          <div>
            <h2 className="font-bold mb-2">Deine Einreichungen</h2>
            <div className="space-y-2">
              {activity.submissions.map((s) => (
                <div key={s.id} className="rounded-xl p-3 bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        s.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : s.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {s.status === 'approved' ? 'Genehmigt' : s.status === 'rejected' ? 'Abgelehnt' : 'Wird geprüft'}
                    </span>
                    <span className="text-xs text-gray-500">{s.created_at}</span>
                  </div>
                  {s.note && <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{s.note}</p>}
                  {s.feedback && <p className="text-sm text-emerald-300 mt-1">💬 {s.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
