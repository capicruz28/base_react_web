import api from './api';
import type { PermissionState } from '../types/permission.types';

interface BackendPermissionItemGetResponse {
  menu_id: number;
  puede_ver: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
  rol_menu_id: number;
  rol_id: number;
}
type BackendGetResponse = BackendPermissionItemGetResponse[];

interface BackendPermissionItemUpdateRequest {
  menu_id: number;
  puede_ver: boolean;
  puede_editar: boolean;
  puede_eliminar: boolean;
}

interface BackendUpdateRequestPayload {
  permisos: BackendPermissionItemUpdateRequest[];
}

export const permissionService = {
  getRolePermissions: async (rol_Id: number): Promise<PermissionState> => {
    // ✅ CAMBIO: agregado / al final
    const endpoint = `/roles/${rol_Id}/permisos/`;
    try {
      const response = await api.get<BackendGetResponse>(endpoint);
      const backendPermissions = response.data;

      if (!Array.isArray(backendPermissions)) {
        console.error(`La respuesta de la API desde ${endpoint} no es un array:`, backendPermissions);
        return {};
      }

      const frontendPermissions: PermissionState = {};
      for (const item of backendPermissions) {
        frontendPermissions[item.menu_id] = {
          ver: item.puede_ver,
          crear: false,
          editar: item.puede_editar ?? false,
          eliminar: item.puede_eliminar ?? false,
        };
      }
      console.log("Permissions Service - Transformed GET Response for Frontend:", frontendPermissions);

      return frontendPermissions;

    } catch (error) {
      console.error(`Error fetching permissions for rol ${rol_Id} from ${endpoint}:`, error);
      throw new Error('Error al obtener los permisos del rol.');
    }
  },

  updateRolePermissions: async (rol_Id: number, payload: BackendUpdateRequestPayload): Promise<void> => {
    // ✅ CAMBIO: agregado / al final
    const endpoint = `/roles/${rol_Id}/permisos/`;
    try {
      console.log("Permissions Service - Sending PUT Request Payload:", payload);
      await api.put<void>(endpoint, payload);
    } catch (error) {
      console.error(`Error updating permissions for rol ${rol_Id} at ${endpoint}:`, error);
      throw new Error('Error al actualizar los permisos del rol.');
    }
  }
};