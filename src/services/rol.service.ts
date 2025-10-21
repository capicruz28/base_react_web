import apiClient from './api';
import { getErrorMessage } from './error.service';
import {
  PaginatedRolResponse,
  Rol,
  RolCreateData,
  RolUpdateData
} from '../types/rol.types';

const API_URL = '/roles'; // Ruta base para los endpoints de roles en la API

/**
 * Obtiene TODOS los roles activos (sin paginación).
 * Ideal para listas desplegables.
 * @returns Promise<Rol[]> Lista de roles activos.
 */
export const getAllActiveRoles = async (): Promise<Rol[]> => {
  try {
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.get<Rol[]>(`${API_URL}/all-active/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all active roles:", error);
    throw getErrorMessage(error);
  }
};

/**
 * Obtiene una lista paginada de roles desde el backend.
 * @param page Número de página.
 * @param limit Límite de roles por página.
 * @param search Término de búsqueda opcional.
 * @returns Promise<PaginatedRolResponse>
 */
export const getRoles = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<PaginatedRolResponse> => {
  try {
    const params: { [key: string]: any } = { page, limit };
    if (search) {
      params.search = search;
    }
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.get<PaginatedRolResponse>(`${API_URL}/`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw getErrorMessage(error);
  }
};

/**
 * Crea un nuevo rol.
 * @param rolData Datos del rol a crear.
 * @returns Promise<Rol> El rol creado.
 */
export const createRol = async (rolData: RolCreateData): Promise<Rol> => {
  try {
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.post<Rol>(`${API_URL}/`, rolData);
    return response.data;
  } catch (error) {
    console.error("Error creating rol:", error);
    throw getErrorMessage(error);
  }
};

/**
 * Actualiza un rol existente.
 * @param rolId ID del rol a actualizar.
 * @param rolData Datos del rol a actualizar.
 * @returns Promise<Rol> El rol actualizado.
 */
export const updateRol = async (rolId: number, rolData: RolUpdateData): Promise<Rol> => {
  try {
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.put<Rol>(`${API_URL}/${rolId}/`, rolData);
    return response.data;
  } catch (error) {
    console.error(`Error updating rol ${rolId}:`, error);
    throw getErrorMessage(error);
  }
};

/**
 * Desactiva un rol (borrado lógico).
 * @param rolId ID del rol a desactivar.
 * @returns Promise<Rol> El rol desactivado.
 */
export const deactivateRol = async (rolId: number): Promise<Rol> => {
  try {
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.delete<Rol>(`${API_URL}/${rolId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deactivating rol ${rolId}:`, error);
    throw getErrorMessage(error);
  }
};

/**
 * Reactiva un rol inactivo.
 * @param rolId ID del rol a reactivar.
 * @returns Promise<Rol> El rol reactivado.
 */
export const reactivateRol = async (rolId: number): Promise<Rol> => {
  try {
    // ✅ CAMBIO: Agregar / al final
    const response = await apiClient.post<Rol>(`${API_URL}/${rolId}/reactivate/`);
    return response.data;
  } catch (error) {
    console.error(`Error reactivating rol ${rolId}:`, error);
    throw getErrorMessage(error);
  }
};