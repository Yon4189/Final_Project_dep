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

export default api;