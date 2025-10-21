// src/types/auth.types.ts (MODIFICADO)

export interface LoginCredentials {
  username: string;
  password: string;
}

// --- Interfaz UserData MODIFICADA ---
export interface UserData {
  usuario_id: number;
  nombre_usuario: string; // Asumo que este es el 'username' para login
  correo: string;
  nombre: string;
  apellido: string;
  es_activo: boolean;
  roles: string[]; // <-- CAMBIO PRINCIPAL: Añadir array de roles
}
// ----------------------------------

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_data: UserData; // Ahora espera que user_data incluya 'roles'
}

export interface AuthState {
  user: UserData | null; // El tipo de 'user' ahora incluye 'roles'
  token: string | null;
}

export interface ApiError {
  message: string;
  status: number;
  details?: string;
}

// (Opcional pero recomendado) Puedes renombrar LoginCredentials a LoginPayload si prefieres
// export type LoginPayload = LoginCredentials;