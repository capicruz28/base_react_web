import api from './api'; // Tu instancia de Axios/API configurada
import type {
  // Tipos para Sidebar (renombrados)
  SidebarMenuItem,
  SidebarMenuResponse,
  // Tipos para Gestión de Menús (nuevos)
  AreaSimpleList,
  BackendManageMenuItem, // El tipo directo del backend para el árbol de gestión
  MenuTreeResponse,      // La envoltura { menu: BackendManageMenuItem[] }
  MenuCreateData,
  MenuUpdateData,
  MenuSingleResponse,    // Para respuestas de POST/PUT/GET por ID
} from '../types/menu.types'; // Asegúrate que la ruta sea correcta

// --- Servicio de Menú ---
export const menuService = {
  /**
   * Obtiene el menú para el usuario autenticado (usado en Sidebar).
   * Llama a GET /menus/getmenu/
   */
  getSidebarMenu: async (): Promise<SidebarMenuItem[]> => { // Devuelve el array directamente
    const endpoint = '/menus/getmenu/'; // <-- agregado /
    try {
      // Usa el tipo renombrado para la respuesta
      const response = await api.get<SidebarMenuResponse>(endpoint);
      if (response.data && Array.isArray(response.data.menu)) {
        return response.data.menu; // Devuelve solo el array de menú
      } else {
        console.error(`Respuesta inesperada de ${endpoint}:`, response.data);
        return []; // Devuelve array vacío si el formato no es correcto
      }
    } catch (error) {
      console.error(`Error fetching sidebar menu from ${endpoint}:`, error);
      // Considera lanzar el error para que el componente lo maneje
      // throw error;
      return []; // O devuelve array vacío
    }
  },

  /**
   * Obtiene la lista simple de áreas activas (para el selector).
   * Llama a GET /areas/list/
   */
  getAreaList: async (): Promise<AreaSimpleList[]> => {
    const endpoint = '/areas/list/'; // <-- agregado /
    try {
      // Espera una respuesta que es directamente un array de AreaSimpleList
      const response = await api.get<AreaSimpleList[]>(endpoint);
      // Verifica que la respuesta sea un array
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.error(`Respuesta inesperada de ${endpoint} (no es un array):`, response.data);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching area list from ${endpoint}:`, error);
      // throw error;
      return [];
    }
  },

  /**
   * Obtiene el árbol de menú (activos e inactivos) para un área específica.
   * Llama a GET /menus/area/{area_id}/tree/
   * @param areaId - El ID del área para la que se quiere obtener el menú.
   */
  getMenuTreeByArea: async (areaId: number): Promise<BackendManageMenuItem[]> => {
    // Valida que areaId sea un número válido antes de llamar
    if (typeof areaId !== 'number' || areaId <= 0) {
        console.error('getMenuTreeByArea: areaId inválido:', areaId);
        return [];
    }
    const endpoint = `/menus/area/${areaId}/tree/`; // <-- agregado /
    try {
      // Usa el tipo MenuTreeResponse que envuelve el array
      const response = await api.get<MenuTreeResponse>(endpoint);
      if (response.data && Array.isArray(response.data.menu)) {
        return response.data.menu; // Devuelve solo el array de menú
      } else {
        console.error(`Respuesta inesperada de ${endpoint}:`, response.data);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching menu tree for area ${areaId} from ${endpoint}:`, error);
      // throw error;
      return [];
    }
  },

  /**
   * Crea un nuevo ítem de menú.
   * Llama a POST /menus/
   * @param menuData - Datos del menú a crear.
   */
  createMenuItem: async (menuData: MenuCreateData): Promise<MenuSingleResponse> => {
    const endpoint = '/menus/'; // <-- agregado /
    try {
      const response = await api.post<MenuSingleResponse>(endpoint, menuData);
      return response.data; // Devuelve el objeto del menú creado
    } catch (error) {
      console.error(`Error creating menu item via ${endpoint}:`, error);
      // Lanza el error para que el componente muestre un mensaje específico
      throw error;
    }
  },

  /**
   * Actualiza un ítem de menú existente.
   * Llama a PUT /menus/{menuId}/
   * @param menuId - ID del menú a actualizar.
   * @param menuData - Datos a actualizar (solo los campos a cambiar).
   */
  updateMenuItem: async (menuId: number, menuData: MenuUpdateData): Promise<MenuSingleResponse> => {
    const endpoint = `/menus/${menuId}/`; // <-- agregado /
    try {
      const response = await api.put<MenuSingleResponse>(endpoint, menuData);
      return response.data; // Devuelve el objeto del menú actualizado
    } catch (error) {
      console.error(`Error updating menu item ${menuId} via ${endpoint}:`, error);
      throw error; // Lanza para manejo en componente
    }
  },

  /**
   * Desactiva (borrado lógico) un ítem de menú.
   * Llama a DELETE /menus/{menuId}/
   * @param menuId - ID del menú a desactivar.
   */
  deactivateMenuItem: async (menuId: number): Promise<Record<string, any>> => { // Devuelve el objeto de respuesta del backend
    const endpoint = `/menus/${menuId}/`; // <-- agregado /
    try {
      // El backend devuelve un objeto como {"message": "...", "menu_id": N, "es_activo": false}
      const response = await api.delete<Record<string, any>>(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error deactivating menu item ${menuId} via ${endpoint}:`, error);
      throw error; // Lanza para manejo en componente
    }
  },

  /**
   * Reactiva un ítem de menú previamente desactivado.
   * Llama a PUT /menus/{menuId}/reactivate/
   * @param menuId - ID del menú a reactivar.
   */
  reactivateMenuItem: async (menuId: number): Promise<Record<string, any>> => { // Devuelve el objeto de respuesta del backend
    const endpoint = `/menus/${menuId}/reactivate/`; // <-- agregado /
    try {
      // El backend devuelve un objeto como {"message": "...", "menu_id": N, "es_activo": true}
      const response = await api.put<Record<string, any>>(endpoint); // PUT sin body
      return response.data;
    } catch (error) {
      console.error(`Error reactivating menu item ${menuId} via ${endpoint}:`, error);
      throw error; // Lanza para manejo en componente
    }
  },

  // --- Funciones Anteriores (Ajustadas) ---

  /**
   * Obtiene la estructura COMPLETA del árbol de menús (activos e inactivos).
   * Usado para gestión de permisos, etc. Llama a GET /menus/all-structured/
   * Devuelve una Promise que resuelve a BackendManageMenuItem[].
   */
  getFullMenuTree: async (): Promise<BackendManageMenuItem[]> => {
    const endpoint = '/menus/all-structured/'; // <-- agregado /
    try {
      // Usa MenuTreeResponse como tipo genérico (asumiendo { menu: [...] })
      const response = await api.get<MenuTreeResponse>(endpoint);
      if (response.data && Array.isArray(response.data.menu)) {
        return response.data.menu; // Devuelve el array de BackendManageMenuItem
      } else {
        console.error(`Respuesta inesperada de ${endpoint}:`, response.data);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching full menu tree from ${endpoint}:`, error);
      // throw error;
      return [];
    }
  }
};