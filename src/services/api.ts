import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器 - 加入 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 回應攔截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (erpid: string) => api.post('/auth/login', { erpid }),
  me: () => api.get('/auth/me'),
  validate: () => api.get('/auth/validate'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data: any) => api.post('/auth/users', data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
};

// Employees API
export const employeesApi = {
  search: (params?: any) => api.get('/employees', { params }),
  getStats: () => api.get('/employees/stats'),
  getById: (id: string) => api.get(`/employees/${id}`),
};

// Reviews API
export const reviewsApi = {
  create: (data: any) => api.post('/reviews', data),
  search: (params?: any) => api.get('/reviews', { params }),
  getStats: () => api.get('/reviews/stats'),
  getById: (id: string) => api.get(`/reviews/${id}`),
  getByToken: (token: string) => api.get(`/reviews/token/${token}`),
  respond: (token: string, content: string) => 
    api.post(`/reviews/token/${token}/respond`, { content }),
  addReviewerResponse: (id: string, content: string, reviewerName: string) =>
    api.post(`/reviews/${id}/reviewer-response`, { content, reviewer_name: reviewerName }),
  close: (id: string, closeNote?: string) => 
    api.post(`/reviews/${id}/close`, { close_note: closeNote }),
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

// Alerts API
export const alertsApi = {
  getRules: () => api.get('/alerts/rules'),
  getRuleById: (id: string) => api.get(`/alerts/rules/${id}`),
  createRule: (data: any) => api.post('/alerts/rules', data),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  getLogs: (limit?: number) => api.get('/alerts/logs', { params: { limit } }),
  getLogsByEmployee: (employeeId: string) => api.get(`/alerts/logs/employee/${employeeId}`),
  getManagers: () => api.get('/alerts/managers'),
  createManager: (data: any) => api.post('/alerts/managers', data),
  updateManager: (id: string, data: any) => api.put(`/alerts/managers/${id}`, data),
  deleteManager: (id: string) => api.delete(`/alerts/managers/${id}`),
};

export default api;
