// src/services/error.service.ts
import { ApiError } from '../types/auth.types';
import axios, { AxiosError } from 'axios'; // Importar AxiosError para tipado más preciso

// Interfaz para la estructura esperada del error de FastAPI
interface FastAPIErrorDetail {
  detail: string | { msg: string; type: string }[]; // Puede ser string o una lista de errores de validación Pydantic
}

export const getErrorMessage = (error: unknown): ApiError => {
  // Primero, verificar si es un error de Axios
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<FastAPIErrorDetail>; // Tipar la data esperada

    if (axiosError.response) {
      // Error de respuesta del servidor (4xx, 5xx)
      const status = axiosError.response.status;
      let message = 'Error desconocido del servidor.'; // Mensaje por defecto

      // --- PRIORIDAD 1: Usar el 'detail' del backend si existe ---
      if (axiosError.response.data?.detail) {
        const detail = axiosError.response.data.detail;
        if (typeof detail === 'string') {
          message = detail; // Usar el mensaje string directamente
        } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
          // Si es un array de errores de validación Pydantic, tomar el primero
          message = detail[0].msg;
        }
        // Podrías añadir lógica para manejar múltiples errores de validación si quisieras
      } else {
        // --- PRIORIDAD 2: Mensajes genéricos por status si no hay 'detail' ---
        switch (status) {
          case 400:
            message = 'Solicitud incorrecta. Verifica los datos enviados.';
            break;
          case 401:
            message = 'No autorizado. Credenciales inválidas o sesión expirada.';
            break;
          case 403:
            message = 'Acceso prohibido. No tienes permiso para realizar esta acción.';
            break;
          case 404:
            message = 'El recurso solicitado no fue encontrado.';
            break;
          case 409: // <-- Añadir caso específico para Conflict
            message = 'Conflicto. El recurso ya existe o hay un problema de duplicidad.'; // Mensaje genérico si detail falló
            break;
          case 500:
            message = 'Error interno del servidor. Inténtalo de nuevo más tarde.';
            break;
          // Puedes añadir más casos si es necesario
        }
      }

      return { message, status };

    } else if (axiosError.request) {
      // Error de conexión (no hubo respuesta)
      return {
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        status: 0 // O algún código que represente error de red
      };
    }
  }

  // Si no es un error de Axios o es otro tipo de error
  console.error("Error no manejado por Axios:", error); // Loggear el error original
  return {
    message: 'Ocurrió un error inesperado en la aplicación.',
    status: 0 // O algún código genérico de error de cliente
  };
};