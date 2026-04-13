import axios from 'axios';

// Axios instance — all calls go through here so headers are consistent
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request if it exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local storage and redirect to login
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------
// Auth endpoints
// ----------------------------------------------------------------
export const authAPI = {
  register: (data)  => api.post('/auth/register', data),
  login:    (data)  => api.post('/auth/login', data),
  getMe:    ()      => api.get('/auth/me'),
};

// ----------------------------------------------------------------
// Admin endpoints
// ----------------------------------------------------------------
export const adminAPI = {
  addDoctor:   (data) => api.post('/admin/add-doctor', data),
  getDoctors:  ()     => api.get('/admin/doctors'),
  deleteDoctor:(id)   => api.delete(`/admin/doctors/${id}`),
  getPatients: ()     => api.get('/admin/patients'),
  getReports:  ()     => api.get('/admin/reports'),
};

// ----------------------------------------------------------------
// Doctor endpoints
// ----------------------------------------------------------------
export const doctorAPI = {
  getProfile:         ()           => api.get('/doctor/profile'),
  setAvailability:    (data)       => api.post('/doctor/availability', data),
  getAvailability:    ()           => api.get('/doctor/availability'),
  getAppointments:    (params)     => api.get('/doctor/appointments', { params }),
  updateApptStatus:   (id, status) => api.put(`/doctor/appointments/${id}/status`, { status }),
  getCurrentToken:    (date)       => api.get('/doctor/token/current', { params: { date } }),
  callNextToken:      (date)       => api.post('/doctor/token/next', { date }),
};

// ----------------------------------------------------------------
// Patient endpoints
// ----------------------------------------------------------------
export const patientAPI = {
  getProfile:         ()       => api.get('/patient/profile'),
  updateProfile:      (data)   => api.put('/patient/profile', data),
  getMyAppointments:  ()       => api.get('/patient/appointments'),
  getDoctors:         ()       => api.get('/patient/doctors'),
  getDoctorAvailability: (id, date) => api.get(`/patient/doctors/${id}/availability`, { params: { date } }),
};

// ----------------------------------------------------------------
// Appointment endpoints
// ----------------------------------------------------------------
export const appointmentAPI = {
  book:       (data) => api.post('/appointments/book', data),
  reschedule: (id, data) => api.put(`/appointments/reschedule/${id}`, data),
  cancel:     (id)   => api.delete(`/appointments/cancel/${id}`),
  getById:    (id)   => api.get(`/appointments/${id}`),
};

// ----------------------------------------------------------------
// Token queue
// ----------------------------------------------------------------
export const tokenAPI = {
  getQueue: (doctorId, date) => api.get(`/tokens/queue/${doctorId}`, { params: { date } }),
};

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------
export const reportAPI = {
  daily:  (date)       => api.get('/reports/daily', { params: { date } }),
  doctor: (id, params) => api.get(`/reports/doctor/${id}`, { params }),
};

export default api;
