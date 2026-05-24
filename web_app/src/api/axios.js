import axios from 'axios';

// Use production API if available, otherwise fallback to local IP detection
const isProduction = import.meta.env.PROD;
const apiUrl = import.meta.env.VITE_API_BASE_URL 
  || (isProduction ? 'https://pushchair-improve-valium.ngrok-free.dev/api/v1' : `http://${window.location.hostname}:8000/api/v1`);

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  }
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    if (error.response && error.response.status === 503 && !window.location.pathname.startsWith('/admin')) {
      window.location.href = '/maintenance';
    }
    return Promise.reject(error);
  }
);

export default api;