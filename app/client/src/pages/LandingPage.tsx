import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Area {
  to: string;
  emoji: string;
  title: string;
  desc: string;
  gradient: string;
  ring: string;
  badge?: string;
}

const AREAS: Area[] = [
  {
    to: '/workshop',
    emoji: '🎓',
    title: 'Workshop',
    desc: 'Lerne Unity Schritt für Schritt — mit Aufgaben und Checklisten.',
    gradient: 'from-blue-500 to-blue-700',
    ring: 'hover:ring-blue-400',
  },
  {
    to: '/spiele',
    emoji: '🎮',
    title: 'Spiele',
    desc: 'Entdecke bereitgestellte Unity-Games im Browser — als Inspiration für deine eigenen.',
    gradient: 'from-purple-500 to-pink-600',
    ring: 'hover:ring-purple-400',
  },
  {
    to: '/selbstlernen',
    emoji: '🚀',
    title: 'Selbstlernen',
    desc: 'Übe zwischen den Workshops und schalte mit eigenen Projekten die Spiele frei.',
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'hover:ring-emerald-400',
    badge: 'Mit Feedback',
  },
];

export default function LandingPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
      {/* Topbar */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎮</span>
          <span className="font-black text-xl tracking-tight">Workshop</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/review" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                Review
              </Link>
              <Link to="/admin" className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                Admin
              </Link>
            </>
          )}
          <span className="text-gray-400 hidden sm:block">Hallo, {user?.username}!</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4 text-center">
        <h1 className="font-black text-3xl sm:text-4xl mb-2">Was möchtest du tun?</h1>
        <p className="text-gray-400">Wähle einen Bereich aus.</p>
      </div>

      {/* 3 Bereiche */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {AREAS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`group relative rounded-3xl p-8 bg-gradient-to-br ${a.gradient} ring-2 ring-transparent ${a.ring}
                        transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl min-h-[16rem] flex flex-col`}
          >
            {a.badge && (
              <span className="absolute top-4 right-4 text-xs font-bold bg-black/30 px-2.5 py-1 rounded-full">
                {a.badge}
              </span>
            )}
            <span className="text-6xl mb-4">{a.emoji}</span>
            <h2 className="font-black text-2xl mb-2">{a.title}</h2>
            <p className="text-white/80 text-sm leading-relaxed flex-1">{a.desc}</p>
            <span className="mt-4 inline-flex items-center gap-2 font-semibold">
              Los geht's
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </main>
    </div>
  );
}
