// src/types/menu.types.ts

// --- Tipos para el Sidebar (Existentes) ---

export interface SidebarMenuItem { // Renombrado para claridad (antes MenuItem)
  menu_id: number | string;
  nombre: string;
  icono: string | null; // Hacer opcional si puede ser null
  ruta: string | null; // Hacer opcional si puede ser null
  orden: number | null; // Hacer opcional si puede ser null
  level?: number; // Hacer opcional si no siempre está
  es_activo: boolean; // Asumiendo que el sidebar solo muestra activos? O filtrar en el componente.
  padre_menu_id: number | null;
  area_id: number | null;
  area_nombre: string | null;
  children: SidebarMenuItem[]; // Usa el tipo renombrado recursivamente
  isSeparator?: boolean; // <--- AÑADIDO: Para los títulos en el menú estático
}

export interface SidebarMenuResponse { // Renombrado para claridad (antes MenuResponse)
  menu: SidebarMenuItem[];
}

// Tipos adicionales para el componente Sidebar (Existentes)
export interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export interface PopoverContentProps {
  item: SidebarMenuItem; // Usa el tipo renombrado
  nestedPopover: string | null;
  setNestedPopover: (path: string | null) => void;
  handleNavigate: (path: string) => void;
  currentPath: string;
  getItemIdentifier: (item: SidebarMenuItem) => string; // Añadido para tipado correcto
}

// --- Tipos NUEVOS para la Gestión de Menús ---

// Tipo para la lista simple de áreas (para el selector)
export interface AreaSimpleList {
  area_id: number;
  nombre: string;
}

// Tipo para los datos que vienen del endpoint GET /menus/area/{id}/tree
// (Antes de transformarlos para la librería del árbol)
export interface BackendManageMenuItem {
  menu_id: number;
  nombre: string;
  icono?: string | null;
  ruta?: string | null;
  padre_menu_id?: number | null;
  orden?: number | null;
  es_activo: boolean; // Incluye activos e inactivos
  area_id?: number | null;
  area_nombre?: string | null; // Si el backend lo incluye
  level?: number;
  children: BackendManageMenuItem[]; // Estructura anidada del backend
}

// Tipo para la respuesta del endpoint GET /menus/area/{id}/tree
export interface MenuTreeResponse {
  menu: BackendManageMenuItem[];
}

// Tipo para el nodo del árbol que usa @minoru/react-dnd-treeview
export interface MenuTreeNode {
  id: number; // Requerido por la librería -> menu_id
  parent: number | 0; // Requerido por la librería -> padre_menu_id (usar 0 para raíz)
  text: string; // Requerido por la librería -> nombre
  droppable?: boolean; // ¿Se pueden soltar items sobre este? (Default: true)
  data?: {
    // Nuestros datos específicos del menú
    menu_id: number;
    nombre: string;
    icono?: string | null;
    ruta?: string | null;
    padre_menu_id?: number | null;
    orden?: number | null;
    es_activo: boolean;
    area_id?: number | null;
    area_nombre?: string | null;
  };
}

// Tipo para crear un nuevo item de menú (payload para POST /menus)
export interface MenuCreateData {
  nombre: string;
  icono?: string | null;
  ruta?: string | null;
  padre_menu_id?: number | null;
  orden?: number | null; // El backend podría calcularlo
  area_id: number; // Obligatorio al crear
  es_activo?: boolean; // Default true en backend
}

// Tipo para actualizar un item de menú (payload para PUT /menus/{id})
export interface MenuUpdateData {
  nombre?: string;
  icono?: string | null;
  ruta?: string | null;
  padre_menu_id?: number | null; // Para drag & drop (cambiar padre)
  orden?: number | null; // Para drag & drop (cambiar orden)
  area_id?: number; // ¿Permitir cambiar área?
  es_activo?: boolean; // Para activar/desactivar
}

// Tipo para la respuesta de un solo menú (GET /menus/{id}, POST, PUT)
// Basado en MenuReadSingle del backend
export interface MenuSingleResponse {
    menu_id: number;
    nombre: string;
    icono?: string | null;
    ruta?: string | null;
    padre_menu_id?: number | null;
    orden?: number | null;
    area_id?: number | null;
    es_activo: boolean;
    area_nombre?: string | null; // Si el backend lo incluye
    fecha_creacion: string; // O Date, dependiendo de cómo lo manejes
    fecha_actualizacion?: string | null; // O Date
}