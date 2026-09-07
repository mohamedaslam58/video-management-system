import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

function getTokens() {
  return {
    accessToken: localStorage.getItem('vms_access_token'),
    refreshToken: localStorage.getItem('vms_refresh_token'),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('vms_access_token', accessToken);
  localStorage.setItem('vms_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('vms_access_token');
  localStorage.removeItem('vms_refresh_token');
}

api.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken } = getTokens();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refreshToken })
          .then((res) => {
            setTokens(res.data.accessToken, res.data.refreshToken);
            return res.data.accessToken;
          })
          .catch(() => {
            clearTokens();
            window.location.href = '/login';
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
