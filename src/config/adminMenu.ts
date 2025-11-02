// src/config/adminMenu.ts (CORREGIDO)

import { SidebarMenuItem } from '../types/menu.types'; 
// Asegúrate de que SidebarMenuItem y los iconos de Lucide estén disponibles

// El campo 'icono' debe coincidir con el nombre de un componente en LucideIcons
export const administrationNavItems: SidebarMenuItem[] = [
  // Título/Separador
  { 
    menu_id: 'admin_header', // <-- menu_id ahora es string
    nombre: '', 
    ruta: null, 
    icono: null,
    isSeparator: true, // <-- Propiedad ahora permitida
    children: [], // Asegurar que children está presente si no es opcional en tu SidebarMenuItem original
    es_activo: true, // Asumir activo
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: null,
  }, 
  // Opciones de gestión estática
  {
    menu_id: 'user_management', // <-- menu_id ahora es string
    nombre: 'Gestión de Usuarios',
    ruta: '/admin/usuarios',
    icono: 'Users',
    children: [],
    es_activo: true,
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: 1,
  },
  {
    menu_id: 'role_management', // <-- menu_id ahora es string
    nombre: 'Roles y Permisos',
    ruta: '/admin/roles',
    icono: 'ShieldCheck',
    children: [],
    es_activo: true,
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: 2,
  },
  {
    menu_id: 'area_management', // <-- menu_id ahora es string
    nombre: 'Gestión de Áreas',
    ruta: '/admin/areas',
    icono: 'FolderKanban',
    children: [],
    es_activo: true,
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: 3,
  },
  {
    menu_id: 'menu_management', // <-- menu_id ahora es string
    nombre: 'Gestión de Menús',
    ruta: '/admin/menus',
    icono: 'ListTree',
    children: [],
    es_activo: true,
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: 4,
  },
    {
    menu_id: 'session_management', // <-- menu_id ahora es string
    nombre: 'Sesiones Activas',
    ruta: '/admin/sesiones',
    icono: 'LogOut',
    children: [],
    es_activo: true,
    padre_menu_id: null,
    area_id: null,
    area_nombre: null,
    orden: 4,
  },
];