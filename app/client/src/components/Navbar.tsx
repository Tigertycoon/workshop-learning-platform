import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/workshop" className="text-xl font-bold">
          Unity Workshop
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link to="/" className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
              🏠 Übersicht
            </Link>
            <Link to="/spiele" className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
              🎮 Spiele
            </Link>
            {user.role === 'admin' && (
              <>
                <Link to="/admin/review" className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
                  📥 Review
                </Link>
                <Link to="/admin" className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
                  Admin
                </Link>
              </>
            )}
            <span className="text-blue-100 text-sm">
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="bg-blue-500 hover:bg-blue-400 px-3 py-1 rounded text-sm"
            >
              Abmelden
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
