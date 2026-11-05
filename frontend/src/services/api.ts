import axios from 'axios';

const envUrl = (import.meta as any).env?.VITE_API_URL;
const apiBase = envUrl ? `${envUrl.replace(/\/$/, '')}/api` : '/api';

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

