import { Link } from 'react-router-dom';
import { Game } from '../api';

// Tag-Farben (zyklisch vergeben)
const TAG_COLORS: Record<string, string> = {
  action:       'bg-red-500/20 text-red-300 border-red-500/30',
  multiplayer:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  puzzle:       'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  singleplayer: 'bg-green-500/20 text-green-300 border-green-500/30',
  adventure:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sport:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const DEFAULT_TAG_COLOR = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

interface GameCardProps {
  game: Game;
}

// Platzhalter-Thumbnail (Emoji-basiert, wenn kein Bild vorhanden)
const PLACEHOLDER_EMOJIS = ['🎮', '🕹️', '⚔️', '🚀', '🧩', '🎯', '🏆'];

function getPlaceholderEmoji(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) & 0xffffffff;
  }
  return PLACEHOLDER_EMOJIS[Math.abs(hash) % PLACEHOLDER_EMOJIS.length];
}

export default function GameCard({ game }: GameCardProps) {
  const emoji = getPlaceholderEmoji(game.slug);

  return (
    <Link
      to={`/play/${game.slug}`}
      className="group block rounded-2xl overflow-hidden bg-gray-800/50 border border-gray-700/50
                 hover:border-purple-500/50 hover:bg-gray-800 transition-all duration-200
                 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-900/30 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
        {game.thumbnail_url ? (
          <img
            src={game.thumbnail_url}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        {/* Fallback / Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-blue-900/80 ${game.thumbnail_url ? 'opacity-0 group-hover:opacity-20' : 'opacity-100'} transition-opacity`}>
          <span className="text-7xl select-none">{emoji}</span>
        </div>

        {/* Spielen-Button Overlay bei Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 flex items-center gap-2 border border-white/30">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="font-bold text-sm">Spielen</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-white mb-1 group-hover:text-purple-300 transition-colors leading-tight">
          {game.title}
        </h3>
        {game.description && (
          <p className="text-gray-400 text-sm leading-snug mb-3 line-clamp-2">
            {game.description}
          </p>
        )}

        {/* Tags */}
        {game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize
                            ${TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_TAG_COLOR}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
