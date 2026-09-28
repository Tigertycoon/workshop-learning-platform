import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

interface TaskDetail {
  id: number;
  chapter_id: number;
  title: string;
  description: string;
  steps: { id: number; step_order: number; text: string; media_url?: string }[];
  criteria: { id: number; criteria_order: number; text: string }[];
  media: { id: number; media_type: string; url: string; caption?: string }[];
  completed: boolean;
}

// Video component: autoplay, muted, loop — controls only visible on hover
function AutoVideo({ src, maxHeight, className }: { src: string; maxHeight: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  // Use IntersectionObserver to play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        controls={hovered}
        className={`rounded ${className || ''}`}
        style={{ maxHeight, display: 'block' }}
      />
    </div>
  );
}

export default function TaskPage() {
  const { id } = useParams();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getTask(parseInt(id)).then(setTask).finally(() => setLoading(false));
  }, [id]);

  const handleToggle = async () => {
    if (!task) return;
    const newState = !task.completed;
    await api.toggleTask(task.id, newState);
    setTask({ ...task, completed: newState });
  };

  const isVideo = useCallback((url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
  }, []);

  if (loading) return <div className="p-8 text-center">Laden...</div>;
  if (!task) return <div className="p-8 text-center">Aufgabe nicht gefunden.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to={`/chapter/${task.chapter_id}`} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Zurück zum Kapitel
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <button
            onClick={handleToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              task.completed
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {task.completed ? '✓ Erledigt' : 'Als erledigt markieren'}
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-gray-600 mb-6">{task.description}</p>
        )}

        {/* Media */}
        {task.media.length > 0 && (
          <div className="mb-6 space-y-3">
            {task.media.map(m => (
              <div key={m.id}>
                {m.media_type === 'image' || m.media_type === 'gif' ? (
                  <img src={m.url} alt={m.caption || ''} className="rounded-lg max-w-full" />
                ) : (
                  <AutoVideo src={m.url} maxHeight="400px" className="max-w-full" />
                )}
                {m.caption && <p className="text-sm text-gray-500 mt-1">{m.caption}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Steps */}
        {task.steps.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-lg mb-3">Schritte</h2>
            <ol className="space-y-4">
              {task.steps.map((step, i) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </span>
                  <div className="flex-1 pt-0.5">
                    <p>{step.text}</p>
                    {step.media_url && (
                      isVideo(step.media_url) ? (
                        <div className="mt-2">
                          <AutoVideo src={step.media_url} maxHeight="300px" className="max-w-full" />
                        </div>
                      ) : (
                        <img src={step.media_url} alt="" className="rounded mt-2 max-w-md" />
                      )
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Criteria */}
        {task.criteria.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-bold text-lg mb-3">Kriterien</h2>
            <p className="text-sm text-gray-500 mb-3">
              Diese Punkte solltest du erfüllt haben bevor du die Aufgabe abhakst:
            </p>
            <ul className="space-y-2">
              {task.criteria.map(c => (
                <li key={c.id} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
