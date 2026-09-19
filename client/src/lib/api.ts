import type {
  Bootstrap, Category, CategoryInput, Comment, Media, Member, Message, Overview,
  Project, ProjectInput, Settings, User,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
  } catch {
    throw new ApiError(0, 'ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
        ? data.error
        : 'خطایی رخ داد. دوباره تلاش کنید.';
    throw new ApiError(res.status, message);
  }

  return data as T;
}

const send = (method: string) => (path: string, body?: unknown) =>
  request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

const post = send('POST');
const put = send('PUT');
const patch = send('PATCH');
const del = send('DELETE');

export const api = {
  bootstrap: () => request<Bootstrap>('/bootstrap'),
  categories: () => request<Category[]>('/categories'),
  category: (slug: string) => request<{ category: Category; projects: Project[] }>(`/categories/${slug}`),
  projects: (params: { category?: string; q?: string; featured?: boolean; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (params.featured) qs.set('featured', '1');
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    return request<Project[]>(`/projects${suffix ? `?${suffix}` : ''}`);
  },
  project: (slug: string) =>
    request<{ project: Project; media: Media[]; comments: Comment[]; related: Project[] }>(
      `/projects/${slug}`,
    ),
  addComment: (slug: string, body: string) => post(`/projects/${slug}/comments`, { body }) as Promise<Comment>,
  deleteComment: (id: number) => del(`/comments/${id}`) as Promise<{ ok: true }>,
  sendMessage: (body: { name: string; email: string; subject: string; body: string }) =>
    post('/messages', body) as Promise<{ ok: true; id: number }>,

  auth: {
    login: (username: string, password: string) =>
      post('/auth/login', { username, password }) as Promise<{ user: User }>,
    register: (body: { username: string; name: string; password: string }) =>
      post('/auth/register', body) as Promise<{ user: User }>,
    logout: () => post('/auth/logout') as Promise<{ ok: true }>,
    me: () => request<{ user: User | null }>('/auth/me'),
    changePassword: (current: string, next: string) =>
      put('/auth/password', { current, next }) as Promise<{ ok: true }>,
  },

  admin: {
    overview: () => request<Overview>('/admin/overview'),

    projects: () => request<Project[]>('/admin/projects'),
    project: (id: number) => request<Project>(`/admin/projects/${id}`),
    createProject: (body: ProjectInput) => post('/admin/projects', body) as Promise<Project>,
    updateProject: (id: number, body: ProjectInput) => put(`/admin/projects/${id}`, body) as Promise<Project>,
    deleteProject: (id: number) => del(`/admin/projects/${id}`) as Promise<{ ok: true }>,
    reorderProjects: (ids: number[]) => put('/admin/projects-order', { ids }) as Promise<{ ok: true }>,

    categories: () => request<Category[]>('/admin/categories'),
    createCategory: (body: CategoryInput) => post('/admin/categories', body) as Promise<Category>,
    updateCategory: (id: number, body: CategoryInput) => put(`/admin/categories/${id}`, body) as Promise<Category>,
    deleteCategory: (id: number) => del(`/admin/categories/${id}`) as Promise<{ ok: true }>,

    messages: () => request<Message[]>('/admin/messages'),
    markMessage: (id: number, isRead: boolean) => patch(`/admin/messages/${id}`, { isRead }) as Promise<{ ok: true }>,
    deleteMessage: (id: number) => del(`/admin/messages/${id}`) as Promise<{ ok: true }>,

    comments: () => request<Comment[]>('/admin/comments'),
    deleteComment: (id: number) => del(`/admin/comments/${id}`) as Promise<{ ok: true }>,

    members: () => request<Member[]>('/admin/members'),
    deleteMember: (id: number) => del(`/admin/members/${id}`) as Promise<{ ok: true }>,

    /** Sends the File itself as the request body — no multipart, no extra deps. */
    upload: async (file: File) => {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ApiError(res.status, (data as { error?: string })?.error ?? 'بارگذاری فایل ناموفق بود.');
      }
      return data as { url: string; kind: 'image' | 'video'; size: number };
    },

    settings: () => request<Settings>('/admin/settings'),
    saveSettings: (patchBody: Settings) => put('/admin/settings', patchBody) as Promise<Settings>,
  },
};
