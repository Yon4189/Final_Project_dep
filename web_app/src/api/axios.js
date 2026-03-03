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

//  ADD THIS INTERCEPTOR - adds token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

//  OPTIONAL: Add response interceptor for handling 401 errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // token expired or invalid
      localStorage.removeItem('admin_token');
      // redirect to login page if not already there
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;