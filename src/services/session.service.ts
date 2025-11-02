// src/services/session.service.ts

import api from './api';
import { ActiveSession } from '../types/auth.types';
import { AxiosError } from 'axios';

/**
 * 🔐 SERVICIO DE GESTIÓN DE SESIONES
 * 
 * Maneja las operaciones relacionadas con sesiones activas:
 * - Listar todas las sesiones activas (admin)
 * - Revocar sesiones individuales por ID
 * - Listar sesiones del usuario actual (futuro)
 */

/**
 * Obtiene todas las sesiones activas del sistema (ADMIN)
 * @returns Promise con array de sesiones activas
 */
export const getAllActiveSessions = async (): Promise<ActiveSession[]> => {
  try {
    const { data } = await api.get<ActiveSession[]>('/auth/sessions/admin/');
    return data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    console.error(
      'Error fetching active sessions:',
      axiosError.response?.data || axiosError.message
    );
    throw error;
  }
};

/**
 * Revoca una sesión específica por su ID (ADMIN)
 * @param tokenId - ID del token de sesión a revocar
 * @returns Promise<void>
 */
export const revokeSessionById = async (tokenId: number): Promise<void> => {
  try {
    await api.post(`/auth/sessions/${tokenId}/revoke_admin/`);
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    console.error(
      'Error revoking session:',
      axiosError.response?.data || axiosError.message
    );
    throw error;
  }
};

/**
 * Obtiene las sesiones activas del usuario actual
 * @returns Promise con array de sesiones del usuario
 */
export const getCurrentUserSessions = async (): Promise<ActiveSession[]> => {
  try {
    const { data } = await api.get<ActiveSession[]>('/auth/sessions/');
    return data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    console.error(
      'Error fetching user sessions:',
      axiosError.response?.data || axiosError.message
    );
    throw error;
  }
};

/**
 * Cierra todas las sesiones del usuario actual (logout global)
 * @returns Promise<void>
 */
export const logoutAllSessions = async (): Promise<void> => {
  try {
    await api.post('/auth/logout_all/');
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    console.error(
      'Error logging out all sessions:',
      axiosError.response?.data || axiosError.message
    );
    throw error;
  }
};