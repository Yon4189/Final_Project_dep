import api from '../api/axios';

export const getBackendUrl = (path) => {
  if (!path) return '';
  const base = api.defaults.baseURL?.replace('/api', '').replace(/\/+$/, '') || '';
  const cleanPath = path.replace(/^\/+/, '');
  return `${base}/${cleanPath}`;
};