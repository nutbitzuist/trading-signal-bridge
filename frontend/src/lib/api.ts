import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  me: () => api.get('/auth/me'),

  updateProfile: (data: { full_name?: string; password?: string }) =>
    api.put('/auth/me', data),

  regenerateWebhookSecret: () => api.post('/auth/regenerate-webhook-secret'),
};

// Accounts API
export const accountsApi = {
  list: () => api.get('/accounts'),

  create: (data: {
    name: string;
    broker?: string;
    account_number?: string;
    platform: 'mt4' | 'mt5';
  }) => api.post('/accounts', data),

  get: (id: string) => api.get(`/accounts/${id}`),

  update: (id: string, data: {
    name?: string;
    broker?: string;
    account_number?: string;
    is_active?: boolean;
  }) => api.put(`/accounts/${id}`, data),

  delete: (id: string) => api.delete(`/accounts/${id}`),

  regenerateKey: (id: string) => api.post(`/accounts/${id}/regenerate-key`),

  // Symbol mappings
  listSymbols: (accountId: string) => api.get(`/accounts/${accountId}/symbols`),

  createSymbol: (accountId: string, data: {
    tradingview_symbol: string;
    mt_symbol: string;
    lot_multiplier?: number;
  }) => api.post(`/accounts/${accountId}/symbols`, data),

  updateSymbol: (accountId: string, symbolId: string, data: {
    tradingview_symbol?: string;
    mt_symbol?: string;
    lot_multiplier?: number;
  }) => api.put(`/accounts/${accountId}/symbols/${symbolId}`, data),

  deleteSymbol: (accountId: string, symbolId: string) =>
    api.delete(`/accounts/${accountId}/symbols/${symbolId}`),
};

// Signals API
export const signalsApi = {
  list: (params?: {
    account_id?: string;
    status?: string;
    symbol?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  }) => api.get('/signals', { params }),

  get: (id: string) => api.get(`/signals/${id}`),

  cancel: (id: string) => api.delete(`/signals/${id}`),

  export: (params?: {
    account_id?: string;
    status?: string;
    symbol?: string;
    from_date?: string;
    to_date?: string;
  }) => api.get('/signals/export', { params, responseType: 'blob' }),
};

// Dashboard API
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

// Admin API
export const adminApi = {
  stats: () => api.get('/admin/stats'),

  listUsers: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    tier?: string;
    is_active?: boolean;
    is_approved?: boolean;
    is_admin?: boolean;
  }) => api.get('/admin/users', { params }),

  getUser: (id: string) => api.get(`/admin/users/${id}`),

  createUser: (data: {
    email: string;
    password: string;
    full_name?: string;
    is_admin?: boolean;
    tier?: string;
    is_approved?: boolean;
    is_active?: boolean;
    max_accounts?: number;
    max_signals_per_day?: number;
    admin_notes?: string;
  }) => api.post('/admin/users', data),

  updateUser: (id: string, data: {
    email?: string;
    full_name?: string;
    password?: string;
    is_admin?: boolean;
    is_active?: boolean;
    tier?: string;
    is_approved?: boolean;
    max_accounts?: number;
    max_signals_per_day?: number;
    admin_notes?: string;
  }) => api.put(`/admin/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  approveUser: (id: string, data: { is_approved: boolean; admin_notes?: string }) =>
    api.post(`/admin/users/${id}/approve`, data),

  upgradeTier: (id: string, data: { tier: string; admin_notes?: string }) =>
    api.post(`/admin/users/${id}/upgrade-tier`, data),

  toggleAdmin: (id: string) => api.post(`/admin/users/${id}/toggle-admin`),
};

export default api;
