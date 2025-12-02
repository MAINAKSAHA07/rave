import axios from 'axios';
import { getPocketBase } from './pocketbase';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const pb = getPocketBase();
  if (pb.authStore.token) {
    config.headers.Authorization = `Bearer ${pb.authStore.token}`;
  }
  return config;
});

// Handle 401 errors by refreshing token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const pb = getPocketBase();
        // Try to refresh the token
        await pb.collection('users').authRefresh();
        
        // Update the authorization header with new token
        originalRequest.headers.Authorization = `Bearer ${pb.authStore.token}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth and redirect to login
        const pb = getPocketBase();
        pb.authStore.clear();
        
        // Only redirect if not already on login page
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const adminApi = {
  getApplications: (status?: string) =>
    api.get('/admin/organizers/applications', { params: { status } }),
  getOrganizers: (status?: string) =>
    api.get('/admin/organizers', { params: { status } }),
  getOrganizer: (organizerId: string) =>
    api.get(`/admin/organizers/${organizerId}`),
  approveApplication: (applicationId: string) =>
    api.post(`/admin/organizers/${applicationId}/approve`),
  rejectApplication: (applicationId: string, reviewNotes?: string) =>
    api.post(`/admin/organizers/${applicationId}/reject`, { reviewNotes }),
  forceCancelEvent: (eventId: string, reason: string) =>
    api.post(`/admin/events/${eventId}/cancel`, { reason }),
  forceRefundOrder: (orderId: string, reason: string, amount?: number) =>
    api.post(`/admin/orders/${orderId}/refund`, { reason, amount }),
  getEvents: () => api.get('/admin/events'),
  getOrders: (params?: { eventId?: string; status?: string; limit?: number }) =>
    api.get('/admin/orders', { params }),
  confirmCashOrder: (orderId: string) =>
    api.post(`/admin/orders/${orderId}/confirm-cash`),
  getTickets: (params?: { orderId?: string; eventId?: string; status?: string; limit?: number }) =>
    api.get('/admin/tickets', { params }),
  checkinTicket: (ticketId: string) =>
    api.post(`/admin/tickets/${ticketId}/checkin`),
  cancelTicket: (ticketId: string, reason?: string) =>
    api.post(`/admin/tickets/${ticketId}/cancel`, { reason }),
  getStats: () => api.get('/admin/stats'),
  // User management (Super Admin only)
  getUsers: (params?: { role?: string; limit?: number }) =>
    api.get('/admin/users', { params }),
  createUser: (userData: { 
    email: string; 
    password: string; 
    name: string; 
    role: string; 
    backoffice_access?: boolean; 
    can_manage_roles?: boolean;
    organizer_id?: string;
  }) =>
    api.post('/admin/users', userData),
  updateUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
  toggleUserBlock: (userId: string, blocked: boolean) =>
    api.patch(`/admin/users/${userId}/block`, { blocked }),
  updateBackofficeAccess: (userId: string, backoffice_access: boolean, can_manage_roles?: boolean, notes?: string) =>
    api.patch(`/admin/users/${userId}/backoffice`, { backoffice_access, can_manage_roles, notes }),
};

export const checkinApi = {
  scan: (ticketCode: string, eventId: string, checkedInBy: string) =>
    api.post('/checkin/scan', { ticketCode, eventId, checkedInBy }),
  getStats: (eventId: string) => api.get(`/checkin/stats/${eventId}`),
};

export const refundsApi = {
  requestRefund: (orderId: string, amountMinor: number, reason: string, requestedBy: string) =>
    api.post('/refunds', { orderId, amountMinor, reason, requestedBy }),
  getRefunds: (params?: { organizerId?: string; status?: string }) =>
    api.get('/refunds', { params }),
};

export default api;

  requestRefund: (orderId: string, amountMinor: number, reason: string, requestedBy: string) =>
    api.post('/refunds', { orderId, amountMinor, reason, requestedBy }),
  getRefunds: (params?: { organizerId?: string; status?: string }) =>
    api.get('/refunds', { params }),
};

export default api;
