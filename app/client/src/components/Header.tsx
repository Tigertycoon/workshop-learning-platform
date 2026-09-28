import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group" title="Zurück zur Übersicht">
          <span className="text-3xl">🎮</span>
          <div>
            <span className="font-black text-xl text-white group-hover:text-purple-300 transition-colors leading-none block">
              Workshop
            </span>
            <span className="font-bold text-xs text-purple-400 leading-none block tracking-widest uppercase">
              Spieleportal
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-gray-400
                     hover:text-white hover:bg-gray-800 transition-colors border border-gray-800"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:block">Übersicht</span>
        </Link>
      </div>
    </header>
  );
}
