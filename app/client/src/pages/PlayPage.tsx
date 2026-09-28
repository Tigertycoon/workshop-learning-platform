import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gamesApi, Game } from '../api';
import Header from '../components/Header';

export default function PlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    gamesApi
      .getBySlug(slug)
      .then(setGame)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fullscreen-Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-semibold">Spiel wird geladen…</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <span className="text-6xl">😕</span>
          <h1 className="text-2xl font-bold text-white">Spiel nicht gefunden</h1>
          <p className="text-gray-400 max-w-sm">
            {error ?? 'Dieses Spiel existiert nicht oder ist nicht aktiv.'}
          </p>
          <Link
            to="/spiele"
            className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold
                       rounded-2xl transition-colors flex items-center gap-2"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Header />

      {/* Breadcrumb & Steuerung */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/spiele"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300
                       hover:text-white font-semibold rounded-xl transition-colors text-sm border border-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </Link>

          <div>
            <h1 className="font-black text-xl text-white leading-none">{game.title}</h1>
            {game.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {game.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-500 capitalize">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700
                     text-white font-semibold rounded-xl transition-colors text-sm"
          title="Vollbild"
        >
          {isFullscreen ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              Vollbild beenden
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              Vollbild
            </>
          )}
        </button>
      </div>

      {/* Spiel-Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full flex-1">
        <div
          ref={containerRef}
          className="relative w-full bg-black rounded-2xl overflow-hidden border border-gray-800
                     shadow-2xl shadow-purple-900/20"
          style={{ aspectRatio: '16/9' }}
        >
          <iframe
            ref={iframeRef}
            src={`/games/${game.slug}/index.html`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allowFullScreen
            title={game.title}
            allow="autoplay; fullscreen; pointer-lock"
          />
        </div>

        {/* Beschreibung */}
        {game.description && (
          <div className="mt-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <p className="text-gray-300 text-sm leading-relaxed">{game.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
