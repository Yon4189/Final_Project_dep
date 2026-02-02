import axios from 'axios';

// flip to false when backend is ready
export const MOCK_MODE = true; 

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Helper to simulate network delay
export const sleep = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

export default api;