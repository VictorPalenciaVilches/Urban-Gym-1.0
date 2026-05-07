import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  getQR: () => api.get('/auth/qr-code'),
  validateQR: (token: string) => api.post('/auth/validate-qr', { token }),
};

export const membersApi = {
  getAll: () => api.get('/members'),
  getMe: () => api.get('/members/me'),
  getOne: (id: string) => api.get(`/members/${id}`),
  update: (id: string, data: object) => api.patch(`/members/${id}`, data),
  remove: (id: string) => api.delete(`/members/${id}`),
};

export const classesApi = {
  getAll: () => api.get('/classes'),
};

export const schedulesApi = {
  getAll: () => api.get('/schedules'),
  create: (data: { class_id: string; date: string; start_time: string; available_spots: number }) =>
    api.post('/schedules', data),
  remove: (id: string) => api.delete(`/schedules/${id}`),
  getBookings: (scheduleId: string) => api.get(`/schedules/${scheduleId}/bookings`),
};

export const bookingsApi = {
  create: (schedule_id: string) => api.post('/bookings', { schedule_id }),
  getMy: () => api.get('/bookings/my'),
  cancel: (id: string) => api.delete(`/bookings/${id}`),
  attend: (id: string) => api.patch(`/bookings/${id}/attend`),
};

export const waitlistApi = {
  join: (schedule_id: string) => api.post('/waitlist', { schedule_id }),
  getMy: () => api.get('/waitlist/my'),
  leave: (id: string) => api.delete(`/waitlist/${id}`),
};

export const workoutsApi = {
  getAll: () => api.get('/workouts'),
  getByMember: (memberId: string) => api.get(`/workouts/member/${memberId}`),
  getStats: (memberId: string) => api.get(`/workouts/stats/${memberId}`),
};

export const billingApi = {
  getMyBilling: () => api.get('/billing/me'),
  getMyInvoices: () => api.get('/billing/me/invoices'),
  /** Cambia el plan en BD y genera URL de checkout MercadoPago */
  changePlan: (plan: string) => api.patch('/billing/me/plan', { plan }),
  /** Genera URL de checkout MP sin cambiar plan (para pago inicial) */
  createCheckout: (plan: string) => api.post('/billing/me/checkout', { plan }),
  getRevenue: () => api.get('/billing/admin/revenue'),
  getAllPayments: () => api.get('/billing/admin/payments'),
};

export const progressApi = {
  getMyHistory: () => api.get('/progress/me'),
  getMyStats: () => api.get('/progress/me/stats'),
  getMyRecords: () => api.get('/progress/me/records'),
  getMemberHistory: (memberId: string) => api.get(`/progress/${memberId}`),
  getMemberStats: (memberId: string) => api.get(`/progress/${memberId}/stats`),
  getMemberRecords: (memberId: string) => api.get(`/progress/${memberId}/records`),
};

export const gymsApi = {
  getAll: () => api.get('/gyms'),
  getOpen: () => api.get('/gyms/open'),
  getOne: (id: string) => api.get(`/gyms/${id}`),
  create: (data: object) => api.post('/gyms', data),
  update: (id: string, data: object) => api.patch(`/gyms/${id}`, data),
  remove: (id: string) => api.delete(`/gyms/${id}`),
};

export const equipmentApi = {
  getByGym: (gymId: string) => api.get(`/equipment/gym/${gymId}`),
  getAvailable: (gymId: string) => api.get(`/equipment/gym/${gymId}/available`),
  update: (id: string, data: object) => api.patch(`/equipment/${id}`, data),
  create: (data: object) => api.post('/equipment', data),
  remove: (id: string) => api.delete(`/equipment/${id}`),
};

export const recommendationsApi = {
  getMemberRecommendations: (memberId: string) => api.get(`/recommendations/${memberId}/classes`),
  saveMetrics: (memberId: string, data: { weight_kg: number; height_cm: number; goal: string }) => api.post(`/recommendations/${memberId}/metrics`, data),
  getFitnessPlan: (memberId: string) => api.get(`/recommendations/${memberId}/plan`),
};

export default api;
