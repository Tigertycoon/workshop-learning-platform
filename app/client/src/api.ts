const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('workshop_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('workshop_token', token);
  } else {
    localStorage.removeItem('workshop_token');
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && token && path !== '/auth/login') {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Nicht eingeloggt');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Ein Fehler ist aufgetreten');
  }
  return data;
}

// Auth
export const api = {
  login: (username: string, pin: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, pin }) }),

  register: (username: string, pin: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, pin }) }),

  joinGroup: (code: string) =>
    request('/auth/join-group', { method: 'POST', body: JSON.stringify({ code }) }),

  me: () => request('/auth/me'),

  // Chapters & Tasks
  getChapters: () => request('/chapters'),
  getChapterTasks: (id: number) => request(`/chapters/${id}/tasks`),
  getTask: (id: number) => request(`/progress/tasks/${id}`),

  // Progress
  getProgress: () => request('/progress'),
  toggleTask: (taskId: number, completed: boolean) =>
    request(`/progress/${taskId}`, { method: 'POST', body: JSON.stringify({ completed }) }),

  // Admin
  getGroups: () => request('/admin/groups'),
  createGroup: (name: string) =>
    request('/admin/groups', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteGroup: (id: number) =>
    request(`/admin/groups/${id}`, { method: 'DELETE' }),
  getGroupMembers: (id: number) => request(`/admin/groups/${id}/members`),
  getGroupOverrides: (id: number) => request(`/admin/groups/${id}/overrides`),
  setGroupOverride: (groupId: number, taskId: number, status: string) =>
    request(`/admin/groups/${groupId}/overrides`, {
      method: 'PUT', body: JSON.stringify({ taskId, status })
    }),
  moveUserToGroup: (userId: number, groupId: number) =>
    request(`/admin/users/${userId}/group`, {
      method: 'PUT', body: JSON.stringify({ groupId })
    }),

  // Admin Content Management
  getContentChapters: () => request('/admin/content/chapters'),
  getContentChapter: (id: number) => request(`/admin/content/chapters/${id}`),
  createChapter: (data: { title: string; description?: string; chapter_order?: number; type?: string; icon?: string }) =>
    request('/admin/content/chapters', { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (id: number, data: { title: string; description?: string; chapter_order?: number; type?: string; icon?: string }) =>
    request(`/admin/content/chapters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapter: (id: number) =>
    request(`/admin/content/chapters/${id}`, { method: 'DELETE' }),

  createTask: (data: { chapter_id: number; title: string; description?: string; task_order?: number; default_status?: string }) =>
    request('/admin/content/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: { title: string; description?: string; task_order?: number; default_status?: string }) =>
    request(`/admin/content/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    request(`/admin/content/tasks/${id}`, { method: 'DELETE' }),

  updateSteps: (taskId: number, steps: { step_order: number; text: string; media_url?: string }[]) =>
    request(`/admin/content/tasks/${taskId}/steps`, { method: 'PUT', body: JSON.stringify({ steps }) }),
  updateCriteria: (taskId: number, criteria: { criteria_order: number; text: string }[]) =>
    request(`/admin/content/tasks/${taskId}/criteria`, { method: 'PUT', body: JSON.stringify({ criteria }) }),

  addMedia: (taskId: number, data: { media_type: string; url: string; caption?: string }) =>
    request(`/admin/content/tasks/${taskId}/media`, { method: 'POST', body: JSON.stringify(data) }),
  deleteMedia: (id: number) =>
    request(`/admin/content/media/${id}`, { method: 'DELETE' }),

  getFiles: () => request('/admin/content/files'),
  getProgressOverview: () => request('/admin/content/progress-overview'),
};

// =========================================================================
// Spieleportal
// =========================================================================

export interface Game {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  tags: string[];
  sort_order: number;
  build_path?: string;
}

export const gamesApi = {
  getAll: (): Promise<Game[]> => request('/games'),
  getBySlug: (slug: string): Promise<Game> => request(`/games/${slug}`),
};

// =========================================================================
// Selbstlernen
// =========================================================================

export interface Submission {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  kind: 'generic' | 'intro' | 'blender' | 'jingle';
  icon: string | null;
  sort_order: number;
  my_status?: 'pending' | 'approved' | 'rejected' | null;
  my_submission_id?: number | null;
  submissions?: Submission[];
}

export interface GameAccess {
  unlocked: boolean;
  reason: string;
  approvedThisWeek: number;
  required: number;
}

export const activitiesApi = {
  list: (): Promise<Activity[]> => request('/activities'),
  get: (id: number): Promise<Activity> => request(`/activities/${id}`),
  submit: (id: number, data: { note?: string; payload_json?: string; file_url?: string }) =>
    request(`/activities/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  access: (): Promise<GameAccess> => request('/activities/access'),
};

export interface ReviewItem {
  id: number;
  status: string;
  note: string | null;
  created_at: string;
  username: string;
  activity_title: string;
  activity_kind: string;
  user_id: number;
}

export const reviewApi = {
  queue: (status = 'pending'): Promise<ReviewItem[]> =>
    request(`/admin/review/submissions?status=${status}`),
  review: (id: number, data: { status: 'approved' | 'rejected'; feedback?: string }) =>
    request(`/admin/review/submissions/${id}`, { method: 'POST', body: JSON.stringify(data) }),
  unlock: (userId: number) => request(`/admin/review/unlock/${userId}`, { method: 'POST' }),
  relock: (userId: number) => request(`/admin/review/unlock/${userId}`, { method: 'DELETE' }),
};
