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
// BLOQUEO DE CONCURRENCIA GLOBAL (CRÍTICO)
// Esta variable almacenará la promesa del refresh token, previniendo carreras.
// ============================================================================
type RefreshPromise = Promise<string> | null;
let isRefreshingPromise: RefreshPromise = null;

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
	
	// Ref para acceder al estado más reciente
	const authRef = useRef(auth);
	// ✅ NUEVO: Ref para acceder al estado 'loading' más reciente
	const loadingRef = useRef(loading);
	
	// ✅ NUEVO: Ref para asegurar que la inicialización solo corra una vez
	const isInitializedRef = useRef(false);
	
	// Ref para asegurar que el interceptor se monta solo una vez (necesario por las dependencias)
	// Eliminada la referencia manual, usaremos solo el cleanup de useEffect
	
	const failedQueueRef = useRef<Array<{
		resolve: (value: string) => void;
		reject: (reason?: Error) => void;
	}>>([]);

	// Mantener authRef sincronizado con auth
	useEffect(() => {
		authRef.current = auth;
	}, [auth]);

	// ✅ NUEVO: Mantener loadingRef sincronizado con loading
	useEffect(() => {
		loadingRef.current = loading;
	}, [loading]);

	// ============================================================================
	// HELPERS
	// ============================================================================

	/**
	 * Detecta si la URL es de autenticación (login/refresh)
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
				promise.resolve(token);
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
			// 🛑 FIX CRÍTICO: Asegurar que el bloqueo global de refresh se libere al cerrar sesión.
			isRefreshingPromise = null;
			// Limpiar la cola en caso de que haya fallado el refresh
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
		// La dependencia es authRef.current.token, pero como es un objeto, lo sincronizamos
		// con auth y usamos authRef para el valor más reciente sin re-montar el interceptor
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
			// El interceptor se ejecta solo en el desmontaje final, no en re-renders
			api.interceptors.request.eject(requestInterceptor);
		};
	}, [isAuthEndpoint]);

	/**
	 * ✅ INTERCEPTOR DE RESPONSE (CON BLOQUEO DE CONCURRENCIA DENTRO)
	 * FIX: Se reescribe la lógica de montaje para mayor robustez
	 */
	useEffect(() => {
		// No usamos isInterceptorMounted.current, dependemos de que las dependencias
		// del useEffect (que son useCallback) sean estables.
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
					// ✅ LOG CRÍTICO: Para confirmar que el interceptor está funcionando.
					console.warn(`🚨 401 CAPTURADO en ${originalRequest.url}. Iniciando o encolando refresh...`);

					// ------------------------------------------------------------------
					// 1. 🛑 CONTROL DE CONCURRENCIA INTERNO
					if (isRefreshingPromise) {
						console.log('🔄 Refresh ya en curso. Agregando petición a la cola.');
						return new Promise<string>((resolve, reject) => {
							failedQueueRef.current.push({ resolve, reject });
						})
							.then(token => {
								// Reintentar con el nuevo token obtenido de la promesa en curso
								const headers = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
								headers.Authorization = `Bearer ${token}`;
								originalRequest.headers = headers;
								originalRequest._retry = true; // Aseguramos que tenga el retry tag
								return api(originalRequest);
							})
							.catch(err => {
								console.error('Failed queue error:', err);
								// Si la promesa de refresh falló (resultando en logout), esta petición también falla.
								return Promise.reject(err);
							});
					}
					// ------------------------------------------------------------------

					// 2. 🚦 INICIAR NUEVO REFRESH Y PONER BLOQUEO
					originalRequest._retry = true;
					
					// Crea la promesa de refresh y la almacena en la variable global
					isRefreshingPromise = (async () => {
						try {
							console.log('🔄 Access token expirado, iniciando refresh...');
							
							const newToken = await authService.refreshToken();
							
							console.log('✅ Token refrescado exitosamente');

							// Actualizar estado y ref
							const newAuth = { ...authRef.current, token: newToken };
							
							// 🛑 CRÍTICO: Solo actualizamos el estado con setAuth si la fase inicial de carga
							// ha terminado (loadingRef.current === false). Siempre actualizamos la ref.
							if (!loadingRef.current) { 
								setAuth(newAuth);
							}
							authRef.current = newAuth; // Siempre actualizamos la ref para el siguiente request

							// Devolver el nuevo token para el reintento
							return newToken; 
						} catch (refreshError) {
							// ✅ Si falla el refresh (ej: token reused/expired), hacer logout
							const axiosError = refreshError as AxiosError;
							console.error('❌ Token refresh failed, logging out:', axiosError.message);
							
							// Notificar a la cola que falló
							processQueue(new Error('Token refresh failed'), null);
							
							// El doLogout se encarga de limpiar el estado y el bloqueo isRefreshingPromise
							await doLogout(false);
							
							// Relanzar el error para la petición original
							throw refreshError;
						} finally {
							// 6. 🔓 LIBERAR BLOQUEO si falló y no lo hizo doLogout, aunque doLogout ya lo hace,
							// es seguro forzarlo aquí también si el catch no se ejecutó.
							if (isRefreshingPromise !== null) {
								isRefreshingPromise = null;
							}
						}
					})();
					
					// 3. ⏱️ ESPERAR RESULTADO DEL REFRESH BLOQUEADO (Esta promesa se ejecutó arriba, pero se espera aquí)
					try {
						const newToken = await isRefreshingPromise;
						
						// 4. Procesar cola de peticiones pendientes (Solo si el refresh fue exitoso)
						// NOTA: isRefreshingPromise ya se liberó en el finally del async de arriba.
						
						// 5. Reintentar petición original con nuevo token
						const headers = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
						headers.Authorization = `Bearer ${newToken}`;
						originalRequest.headers = headers;
						
						return api(originalRequest);
					} catch (e) {
						// Si el isRefreshingPromise lanza error (el refresh falló), esta petición también falla.
						return Promise.reject(error);
					}
				}

				return Promise.reject(error);
			}
		);

		return () => {
			// Ejectar el interceptor cuando el componente se desmonte o las dependencias cambien
			api.interceptors.response.eject(responseInterceptor);
		};
	// Dependencias son los useCallbacks definidos arriba, que son estables
	}, [isAuthEndpoint, processQueue, doLogout]); 

	// ============================================================================
	// BOOTSTRAP - Verificar sesión al cargar la aplicación (Bloqueado para ejecución única)
	// ============================================================================
// ... (El resto del código de initializeAuth permanece igual)
	useEffect(() => {
		// 🛑 BLOQUEO CRÍTICO: Asegura que la lógica de bootstrap solo se ejecute una vez
		if (isInitializedRef.current) {
			return;
		}
		isInitializedRef.current = true; // Set block early

		// REMOVIDA: La lógica de `cancelled` ya no es necesaria, dependemos solo de `isInitializedRef`.
		
		const initializeAuth = async () => {
			try {
				// ------------------ LOGGING EXTREMO PARA DEPURAR ------------------
				console.log('🔍 1. Verificando sesión existente (Bootstrap)...'); 
				
				// Paso 2: Ejecuta el refresh. El backend devuelve 200 OK.
				const newToken = await authService.refreshToken(); 

                // LOG DE VERIFICACIÓN CRÍTICA (Debe aparecer si el await tuvo éxito)
                console.log('✅ 1.5. Refresh Token Promesa Resuelta. Continuando...'); 
				
				// --- NUEVO LOG DE DEBUG PARA CAPTURAR EL ESTADO DE CANCELACIÓN ---
				console.log(`Debug: Flujo de inicialización continua. Next: ➡️ 2.`);
                
                // PASO CLAVE PARA LA CORRECCIÓN: Evitar el re-render intermedio
				
				// Paso 4: Intenta obtener el perfil usando el NUEVO token, pasándolo manualmente
                // FIX: Cambiar la URL de '/api/v1/auth/me/' a '/auth/me/' para evitar la duplicación de '/api/v1/'
                // causada por la `baseURL` de axios.
                console.log(`➡️ 2. Token de Acceso recibido. Intentando obtener perfil en /me/ con token: ${newToken.substring(0, 10)}...`); 
				
				// Reemplazamos authService.getCurrentUserProfile() con una llamada directa
                // usando el newToken para asegurar que el interceptor no falle al buscarlo en el estado.
				const { data: userData } = await api.get<UserData>('/auth/me/', {
                    headers: {
                        Authorization: `Bearer ${newToken}`,
                    },
                });
				
				if (userData) {
                    // Paso 5: Autenticación completa (ACTUALIZACIÓN ATÓMICA DE ESTADO)
					const newAuth = { token: newToken, user: userData };
					setAuth(newAuth);
					authRef.current = newAuth;
					console.log('✅ 3. Perfil de usuario obtenido. Autenticación completa para:', userData.nombre_usuario);
				} else {
                    // Si el /me/ no devuelve datos (falla), forzamos logout.
                    console.log('❌ 4. Fallo al obtener perfil de usuario con token fresco. Redirigiendo a login.');
                    await doLogout(false);
				}
			} catch (error) {
				const axiosError = error as AxiosError;
				// Si el error es una instancia de Error lanzada por nosotros, podemos usar su mensaje
				const errorMessage = error instanceof Error ? error.message : axiosError.message;
				console.log('ℹ️ 5. Error en el proceso de inicialización (Refresh, /me/ falló):', errorMessage);
                // Si el refreshToken o /me/ falla, limpiamos la sesión local.
                await doLogout(false);
			} finally {
				// 6. Garantía de finalización
				setLoading(false); 
				console.log('🏁 6. Proceso de inicialización finalizado.');
			}
		};

		initializeAuth();
		
	}, []); // FIX: Dependencia vacía para garantizar una única ejecución del efecto.

	// ============================================================================
	// FUNCIONES PÚBLICAS
	// ============================================================================
// ... (El resto del código permanece igual)
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
			//... (otros sinónimos)
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
