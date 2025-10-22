// src/services/auth.service.ts
import api from './api';
import { LoginCredentials, AuthResponse, UserData } from '../types/auth.types'; // ✅ CORREGIDO: Eliminar ApiError
import { AxiosError } from 'axios';

/**
 * Servicio de autenticación
 * Maneja login, obtención de perfil y logout
 */

/**
 * Login de usuario
 * @param credentials - Credenciales de usuario (username, password)
 * @returns Promise con la respuesta de autenticación
 */
const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // Crear FormData para enviar como application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('username', credentials.username);
    params.append('password', credentials.password);

    // Realizar petición de login
    const { data } = await api.post<AuthResponse>('/auth/login/', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Client-Type': 'web',
      },
    });

    return data;
  } catch (error) {
    const axiosError = error as AxiosError<{ detail?: string }>;
    console.error('Login failed:', axiosError.response?.data || axiosError.message);
    throw error;
  }
};

/**
 * Obtener perfil del usuario actual
 * @returns Promise con los datos del usuario o null si no está autenticado
 */
const getCurrentUserProfile = async (): Promise<UserData | null> => {
  try {
    const response = await api.get<UserData>('/usuarios/me/');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error fetching user profile:', axiosError.response?.data || axiosError.message);
    
    // Si es 401 o 403, el token es inválido
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      console.warn('Token might be invalid or expired');
    }
    
    return null;
  }
};

/**
 * Logout del usuario
 * Llama al endpoint de logout del backend para invalidar el refresh token
 */
const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout/');
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Logout error:', axiosError.response?.data || axiosError.message);
    // Continuar con el logout local aunque falle el servidor
  }
};

/**
 * Refresh del access token
 * Esta función es llamada automáticamente por el interceptor
 * @returns Promise con el nuevo access token
 */
const refreshToken = async (): Promise<string> => {
  try {
    const { data } = await api.post<{ access_token: string }>('/auth/refresh/');
    return data.access_token;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Token refresh failed:', axiosError.response?.data || axiosError.message);
    throw error;
  }
};

// Exportar el servicio de autenticación
export const authService = {
  login,
  getCurrentUserProfile,
  logout,
  refreshToken,
};