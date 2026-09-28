import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardPage from './DashboardPage';

export default function WorkshopGate() {
  const { user, joinGroup } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admins und Kinder, die schon in einer Gruppe sind, sehen direkt das Dashboard.
  if (user?.role === 'admin' || user?.group_id != null) {
    return <DashboardPage />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await joinGroup(code.trim());
      // group_id ist jetzt gesetzt → diese Komponente rendert ab jetzt das Dashboard
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold">Workshop-Code</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gib den Code ein, den du von deinem Workshop-Leiter bekommen hast.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded px-3 py-2 text-center text-lg tracking-widest uppercase
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="z.B. DEMO01"
            autoFocus
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Workshop betreten'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/" className="text-blue-600 hover:underline text-sm">← Zurück zur Übersicht</Link>
        </div>
      </div>
    </div>
  );
}
