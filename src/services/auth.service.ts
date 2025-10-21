// src/services/auth.service.ts (CORREGIDO PARA FORM DATA LOGIN)

import api from './api'; // Tu instancia configurada de Axios o cliente HTTP
import Cookies from 'js-cookie'; // Necesitamos js-cookie para leer/borrar el token
import { LoginCredentials, AuthResponse, UserData } from '../types/auth.types'; // Importa UserData

// Función de Login (MODIFICADA)
const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // 1. Crear instancia de URLSearchParams
    const params = new URLSearchParams();

    // 2. Añadir los campos esperados por el backend (username, password)
    //    Asegúrate que LoginCredentials tenga 'username' y 'password'
    params.append('username', credentials.username);
    params.append('password', credentials.password);

    // 3. Realizar la solicitud POST con los params como data
    //    Axios enviará esto como application/x-www-form-urlencoded
    // ✅ CAMBIO: Agregado / al final
    const { data } = await api.post<AuthResponse>('/auth/login/', params);

    // 4. La gestión de la cookie/token se hace en AuthContext/componente,
    //    así que aquí solo devolvemos la respuesta completa.
    return data;

  } catch (error: any) {
    // Mejor loggear el error específico si está disponible
    console.error('Login failed:', error.response?.data || error.message || error);
    throw error; // Re-lanzar para que el componente/context lo maneje
  }
};

// --- FUNCIÓN NUEVA: Obtener Perfil del Usuario Actual ---
// (Sin cambios respecto a tu versión)
const getCurrentUserProfile = async (): Promise<UserData | null> => {
  const token = Cookies.get('token'); // Lee el token desde la cookie
  if (!token) {
    console.log('getCurrentUserProfile: No token found in cookies.');
    return null; // No hay token, no se puede obtener perfil
  }

  try {
    console.log('getCurrentUserProfile: Attempting to fetch profile from /usuarios/me/');
    // Asegúrate que 'api' tenga interceptor para añadir 'Authorization: Bearer <token>'
    // ✅ CAMBIO: Agregado / al final
    const response = await api.get<UserData>('/usuarios/me/'); // Ajusta la ruta si es diferente

    console.log('getCurrentUserProfile: Profile fetched successfully:', response.data);
    return response.data;

  } catch (error: any) {
    console.error("getCurrentUserProfile: Error fetching user profile:", error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
       console.warn("getCurrentUserProfile: Token might be invalid or expired. Removing cookie.");
       Cookies.remove('token');
    }
    return null;
  }
};

// --- FUNCIÓN NUEVA: Logout (limpia la cookie) ---
// (Sin cambios respecto a tu versión)
const logout = () => {
    console.log('authService.logout: Removing token cookie.');
    Cookies.remove('token');
    // Opcional: Llamar a endpoint de logout del backend
    // await api.post('/auth/logout/');
};

// Exportar el objeto del servicio con todas las funciones
export const authService = {
  login,
  getCurrentUserProfile,
  logout
};