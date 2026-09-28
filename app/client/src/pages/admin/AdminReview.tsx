import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi, ReviewItem } from '../../api';

export default function AdminReview() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    reviewApi.queue().then(setItems)
      .catch((error: unknown) => setError(error instanceof Error ? error.message : 'Einreichungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handle = async (id: number, status: 'approved' | 'rejected') => {
    setBusy(id);
    setError('');
    try {
      await reviewApi.review(id, { status, feedback: feedback[id] });
      load();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Bewertung konnte nicht gespeichert werden.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Laden...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Admin</Link>
      <h1 className="text-2xl font-bold mb-1">Einreichungen prüfen</h1>
      <p className="text-sm text-gray-500 mb-4">Genehmigte Aktivitäten schalten die Spiele für das Kind frei.</p>
      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      {!error && items.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Keine offenen Einreichungen. 🎉
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold">{it.activity_title}</h3>
              <span className="text-xs text-gray-400">{it.username}</span>
            </div>
            {it.note && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded p-2 mb-2 whitespace-pre-wrap">{it.note}</p>
            )}
            <input
              aria-label={`Feedback zu ${it.activity_title} von ${it.username}`}
              maxLength={4000}
              value={feedback[it.id] ?? ''}
              onChange={(e) => setFeedback((f) => ({ ...f, [it.id]: e.target.value }))}
              placeholder="Feedback (optional)"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handle(it.id, 'approved')}
                disabled={busy === it.id}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Genehmigen
              </button>
              <button
                onClick={() => handle(it.id, 'rejected')}
                disabled={busy === it.id}
                className="bg-red-100 text-red-700 px-4 py-1.5 rounded text-sm hover:bg-red-200 disabled:opacity-50"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
