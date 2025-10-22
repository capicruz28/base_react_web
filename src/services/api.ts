// src/services/api.ts
import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true, // Importante para enviar cookies HttpOnly
  timeout: 30000, // 30 segundos timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'web', // ✅ NUEVO: Identificar cliente como web
  },
});

export default api;