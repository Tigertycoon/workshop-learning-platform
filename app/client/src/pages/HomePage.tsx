import { useEffect, useState } from 'react';
import { gamesApi, Game } from '../api';
import GameCard from '../components/GameCard';
import Header from '../components/Header';

const ALL_TAGS_LABEL = 'Alle';

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS_LABEL);
  const [search, setSearch] = useState('');

  useEffect(() => {
    gamesApi
      .getAll()
      .then(setGames)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Alle vorhandenen Tags sammeln
  const allTags = Array.from(
    new Set(games.flatMap((g) => g.tags))
  ).sort();

  // Gefilterte Spiele
  const filtered = games.filter((g) => {
    const matchesTag = activeTag === ALL_TAGS_LABEL || g.tags.includes(activeTag);
    const matchesSearch =
      search.trim() === '' ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      (g.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesTag && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-gray-950 to-blue-950 border-b border-gray-800/50">
        {/* Hintergrund-Deko */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3">
            Spiel <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">los!</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            Entdecke Spiele als Inspiration für deine eigenen Ideen im Workshop.
            Einfach klicken und direkt losspielen!
          </p>

          {/* Suche */}
          <div className="mt-6 max-w-md mx-auto relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Spiel suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/80 border border-gray-700 rounded-2xl
                         text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                         focus:ring-2 focus:ring-purple-500/20 transition-all text-base"
            />
          </div>
        </div>
      </div>

      {/* Hauptbereich */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Tag-Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {[ALL_TAGS_LABEL, ...allTags].map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-full font-semibold text-sm transition-all border capitalize
                  ${activeTag === tag
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40'
                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Zustände */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 font-semibold">Spiele werden geladen…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">😵</span>
            <h2 className="text-xl font-bold text-white">Hoppla! Etwas ist schiefgelaufen.</h2>
            <p className="text-gray-400 max-w-sm">
              Fehler: {error}. Stelle sicher, dass der Server läuft.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">🔍</span>
            <h2 className="text-xl font-bold text-white">Kein Spiel gefunden</h2>
            <p className="text-gray-400">
              {games.length === 0
                ? 'Hier wurden noch keine Spiele bereitgestellt. Du kannst inzwischen die Workshop-Aufgaben ausprobieren.'
                : 'Versuche eine andere Suche oder wähle einen anderen Tag.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-gray-500 text-sm mb-5">
              {filtered.length} {filtered.length === 1 ? 'Spiel' : 'Spiele'} verfügbar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-6 text-center text-gray-600 text-sm">
        <p>🎮 Workshop Spieleportal — Inspiration für das, was du hier bauen kannst</p>
      </footer>
    </div>
  );
}
