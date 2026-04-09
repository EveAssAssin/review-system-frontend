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
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');
      const isOnLoginPage = window.location.pathname === '/login';

      if (!isLoginEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (isOnLoginPage) {
          // 已在登入頁（例如帶著 app_number 的自動登入 URL）
          // → 只清 token，不跳頁，保留 URL params 讓 AutoLogin 繼續執行
        } else {
          // 在其他頁面 token 過期 → 跳回登入頁
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (data: { app_number: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
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
  getResponses: (id: string) => api.get(`/reviews/${id}/responses`),
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

// Categories API
export const categoriesApi = {
  getAll: (includeInactive = false) => api.get('/categories', { params: { include_inactive: includeInactive } }),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Uploads API
export const uploadsApi = {
  uploadForReview: (reviewId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post(`/uploads/review/${reviewId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadForResponse: (reviewId: string, files: File[], uploadBy: 'reviewer' | 'employee' = 'employee') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post(`/uploads/response/${reviewId}`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'x-upload-by': uploadBy,
      },
    });
  },
  getByReviewId: (reviewId: string) => api.get(`/uploads/review/${reviewId}`),
  delete: (id: string) => api.delete(`/uploads/${id}`),
};

// Feedback Categories API
export const feedbackCategoriesApi = {
  getAll: (includeInactive = false) =>
    api.get('/feedback-categories', { params: { include_inactive: includeInactive } }),
  getById: (id: string) => api.get(`/feedback-categories/${id}`),
  create: (data: any) => api.post('/feedback-categories', data),
  update: (id: string, data: any) => api.put(`/feedback-categories/${id}`, data),
  delete: (id: string) => api.delete(`/feedback-categories/${id}`),
};

// Customer Sync API
export const customerSyncApi = {
  syncAll: () => api.post('/customer-sync/sync-all', {}),
  syncIncremental: (days = 3) => api.post(`/customer-sync/sync-incremental?days=${days}`, {}),
  getStatus: () => api.get('/customer-sync/status'),
};

// Customer Feedback API
export const feedbackApi = {
  lookupCustomer: (params: any) => api.post('/customer-feedback/lookup-customer', params),
  getStats: () => api.get('/customer-feedback/stats'),
  search: (params?: any) => api.get('/customer-feedback', { params }),
  getById: (id: string) => api.get(`/customer-feedback/${id}`),
  create: (data: any) => api.post('/customer-feedback', data),
  update: (id: string, data: any) => api.put(`/customer-feedback/${id}`, data),
  addRecord: (id: string, data: any) => api.post(`/customer-feedback/${id}/records`, data),
  sendSms: (id: string, data: { message?: string; sender_name?: string }) =>
    api.post(`/customer-feedback/${id}/send-sms`, data),
  notifyEmployee: (id: string) => api.post(`/customer-feedback/${id}/notify-employee`, {}),
  resolve: (id: string, data: { resolve_detail: string; resolver_name: string }) =>
    api.post(`/customer-feedback/${id}/resolve`, data),
  closeCase: (id: string, data: { close_note: string; closer_name: string; close_notify?: boolean; close_notify_method?: 'sms' | 'line'; close_notify_message?: string }) =>
    api.post(`/customer-feedback/${id}/close-case`, data),
  sendCloseNotify: (id: string, data: { method: 'line' | 'sms'; message: string; sender_name: string }) =>
    api.post(`/customer-feedback/${id}/close-notify`, data),
  addRelation: (id: string, data: {
    employee_id?: string;
    employee_name: string;
    employee_app_number?: string;
    employee_store?: string;
    relation_reason: string;
    created_by?: string;
  }) => api.post(`/customer-feedback/${id}/relations`, data),
  removeRelation: (id: string, relationId: string, operatorName?: string) =>
    api.delete(`/customer-feedback/${id}/relations/${relationId}`, { data: { operator_name: operatorName } }),
  delete: (id: string) => api.delete(`/customer-feedback/${id}`),
  // 員工：查看自己被指派的未結案案件
  getMyAssigned: (employeeId: string) =>
    api.get(`/customer-feedback/my-assigned`, { params: { employee_id: employeeId } }),
  // 員工：新增處理紀錄 + 可標記處理完成
  employeeUpdate: (id: string, data: {
    content: string;
    employee_name: string;
    employee_id?: string;
    mark_resolved?: boolean;
  }) => api.post(`/customer-feedback/${id}/employee-update`, data),
};

// Analytics API
export const analyticsApi = {
  getSummary: (from?: string, to?: string) =>
    api.get('/analytics/summary', { params: { from, to } }),
  getAiSuggestions: (summary: any) =>
    api.post('/analytics/ai-suggest', { summary }),
};

// Service Records API
export const serviceRecordsApi = {
  getStats: () => api.get('/service-records/stats'),
  search: (params?: any) => api.get('/service-records', { params }),
  getById: (id: string) => api.get(`/service-records/${id}`),
  create: (data: any) => api.post('/service-records', data),
  update: (id: string, data: any) => api.put(`/service-records/${id}`, data),
  resolve: (id: string, data: { resolve_detail: string; resolver_name: string }) =>
    api.post(`/service-records/${id}/resolve`, data),
  closeCase: (id: string, data: { close_note: string; closer_name: string }) =>
    api.post(`/service-records/${id}/close`, data),
  addRelation: (id: string, data: any) => api.post(`/service-records/${id}/relations`, data),
  removeRelation: (id: string, relationId: string, operatorName?: string) =>
    api.delete(`/service-records/${id}/relations/${relationId}`, { data: { operator_name: operatorName } }),
  addLog: (id: string, data: any) => api.post(`/service-records/${id}/logs`, data),
  delete: (id: string) => api.delete(`/service-records/${id}`),
};

export default api;
