// src/types/auth.types.ts
import { AxiosError } from 'axios';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserData {
  usuario_id: number;
  nombre_usuario: string;
  correo: string;
  nombre: string;
  apellido: string;
  es_activo: boolean;
  roles: string[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_data: UserData;
}

export interface AuthState {
  user: UserData | null;
  token: string | null;
}

// ✅ Interfaz para errores de API
export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  status?: number;
}

// ✅ Tipo para errores de Axios con respuesta tipada
export type ApiError = AxiosError<ApiErrorResponse>;

// ============================================================================
// 🆕 TIPOS PARA GESTIÓN DE SESIONES ACTIVAS
// ============================================================================

/**
 * Sesión activa en el sistema
 * Representa un refresh token activo asociado a un usuario
 */
export interface ActiveSession {
  token_id: number;
  usuario_id: number;
  nombre_usuario: string;
  nombre: string;
  apellido: string;
  client_type: 'web' | 'mobile';
  ip_address: string | null;
  created_at: string; // ISO 8601 timestamp
  expires_at: string; // ISO 8601 timestamp
}

/**
 * Respuesta de revocación de sesión
 */
export interface RevokeSessionResponse {
  message: string;
  token_id?: number;
}

/**
 * Respuesta de logout global
 */
export interface LogoutAllSessionsResponse {
  message: string;
  sessions_closed?: number;
}