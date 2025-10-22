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