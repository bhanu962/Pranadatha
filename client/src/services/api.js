/**
 * API Service Layer
 * Centralized Axios instance with interceptors for auth and error handling
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor: attach JWT ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: handle 401 ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth API ─────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
}

// ── Donor API ─────────────────────────────────────────────────────────────
export const donorApi = {
  getAll: (params) => api.get('/donors', { params }),
  search: (params) => api.get('/donors/search', { params }),
  getById: (id) => api.get(`/donors/${id}`),
  toggleAvailability: () => api.put('/donors/toggle-availability'),
  getDonationHistory: (params) => api.get('/donors/my/donations', { params }),
  getLeaderboard: () => api.get('/donors/leaderboard'),
  recordDonation: (data) => api.post('/donors/record-donation', data),
}

// ── Blood Request API ─────────────────────────────────────────────────────
export const requestApi = {
  create: (data) => api.post('/requests', data),
  getAll: (params) => api.get('/requests', { params }),
  getNearby: (params) => api.get('/requests/nearby', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  getMyRequests: () => api.get('/requests/user/my-requests'),
  respond: (id) => api.put(`/requests/${id}/respond`),
  fulfill: (id, data) => api.put(`/requests/${id}/fulfill`, data),
  cancel: (id) => api.delete(`/requests/${id}`),
}

// ── Notification API ──────────────────────────────────────────────────────
export const notificationApi = {
  getPublicKey: () => api.get('/notifications/public-key'),
  subscribe: (data) => api.post('/notifications/subscribe', data),
  unsubscribe: (data) => api.delete('/notifications/unsubscribe', { data }),
  test: () => api.post('/notifications/test'),
}

// ── Camp API ──────────────────────────────────────────────────────────────
export const campApi = {
  getAll: (params) => api.get('/camps', { params }),
  getNearby: (params) => api.get('/camps/nearby', { params }),
  getById: (id) => api.get(`/camps/${id}`),
  create: (data) => api.post('/camps', data),
  register: (id) => api.post(`/camps/${id}/register`),
  sendReminders: (id) => api.post(`/camps/${id}/reminders`),
}

// ── Admin API ─────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getGeographic: () => api.get('/admin/geographic'),
  toggleUserActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
  moderateRequest: (id, action) => api.put(`/admin/requests/${id}/moderate`, { action }),
}
