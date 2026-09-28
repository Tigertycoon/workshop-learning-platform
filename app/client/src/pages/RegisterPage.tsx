import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (pin !== confirmation) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setLoading(true);
    try {
      await register(username, pin);
      navigate('/');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Registrierung fehlgeschlagen.');
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Dein nächstes Projekt beginnt hier" description="Wähle einen Benutzernamen. Einen Workshop-Code kannst du nach der Anmeldung eingeben.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="auth-label">Benutzername</label>
          <input id="username" name="username" autoComplete="username" required minLength={2} maxLength={40} value={username} onChange={event => setUsername(event.target.value)} className="auth-input" aria-describedby="username-hint" placeholder="z. B. pixelpilot" />
          <p id="username-hint" className="mt-2 text-xs text-slate-500">2–40 Zeichen: Buchstaben, Zahlen, Punkt, Bindestrich oder Unterstrich.</p>
        </div>
        <div>
          <label htmlFor="password" className="auth-label">Passwort</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={pin} onChange={event => setPin(event.target.value)} className="auth-input" placeholder="Mindestens 8 Zeichen" />
        </div>
        <div>
          <label htmlFor="confirmation" className="auth-label">Passwort wiederholen</label>
          <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="auth-input" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="auth-button">{loading ? 'Konto wird erstellt …' : 'Konto erstellen'}<span aria-hidden="true">→</span></button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">Schon dabei? <Link to="/login" className="font-semibold text-teal-700 hover:underline">Anmelden</Link></p>
    </AuthLayout>
  );
}
