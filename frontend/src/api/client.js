import axios from 'axios';

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  const fallbackUrl = '/api';

  if (!configuredUrl) {
    return fallbackUrl;
  }

  if (/^https?:\/\//i.test(configuredUrl) || configuredUrl.startsWith('/')) {
    return configuredUrl;
  }

  return fallbackUrl;
}
