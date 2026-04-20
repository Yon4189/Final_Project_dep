import axios from 'axios';

// Detect the current IP from the browser's address bar
const host = window.location.hostname;

const api = axios.create({
  // This automatically switches between localhost (for him) 
  // and the Network IP (for your phone/testing)
  baseURL: `http://${host}:8000/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
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