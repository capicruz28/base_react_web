// src/services/auth.service.ts
import api from './api';
import { LoginCredentials, AuthResponse, UserData } from '../types/auth.types';
import { AxiosError, AxiosRequestConfig } from 'axios';

// Definición de tipo para la configuración de la petición con la propiedad _retry
// que usamos en el interceptor, aunque no la necesitemos aquí.
interface RefreshRequestConfig extends AxiosRequestConfig {
    _retry?: boolean;
}

/**
 * Servicio de autenticación
 * Este servicio asume que el Refresh Token es manejado automáticamente
 * por el navegador a través de cookies HttpOnly (debido a withCredentials: true en api.ts).
 */

/**
 * Login de usuario
 * @param credentials - Credenciales de usuario (username, password)
 * @returns Promise con la respuesta de autenticación (debería incluir Access Token)
 */
const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
	try {
		// Crear FormData para enviar como application/x-www-form-urlencoded
		const params = new URLSearchParams();
		params.append('username', credentials.username);
		params.append('password', credentials.password);

		// Realizar petición de login. El Refresh Token se recibe como cookie HttpOnly.
		const { data } = await api.post<AuthResponse>('/auth/login/', params, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-Client-Type': 'web',
			},
		});

		// Debería devolver el access_token y user_data
		return data;
	} catch (error) {
		const axiosError = error as AxiosError<{ detail?: string }>;
		console.error('Login failed:', axiosError.response?.data || axiosError.message);
		throw error;
	}
};

/**
 * Obtener perfil del usuario actual desde /auth/me/
 * El Access Token es inyectado por el Request Interceptor en AuthContext.
 * @returns Promise con los datos del usuario o null si no está autenticado.
 */
const getCurrentUserProfile = async (): Promise<UserData | null> => {
	try {
		const response = await api.get<UserData>('/auth/me/');
		return response.data;
	} catch (error) {
		const axiosError = error as AxiosError;
		console.error('Error fetching user profile:', axiosError.response?.data || axiosError.message);
		
		// Si es 401 o 403, el token es inválido. Retornar null para que el AuthContext
		// sepa que la sesión falló y debe limpiar el estado (si es que no lo ha hecho ya).
		if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
			console.warn('Token might be invalid or expired. Returning null.');
			return null;
		}
		
		// Para cualquier otro error (ej: 500, network), lanzar el error
		throw error;
	}
};

/**
 * Logout del usuario
 * Llama al endpoint de logout del backend para invalidar las cookies del refresh token.
 */
const logout = async (): Promise<void> => {
	try {
		await api.post('/auth/logout/', {}, {
			headers: {
				'X-Client-Type': 'web',
			},
		});
	} catch (error) {
		const axiosError = error as AxiosError;
		console.error('Logout error:', axiosError.response?.data || axiosError.message);
		// Continuar con el logout local aunque falle el servidor
	}
};

/**
 * Refresh del access token
 * El Refresh Token se envía automáticamente por cookies HttpOnly.
 * @returns Promise con el nuevo access token
 */
const refreshToken = async (): Promise<string> => {
	// No necesitamos enviar el Refresh Token explícitamente, Axios lo hace.
	try {
        // ✅ CORREGIDO: Usamos el tipo inferido '{ access_token: string }' para la respuesta
        // y el tipo 'RefreshRequestConfig' para la configuración para solucionar los errores.
		const { data } = await api.post<{ access_token: string }>('/auth/refresh/', {}, {
			headers: {
				'X-Client-Type': 'web',
			},
            // Usamos una aserción de tipo para la configuración temporal
            _retry: true 
		} as RefreshRequestConfig); // Añadir aserción de tipo aquí
		
		// Si el backend es exitoso, solo devuelve el nuevo Access Token
		return data.access_token;
	} catch (error) {
		const axiosError = error as AxiosError;
        // Si el refresh falla (ej: cookie expirada o invalidada por el servidor)
        // PROPAGAMOS el error para que el AuthContext lo capture y fuerce el logout.
		console.error('Token refresh failed (Cookie issue):', axiosError.response?.data || axiosError.message);
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
