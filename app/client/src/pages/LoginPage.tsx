import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, pin);
      navigate('/');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.');
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Willkommen zurück" description="Melde dich an und mache bei deinem nächsten Projekt weiter.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="auth-label">Benutzername</label>
          <input id="username" name="username" autoComplete="username" required maxLength={40} value={username} onChange={event => setUsername(event.target.value)} className="auth-input" placeholder="Dein Benutzername" />
        </div>
        <div>
          <label htmlFor="password" className="auth-label">Passwort</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={72} value={pin} onChange={event => setPin(event.target.value)} className="auth-input" placeholder="Dein Passwort" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="auth-button">{loading ? 'Wird angemeldet …' : 'Anmelden'}<span aria-hidden="true">→</span></button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">Zum ersten Mal hier? <Link to="/register" className="font-semibold text-teal-700 hover:underline">Konto erstellen</Link></p>
    </AuthLayout>
  );
}
