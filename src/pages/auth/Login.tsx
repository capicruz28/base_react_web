// src/pages/auth/Login.tsx (Refinado)

import React, { useState } from 'react'; // Importar React si usas JSX explícito (aunque no es necesario con > React 17)
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader } from 'lucide-react'; // Asumiendo iconos disponibles
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta
import { authService } from '../../services/auth.service'; // Ajusta la ruta
import { getErrorMessage } from '../../services/error.service'; // Ajusta la ruta
import { LoginCredentials, UserData } from '../../types/auth.types'; // Ajusta la ruta

const Login: React.FC = () => { // Añadir tipo explícito React.FC
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthFromLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginCredentials>({
    username: '',
    password: '',
  });

  // Determinar la ruta de destino después del login
  const from = location.state?.from?.pathname; // Página desde la que se llegó a /login (si aplica)
  const defaultHome = "/home"; // Página por defecto para usuarios normales
  const adminHome = "/admin/usuarios"; // Página por defecto para administradores

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    setLoading(true);

    try {
      // 1. Llamar al servicio de login
      const authResponse = await authService.login(formData);

      // 2. Actualizar el estado global de autenticación usando setAuth del contexto.
      //    setAuth guarda el token en cookie, actualiza el estado y devuelve UserData si tiene éxito.
      const userData: UserData | null = setAuthFromLogin(authResponse);

      // 3. Verificar si setAuth fue exitoso (userData no es null)
      if (userData) {
        toast.success('¡Bienvenido!', { duration: 3000, position: 'top-right' });

        // 4. Determinar la ruta de redirección basada en roles
        const userRoles = userData.roles || []; // Asegurarse de que roles sea un array
        let destination: string;

        if (userRoles.includes('Administrador')) {
          // Si es admin, redirigir a la página principal de admin
          destination = adminHome;
          console.log('Admin user detected, navigating to', destination);
        } else {
          // Si no es admin, redirigir a la página de origen ('from') si existe y no es /login o /unauthorized,
          // de lo contrario, redirigir a la página principal por defecto.
          destination = (from && from !== '/login' && from !== '/unauthorized') ? from : defaultHome;
          console.log(`Normal user detected, navigating to ${destination} (from: ${from})`);
        }

        // 5. Realizar la redirección
        navigate(destination, { replace: true }); // replace: true evita que el usuario vuelva a /login con el botón "atrás"

      } else {
        // Esto ocurriría si setAuth detecta una respuesta inválida de la API
        console.error("Login page: setAuth did not return user data, likely due to invalid API response passed to it.");
        toast.error('Error al procesar la respuesta del servidor.', { duration: 4000, position: 'top-right' });
      }

    } catch (error: any) {
      // Capturar errores de la llamada a authService.login (ej. 401 Unauthorized, 500 Server Error)
      const errorData = getErrorMessage(error); // Usar tu helper para extraer el mensaje
      console.error("Login page caught error during authService.login:", errorData, error);
      toast.error(errorData.message || 'Credenciales incorrectas o error del servidor.', {
        duration: 4000,
        position: 'top-right',
      });
    } finally {
      setLoading(false); // Asegurarse de quitar el estado de carga
    }
  };

  // --- JSX del formulario (sin cambios significativos, asumiendo que el estilo es correcto) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg"> {/* Añadido padding y fondo */}
        <div className="text-center">
          <img
            src="/fidesof.png" // Asegúrate que esta imagen exista en public/
            alt="Ilustración de Login"
            className="h-15 w-auto mx-auto mb-6" // Ajustado tamaño y margen
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate> {/* Añadido noValidate */}
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="username" className="sr-only">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" // Redondeado completo
                placeholder="Nombre de usuario"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10" // Redondeado completo y padding
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" // Añadido hover
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out" // Añadida transición
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-3" aria-hidden="true" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;