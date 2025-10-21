// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',  // ✅ CAMBIO CRÍTICO: Ruta relativa (sin dominio)
  withCredentials: true,
});

export default api;