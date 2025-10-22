// src/context/AuthContext.tsx
import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useMemo, 
  useState, 
  useRef, 
  ReactNode,
  useCallback,
} from 'react';
import api from '../services/api';
import { authService } from '../services/auth.service';
import type {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from 'axios';
import type { AuthResponse, UserData } from '../types/auth.types';

// ============================================================================
// TIPOS
// ============================================================================

type AuthState = { 
  user: UserData | null; 
  token: string | null;
};

interface AuthContextType {
  auth: AuthState;
  setAuthFromLogin: (response: AuthResponse) => UserData | null;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  hasRole: (...roles: string[]) => boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const initialAuth: AuthState = { user: null, token: null };

const AuthContext = createContext<AuthContextType>({
  auth: initialAuth,
  setAuthFromLogin: () => null,
  logout: async () => {},
  isAuthenticated: false,
  loading: true,
  hasRole: () => false,
});

// ============================================================================
// PROVIDER
// ============================================================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const [loading, setLoading] = useState(true);
  
  // Refs para acceder al estado más reciente en los interceptores
  const authRef = useRef(auth);
  const isRefreshingRef = useRef(false);
  
  // ✅ CORREGIDO: Tipo correcto para la cola
  const failedQueueRef = useRef<Array<{
    resolve: (value: string) => void; // ✅ CORREGIDO: Eliminar "undefined"
    reject: (reason?: Error) => void;
  }>>([]);

  // Mantener authRef sincronizado con auth
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Detecta si la URL es de autenticación (login/refresh)
   * Estas URLs no deben incluir el token en el header
   */
  const isAuthEndpoint = useCallback((url?: string): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase();
    return cleanUrl.includes('/auth/refresh') || 
           cleanUrl.includes('/auth/login');
  }, []);

  /**
   * Procesa la cola de peticiones fallidas después de un refresh exitoso
   */
  const processQueue = useCallback((error: Error | null = null, token: string | null = null) => {
    failedQueueRef.current.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else if (token) {
        promise.resolve(token); // ✅ CORREGIDO: Siempre pasar string, no undefined
      }
    });
    failedQueueRef.current = [];
  }, []);

  /**
   * Realiza el logout (local y servidor)
   */
  const doLogout = useCallback(async (callServer = true) => {
    try {
      if (callServer) {
        await authService.logout();
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Logout error:', axiosError.message);
    } finally {
      setAuth(initialAuth);
      authRef.current = initialAuth;
      processQueue(new Error('Session expired'), null);
    }
  }, [processQueue]);

  // ============================================================================
  // INTERCEPTORES
  // ============================================================================

  /**
   * ✅ INTERCEPTOR DE REQUEST
   * Agrega el token de autorización a todas las peticiones (excepto login/refresh)
   */
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const headers = (config.headers ?? {}) as AxiosRequestHeaders;
        const currentToken = authRef.current.token;
        
        // Solo agregar token si existe y no es endpoint de auth
        if (currentToken && !isAuthEndpoint(config.url)) {
          headers.Authorization = `Bearer ${currentToken}`;
        }
        
        config.headers = headers;
        return config;
      },
      (error: AxiosError) => {
        console.error('Request interceptor error:', error.message);
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [isAuthEndpoint]);

  /**
   * ✅ INTERCEPTOR DE RESPONSE
   * Maneja errores 401 y realiza refresh automático del token
   */
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { 
          _retry?: boolean 
        }) | undefined;
        
        // Si no hay config o es endpoint de auth, rechazar directamente
        if (!originalRequest || isAuthEndpoint(originalRequest.url)) {
          return Promise.reject(error);
        }

        // Si es 401 y no se ha reintentado
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Si ya se está refrescando, agregar a la cola
          if (isRefreshingRef.current) {
            return new Promise<string>((resolve, reject) => {
              failedQueueRef.current.push({ resolve, reject });
            })
              .then(token => {
                const headers = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
                headers.Authorization = `Bearer ${token}`;
                originalRequest.headers = headers;
                return api(originalRequest);
              })
              .catch(err => {
                console.error('Failed queue error:', err);
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshingRef.current = true;

          try {
            // ✅ Intentar refresh del token
            console.log('🔄 Access token expirado, refrescando...');
            const newToken = await authService.refreshToken();
            console.log('✅ Token refrescado exitosamente');

            // Actualizar estado y ref
            const newAuth = { ...authRef.current, token: newToken };
            setAuth(newAuth);
            authRef.current = newAuth;

            // Procesar cola de peticiones pendientes
            processQueue(null, newToken);

            // Reintentar petición original con nuevo token
            const headers = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
            headers.Authorization = `Bearer ${newToken}`;
            originalRequest.headers = headers;

            return api(originalRequest);
          } catch (refreshError) {
            // ✅ Si falla el refresh, hacer logout
            const axiosError = refreshError as AxiosError;
            console.error('❌ Token refresh failed, logging out:', axiosError.message);
            processQueue(new Error('Token refresh failed'), null);
            await doLogout(false);
            return Promise.reject(refreshError);
          } finally {
            isRefreshingRef.current = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [isAuthEndpoint, processQueue, doLogout]);

  // ============================================================================
  // BOOTSTRAP - Verificar sesión al cargar la aplicación
  // ============================================================================

  useEffect(() => {
    let cancelled = false;
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Verificando sesión existente...');
        // Intentar refresh para verificar si hay sesión activa
        const newToken = await authService.refreshToken();

        if (cancelled) return;
        
        console.log('✅ Sesión activa encontrada, obteniendo datos del usuario...');
        // Obtener datos del usuario desde /auth/me/
        const meResp = await api.get<UserData>('/auth/me/', {
          headers: { Authorization: `Bearer ${newToken}` },
        });

        if (cancelled) return;
        
        if (meResp.data) {
          const newAuth = { token: newToken, user: meResp.data };
          setAuth(newAuth);
          authRef.current = newAuth;
          console.log('✅ Usuario autenticado:', meResp.data.nombre_usuario);
        } else {
          setAuth(initialAuth);
          authRef.current = initialAuth;
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        console.log('ℹ️ No hay sesión activa:', axiosError.message);
        if (!cancelled) {
          setAuth(initialAuth);
          authRef.current = initialAuth;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================================
  // FUNCIONES PÚBLICAS
  // ============================================================================

  /**
   * Establece la autenticación después del login
   */
  const setAuthFromLogin = useCallback((response: AuthResponse): UserData | null => {
    if (!response?.access_token || !response?.user_data) {
      console.error('❌ Respuesta de login inválida');
      setAuth(initialAuth);
      authRef.current = initialAuth;
      return null;
    }
    
    const newAuth = { token: response.access_token, user: response.user_data };
    setAuth(newAuth);
    authRef.current = newAuth;
    console.log('✅ Login exitoso:', response.user_data.nombre_usuario);
    return response.user_data;
  }, []);

  /**
   * Cierra la sesión del usuario
   */
  const logout = useCallback(async () => {
    console.log('🚪 Cerrando sesión...');
    await doLogout(true);
    console.log('✅ Sesión cerrada');
  }, [doLogout]);

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   */
  const hasRole = useCallback((...roles: string[]): boolean => {
    if (!authRef.current.user?.roles?.length) return false;
    
    const userRoles = new Set(authRef.current.user.roles.map(r => r.toLowerCase()));
    
    // Sinónimos de roles (admin = administrador)
    const getRoleSynonyms = (role: string): string[] => {
      const normalized = role.toLowerCase();
      if (normalized === 'admin' || normalized === 'administrador') {
        return ['admin', 'administrador'];
      }
      return [normalized];
    };
    
    return roles.some(role => 
      getRoleSynonyms(role).some(synonym => userRoles.has(synonym))
    );
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<AuthContextType>(
    () => ({
      auth,
      setAuthFromLogin,
      logout,
      isAuthenticated: !!auth.token && !!auth.user,
      loading,
      hasRole,
    }),
    [auth, loading, setAuthFromLogin, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};