import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';
import ProgressBar from '../../components/ProgressBar';

interface Member {
  id: number;
  username: string;
  completed_tasks: number;
  total_tasks: number;
}

export default function AdminGroupDetail() {
  const { id } = useParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const gId = parseInt(id);
    Promise.all([
      api.getGroupMembers(gId),
      api.getGroups()
    ]).then(([membersData, groups]) => {
      setMembers(membersData);
      setGroup(groups.find((g: any) => g.id === gId));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center">Laden...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to="/admin" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Zurück zur Übersicht
      </Link>

      {group && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-gray-500 mt-1">
            Code: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-lg">{group.code}</code>
          </p>
        </div>
      )}

      <h2 className="font-bold text-lg mb-3">Kinder ({members.length})</h2>

      {members.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Noch keine Kinder in dieser Gruppe. Sie können sich mit dem Code registrieren.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{member.username}</span>
                <span className="text-sm text-gray-500">
                  {member.completed_tasks} / {member.total_tasks}
                </span>
              </div>
              <ProgressBar
                value={member.total_tasks > 0 ? member.completed_tasks / member.total_tasks : 0}
                showLabel={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
