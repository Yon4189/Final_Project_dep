import axios from 'axios';

export const MOCK_MODE = false 

const api = axios.create({
  baseURL: 'http://10.161.163.121:8000/api',
    headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper to simulate network delay
export const sleep = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

export default api;