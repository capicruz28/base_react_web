// src/components/admin/AdminSidebar.tsx (MODIFICADO PARA ÁREAS DINÁMICAS)

import React, { useState, useEffect } from 'react'; // <-- Añadir useEffect
import { NavLink } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard, // Lo usaremos como icono para "General"
  LogOut,
  Sun,
  Moon,
  FolderKanban,
  Globe, // Icono para las áreas individuales (o elige otro)
  Loader2, // Icono de carga
  AlertCircle,
  Logs, // Icono de error
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { menuService } from '../../services/menu.service'; // <-- IMPORTAR menuService
import type { AreaSimpleList } from '../../types/menu.types'; // <-- IMPORTAR tipo AreaSimpleList

// --- Tipos y arrays estáticos (Administración) ---
interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

// Mantenemos esto para la sección de Administración
const administrationNavItems: NavItem[] = [
  { to: '/admin/usuarios', icon: Users, label: 'Gestión de Usuarios', end: true },
  { to: '/admin/roles', icon: ShieldCheck, label: 'Gestión de Roles', end: true },
  { to: '/admin/areas', icon: FolderKanban, label: 'Gestión de Áreas', end: true },
  { to: '/admin/menus', icon: Logs, label: 'Gestión de Menus', end: true },
];

// --- Componente AdminSidebar ---
const AdminSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // --- ESTADOS PARA ÁREAS DINÁMICAS ---
  const [areas, setAreas] = useState<AreaSimpleList[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);
  const [errorAreas, setErrorAreas] = useState<string | null>(null);
  // Estado para controlar si el menú "General" está desplegado (opcional, si quieres hacerlo colapsable)
  const [isGeneralOpen, setIsGeneralOpen] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // --- EFECTO PARA CARGAR ÁREAS ---
  useEffect(() => {
    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      setErrorAreas(null);
      try {
        const areaList = await menuService.getAreaList();
        setAreas(areaList);
      } catch (err) {
        console.error("Error fetching areas for AdminSidebar:", err);
        setErrorAreas("Error al cargar áreas");
      } finally {
        setIsLoadingAreas(false);
      }
    };
    fetchAreas();
  }, []); // Carga solo una vez al montar

  // Función para alternar el menú General (opcional)
  const toggleGeneralMenu = () => {
    if (!isCollapsed) { // Solo permite colapsar/expandir si el sidebar no está colapsado
        setIsGeneralOpen(!isGeneralOpen);
    }
  };

  // Función auxiliar para renderizar la sección estática de Administración
  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="px-2 mt-4">
      {!isCollapsed && (
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
          {title}
        </h3>
      )}
      {isCollapsed && <div className="h-2"></div>}
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center w-full rounded px-2 py-2 text-left transition-colors text-sm ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon
              className={`h-5 w-5 flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''} ${
                'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`}
              aria-hidden="true"
            />
            {!isCollapsed && <span className="ml-2 flex-1">{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </div>
  );

  return (
    <aside
      className={`
        flex flex-col h-screen
        bg-white dark:bg-gray-800
        text-gray-700 dark:text-gray-200
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* --- Cabecera del Sidebar --- */}
      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {!isCollapsed && (
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Fidesoft
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-200"
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* --- Cuerpo del Sidebar (Scrollable) --- */}
      <nav className="flex-grow overflow-y-auto overflow-x-hidden py-2">

        {/* --- SECCIÓN GENERAL (DINÁMICA) --- */}
        <div className="px-2 mt-4">
           {/* Encabezado de la sección General (puede ser botón si es colapsable) */}
           <button
             onClick={toggleGeneralMenu}
             disabled={isCollapsed} // Deshabilitar toggle si el sidebar está colapsado
             className={`group flex items-center w-full rounded px-2 py-2 text-left transition-colors text-sm mb-1 ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? 'cursor-default' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
             title={isCollapsed ? 'General' : (isGeneralOpen ? 'Colapsar General' : 'Expandir General')}
           >
             <LayoutDashboard // Icono para General
               className={`h-5 w-5 flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''} text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300`}
               aria-hidden="true"
             />
             {!isCollapsed && (
                <>
                 <span className="ml-2 flex-1 font-semibold">General</span>
                 {/* Icono de flecha para indicar desplegable */}
                 <ChevronRight size={16} className={`transition-transform duration-200 ${isGeneralOpen ? 'rotate-90' : ''}`} />
                </>
             )}
           </button>

           {/* Contenido de la sección General (áreas dinámicas) */}
           {/* Solo mostrar si no está colapsado el sidebar Y si la sección General está abierta */}
           {!isCollapsed && isGeneralOpen && (
             <div className="space-y-1 pl-3 border-l border-gray-200 dark:border-gray-600 ml-3"> {/* Indentación */}
               {isLoadingAreas && (
                 <div className="flex items-center px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Cargando áreas...
                 </div>
               )}
               {errorAreas && (
                 <div className="flex items-center px-2 py-1 text-xs text-red-500 dark:text-red-400">
                   <AlertCircle className="w-4 h-4 mr-2" />
                   {errorAreas}
                 </div>
               )}
               {!isLoadingAreas && !errorAreas && areas.length === 0 && (
                 <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                   No hay áreas.
                 </div>
               )}
               {!isLoadingAreas && !errorAreas && areas.map((area) => (
                 <NavLink
                   key={area.area_id}
                   // --- RUTA DINÁMICA ---
                   to={`/area/${area.area_id}`}
                   end={true} // Probablemente quieras 'end' para que no coincida con subrutas
                   className={({ isActive }) =>
                     `group flex items-center w-full rounded px-2 py-1.5 text-left transition-colors text-sm ${ // Ajusta py si es necesario
                       isActive
                         ? 'bg-blue-600 text-white'
                         : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                     }`
                   }
                   title={area.nombre} // Tooltip con el nombre completo
                 >
                   <Globe // Icono para cada área (o usa otro)
                     className={`h-4 w-4 flex-shrink-0 mr-2 ${ // Icono más pequeño para subitem
                       'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                     }`}
                     aria-hidden="true"
                   />
                   <span className="ml-2 flex-1 truncate">{area.nombre}</span> {/* truncate si los nombres son largos */}
                 </NavLink>
               ))}
             </div>
           )}
        </div>

        {/* --- SECCIÓN ADMINISTRACIÓN (ESTÁTICA) --- */}
        {renderNavSection('Administración', administrationNavItems)}

      </nav>

      {/* --- Pie del Sidebar (sin cambios) --- */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-2">
         {/* Theme Switch */}
         <button
            onClick={toggleDarkMode}
            className={`
              flex items-center p-2 rounded-lg w-full
              transition-colors duration-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              text-gray-700 dark:text-gray-200
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? (isDarkMode ? 'Claro' : 'Oscuro') : (isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            {!isCollapsed && (
              <span className="ml-2 text-sm">
                {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
            )}
          </button>

         {/* Botón de Logout */}
         <button
            onClick={logout}
            className={`
              flex items-center p-2 rounded-lg w-full
              transition-colors duration-200
              hover:bg-red-100 dark:hover:bg-red-900/20
              text-gray-700 dark:text-gray-200
              group
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400" aria-hidden="true" />
            {!isCollapsed && <span className="ml-2 text-sm group-hover:text-red-700 dark:group-hover:text-red-400">Cerrar Sesión</span>}
          </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;