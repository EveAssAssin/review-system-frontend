import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const demeritApi = {
  // 品項
  getCategories: (includeInactive = false) =>
    api.get('/demerit/categories', { params: { include_inactive: includeInactive } }),
  getCategoryById: (id: string) => api.get(`/demerit/categories/${id}`),
  createCategory: (data: { name: string; description?: string; threshold: number }) =>
    api.post('/demerit/categories', data),
  updateCategory: (id: string, data: Partial<{ name: string; description: string; threshold: number; is_active: boolean }>) =>
    api.patch(`/demerit/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/demerit/categories/${id}`),

  // 紀錄
  getRecords: (params?: {
    target_app_number?: string;
    category_id?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/demerit/records', { params }),
  createRecord: (data: { target_app_number: string; category_id: string; reason?: string }) =>
    api.post('/demerit/records', data),
  deleteRecord: (id: string) => api.delete(`/demerit/records/${id}`),

  // 總表
  getSummary: (appNumber?: string) =>
    api.get('/demerit/summary', { params: appNumber ? { app_number: appNumber } : {} }),
};

export const employeeQuickSearch = (keyword: string, limit = 20) =>
  api.get('/employees/search', { params: { keyword, limit } });
