import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Gắn access token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto refresh khi 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Typed API methods ────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string; orgName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const personaApi = {
  list: () => api.get('/personas'),
  create: (data: unknown) => api.post('/personas', data),
  update: (id: string, data: unknown) => api.put(`/personas/${id}`, data),
  delete: (id: string) => api.delete(`/personas/${id}`),
  setDefault: (id: string) => api.patch(`/personas/${id}/set-default`),
};

export const contentApi = {
  list: (params?: Record<string, string>) => api.get('/content', { params }),
  create: (data: unknown) => api.post('/content', data),
  get: (id: string) => api.get(`/content/${id}`),
  update: (id: string, data: unknown) => api.patch(`/content/${id}`, data),
  generate: (id: string) => api.post(`/content/${id}/generate`),
  rewrite: (id: string, instruction?: string) => api.post(`/content/${id}/rewrite`, { instruction }),
  expand: (id: string) => api.post(`/content/${id}/expand`),
  shorten: (id: string) => api.post(`/content/${id}/shorten`),
  pollJob: (contentId: string, jobId: string) => api.get(`/content/${contentId}/jobs/${jobId}`),
  getVersions: (id: string) => api.get(`/content/${id}/versions`),
};

export const campaignApi = {
  list: () => api.get('/campaigns'),
  create: (data: unknown) => api.post('/campaigns', data),
};

export const orgApi = {
  get: () => api.get('/org'),
  update: (data: unknown) => api.patch('/org', data),
};

export const usageApi = {
  getSummary: () => api.get('/usage'),
};
