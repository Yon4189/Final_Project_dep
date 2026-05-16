import api from '../api/axios';

export const getBackendUrl = (path) => {
  if (!path) return '';
  if (path.toString().startsWith('http')) return path;
  
  const base = api.defaults.baseURL?.split('/api')[0] || '';
  const cleanPath = path.toString().replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
};