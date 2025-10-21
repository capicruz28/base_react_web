// src/types/permission.types.ts

/**
 * Tipos de permisos disponibles para cada menú.
 */
export type PermissionType = 'ver' | 'crear' | 'editar' | 'eliminar';

/**
 * Representa el estado de los permisos para un menú específico.
 * Las claves son los tipos de permiso (ver, crear, etc.).
 * El valor es un booleano indicando si el permiso está concedido.
 */
export type MenuPermissions = {
  [key in PermissionType]: boolean;
};

/**
 * Representa el estado completo de los permisos para un rol.
 * Las claves son los menu_id (números).
 * Los valores son objetos MenuPermissions.
 * Ejemplo: { 11: { ver: true, crear: false, ... }, 12: { ver: true, ... } }
 */
export type PermissionState = {
  [menuId: number]: MenuPermissions;
};

/**
 * El payload que se enviará a la API para actualizar los permisos de un rol.
 * Contiene el estado completo de los permisos tal como se modificaron en el frontend.
 */
export interface PermissionUpdatePayload {
  permissions: PermissionState;
}

/**
 * La respuesta esperada de la API al solicitar los permisos de un rol.
 * Debería coincidir con la estructura de PermissionState.
 */
export type RolePermissionsResponse = PermissionState;