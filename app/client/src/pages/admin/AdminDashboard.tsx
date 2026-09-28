import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface Group {
  id: number;
  name: string;
  code: string;
  member_count: number;
}

export default function AdminDashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    api.getGroups().then(setGroups).finally(() => setLoading(false));
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    await api.createGroup(newGroupName.trim());
    setNewGroupName('');
    loadGroups();
  };

  const deleteGroup = async (id: number, name: string) => {
    if (!confirm(`Gruppe "${name}" wirklich löschen?`)) return;
    await api.deleteGroup(id);
    loadGroups();
  };

  if (loading) return <div className="p-8 text-center">Laden...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
        <Link
          to="/admin/content"
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-medium"
        >
          Inhalte verwalten
        </Link>
      </div>

      {/* Create group */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-bold mb-3">Neue Gruppe erstellen</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGroup()}
            placeholder="z.B. Montag 14:00"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createGroup}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Erstellen
          </button>
        </div>
      </div>

      {/* Groups list */}
      <div className="space-y-3">
        {groups.length === 0 && (
          <p className="text-gray-500 text-center py-8">Noch keine Gruppen erstellt.</p>
        )}
        {groups.map(group => (
          <div key={group.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{group.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Code: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">{group.code}</code></span>
                  <span>{group.member_count} Kinder</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/admin/groups/${group.id}`}
                  className="bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 text-sm"
                >
                  Details
                </Link>
                <button
                  onClick={() => deleteGroup(group.id, group.name)}
                  className="bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 text-sm"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
