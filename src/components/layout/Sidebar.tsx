// src/components/layout/Sidebar.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Popover } from 'react-tiny-popover';
import * as LucideIcons from 'lucide-react';
import type { SidebarMenuItem, SidebarProps } from '../../types/menu.types'; // Asegúrate que esta ruta sea correcta
import { menuService } from '../../services/menu.service'; // Asegúrate que esta ruta sea correcta

// --- Interfaz PopoverContentProps (de tu código anterior) ---
interface PopoverContentProps {
  item: SidebarMenuItem;
  nestedPopover: string | null;
  setNestedPopover: (identifier: string | null) => void;
  handleNavigate: (path: string) => void;
  currentPath: string;
  getItemIdentifier: (item: SidebarMenuItem) => string;
}

// --- Función getIcon (de tu código anterior con text-current) ---
const getIcon = (iconName: string | null | undefined) => {
  const baseIconClasses = "w-5 h-5 text-current opacity-100 inline-block"; 
  if (!iconName) {
    return <LucideIcons.Circle className={`${baseIconClasses} opacity-50`} />;
  }
  try {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) {
      console.warn(`Icon not found: ${iconName}. Rendering HelpCircle.`);
      return <LucideIcons.HelpCircle className={`w-5 h-5 text-red-500 opacity-100 inline-block`} />;
    }
    if (iconName === 'AlertTriangle') {
       return <IconComponent className={`w-5 h-5 text-red-500 opacity-100 inline-block`} />;
    }
    // Corrección: Asegurar que HelpCircle no se pinte de rojo si es el ícono por defecto y no un error.
    if (iconName === 'HelpCircle' && IconComponent.displayName?.includes('HelpCircle')) { 
        return <IconComponent className={baseIconClasses} />; 
    }
    return <IconComponent className={baseIconClasses} />;
  } catch (error) {
    console.error(`Error loading icon: ${iconName}`, error);
    return <LucideIcons.AlertTriangle className={`w-5 h-5 text-red-500 opacity-100 inline-block`} />;
  }
};

// --- Componente PopoverContent (de tu código anterior) ---
const PopoverContent: React.FC<PopoverContentProps> = ({
  item,
  nestedPopover,
  setNestedPopover,
  handleNavigate,
  currentPath,
  getItemIdentifier
}) => {
  const isActive = useCallback((path: string | null | undefined) => !!path && currentPath.startsWith(path), [currentPath]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg min-w-[200px] py-1 ml-1 border border-gray-200 dark:border-gray-700">
      {item.children?.map((subItem: SidebarMenuItem) => {
        const subItemIdentifier = getItemIdentifier(subItem);
        const isSubItemActive = isActive(subItem.ruta);
        const canNavigate = subItem.ruta && subItem.es_activo;
        const hasChildren = subItem.children && subItem.children.length > 0;

        return (
          <div key={subItem.menu_id}>
            {hasChildren ? (
              <Popover
                isOpen={nestedPopover === subItemIdentifier}
                positions={['right']}
                align="start" // Podría ayudar con la alineación
                content={
                  <PopoverContent
                    item={subItem}
                    nestedPopover={nestedPopover}
                    setNestedPopover={setNestedPopover}
                    handleNavigate={handleNavigate}
                    currentPath={currentPath}
                    getItemIdentifier={getItemIdentifier}
                  />
                }
                onClickOutside={() => setNestedPopover(null)}
              >
                <button
                  className={`flex items-center w-full px-4 py-2 text-left transition-colors text-gray-700 dark:text-gray-200
                    ${isSubItemActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${!subItem.es_activo ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (subItem.es_activo) {
                        setNestedPopover(nestedPopover === subItemIdentifier ? null : subItemIdentifier);
                    }
                  }}
                  disabled={!subItem.es_activo}
                >
                  {getIcon(subItem.icono)}
                  <span className="ml-3">{subItem.nombre}</span>
                  <LucideIcons.ChevronRight className="ml-auto w-4 h-4" />
                </button>
              </Popover>
            ) : (
              <button
                className={`flex items-center w-full px-4 py-2 text-left transition-colors text-gray-700 dark:text-gray-200
                  ${isSubItemActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                  ${!subItem.es_activo ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => { if (canNavigate) handleNavigate(subItem.ruta as string) }}
                disabled={!canNavigate}
              >
                {getIcon(subItem.icono)}
                <span className="ml-3">{subItem.nombre}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface GroupedMenuItems {
  [areaName: string]: SidebarMenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  const [nestedPopover, setNestedPopover] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const getItemIdentifier = useCallback((menuItem: SidebarMenuItem): string => {
    return menuItem.ruta ?? `menu-${menuItem.menu_id}`;
  }, []);

  const isActive = useCallback((path: string | null | undefined) => !!path && location.pathname.startsWith(path), [location.pathname]);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const responseItems = await menuService.getSidebarMenu();
      setMenuItems(responseItems || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const groupedMenuItems = useMemo(() => {
    const groups: GroupedMenuItems = {};
    menuItems.forEach((item: SidebarMenuItem) => {
      const areaName = item.area_nombre || 'General';
      if (!groups[areaName]) {
        groups[areaName] = [];
      }
      groups[areaName].push(item);
    });
    const sortedGroups: GroupedMenuItems = {};
    if (groups['General']) {
        sortedGroups['General'] = groups['General'];
        delete groups['General'];
    }
    Object.keys(groups).sort().forEach(areaName => {
        sortedGroups[areaName] = groups[areaName];
    });
    return sortedGroups;
  }, [menuItems]);

  const handleMenuClick = (item: SidebarMenuItem) => {
    const itemIdentifier = getItemIdentifier(item);
    const hasChildren = item.children && item.children.length > 0;
    const canNavigate = item.ruta && item.es_activo;

    // Si el item no está activo Y no tiene hijos Y no puede navegar, no hacer nada.
    // Esto permite que padres con hijos (incluso si el padre no es activo/navegable) puedan expandirse.
    if (!item.es_activo && !hasChildren && !canNavigate) return;

    if (isCollapsed) {
      if (hasChildren && item.es_activo) { 
        setPopoverOpen(popoverOpen === itemIdentifier ? null : itemIdentifier);
        setNestedPopover(null);
      } else if (canNavigate) {
        navigate(item.ruta as string);
        setPopoverOpen(null); 
        setNestedPopover(null);
      }
    } else { 
      if (hasChildren) {
        setExpandedItems(prev =>
          prev.includes(itemIdentifier)
            ? prev.filter(id => id !== itemIdentifier)
            : [...prev, itemIdentifier]
        );
      } else if (canNavigate) {
        navigate(item.ruta as string);
      }
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setPopoverOpen(null);
    setNestedPopover(null);
  };

  if (loading) {
     return (
      <aside 
        className={`
          flex flex-col h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          transition-transform duration-300 ease-in-out w-64 fixed left-0 top-0 z-50
          ${isCollapsed ? '-translate-x-[12rem]' : 'translate-x-0'} 
        `}
        style={{ willChange: 'transform' }} 
      >
         <div className={` 
            flex items-center h-16 border-b border-gray-200 dark:border-gray-700
            w-64
            ${isCollapsed ? 'justify-end pr-4' : 'justify-center'} 
         `}>
            <LucideIcons.Loader className="w-6 h-6 animate-spin text-blue-600" />
         </div>
      </aside>
    );
  }

  const collapsedVisibleWidthClass = 'w-16'; // 4rem

  return (
    <div // Contenedor Principal del Sidebar
      className={`
        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
        w-64 h-screen fixed left-0 top-0 z-50 border-r border-gray-200 dark:border-gray-700
        flex flex-col transition-transform duration-300 ease-in-out
        ${isCollapsed ? '-translate-x-[12rem]' : 'translate-x-0'} 
      `}
      style={{ willChange: 'transform' }}
    >
      {/* Header del Sidebar */}
      <div
        className={`
          flex items-center h-16 border-b border-gray-200 dark:border-gray-700 flex-shrink-0
          w-64 relative 
        `}
      >
        <div className={`
          absolute top-0 h-full flex items-center
          ${isCollapsed ? `right-0 ${collapsedVisibleWidthClass} justify-end pr-1` : 'left-0 w-full justify-between pl-4 pr-2'}
        `}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Fidesoft
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-700 dark:text-gray-200"
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? <LucideIcons.ChevronRight size={20} /> : <LucideIcons.ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-grow overflow-y-auto overflow-x-hidden py-2 w-64 relative">
        {/* Contenedor para los ítems que se ajustará cuando esté colapsado */}
        <div className={`
            ${isCollapsed ? `absolute top-0 right-0 ${collapsedVisibleWidthClass} flex flex-col items-center pt-1` : 'w-full'}
        `}>
          {Object.entries(groupedMenuItems).map(([areaName, itemsInArea]) => (
            <div key={areaName} className={` ${isCollapsed ? 'w-full flex flex-col items-center' : 'w-full mb-2'}`}>
              {!isCollapsed && (
                <h2 className="px-4 pt-2 pb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {areaName}
                </h2>
              )}
              {itemsInArea.map((item: SidebarMenuItem) => {
                const itemIdentifier = getItemIdentifier(item);
                const isItemActive = isActive(item.ruta);
                const hasChildren = item.children && item.children.length > 0;
                
                // Un ítem está deshabilitado para la navegación si no es activo Y no tiene hijos (o si está colapsado y no tiene ruta)
                // Pero un padre con hijos debe ser clickeable para expandir/colapsar.
                const isEffectivelyDisabledForNavigation = !item.es_activo && !hasChildren;
                const isParentClickableForToggle = hasChildren; // Un padre siempre es clickeable para toggle si tiene hijos

                return (
                  // Contenedor del ítem individual y sus hijos (si están expandidos y !isCollapsed)
                  <div 
                    key={item.menu_id} 
                    className={`
                      ${isCollapsed ? `flex justify-center w-full my-0.5` : 'px-2 my-0.5'}
                    `}
                  > 
                    <Popover
                      isOpen={isCollapsed && hasChildren && item.es_activo && popoverOpen === itemIdentifier}
                      positions={['right']}
                      align="center" 
                      content={
                        <PopoverContent
                          item={item}
                          nestedPopover={nestedPopover}
                          setNestedPopover={setNestedPopover}
                          handleNavigate={handleNavigate}
                          currentPath={location.pathname}
                          getItemIdentifier={getItemIdentifier}
                        />
                      }
                      onClickOutside={() => { setPopoverOpen(null); setNestedPopover(null); }}
                    >
                      <button
                        className={`
                          flex items-center rounded text-left transition-colors text-sm
                          ${isItemActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}
                          ${!item.es_activo && !hasChildren ? 'opacity-50' : ''} 
                          ${isEffectivelyDisabledForNavigation && !isParentClickableForToggle ? 'cursor-not-allowed' : ''}
                          ${isCollapsed 
                            ? `p-3 ${collapsedVisibleWidthClass} justify-center` 
                            : 'w-full px-2 py-2'
                          }
                        `}
                        onClick={() => handleMenuClick(item)}
                        disabled={isEffectivelyDisabledForNavigation && !isParentClickableForToggle} 
                        title={isCollapsed ? item.nombre : ''}
                      >
                        {getIcon(item.icono)} 
                        {!isCollapsed && (
                          <>
                            <span className="ml-2 flex-1">{item.nombre}</span>
                            {hasChildren && ( 
                                <span className="ml-auto">
                                    {expandedItems.includes(itemIdentifier) ? <LucideIcons.ChevronDown className="w-4 h-4" /> : <LucideIcons.ChevronRight className="w-4 h-4" />}
                                </span>
                            )}
                          </>
                        )}
                      </button>
                    </Popover>

                    {/* Submenús Desplegados (solo si NO está colapsado Y tiene hijos Y está expandido) */}
                    {!isCollapsed && hasChildren && expandedItems.includes(itemIdentifier) && (
                        // Ajusta ml-4 y pl-4 según necesites para la indentación visual
                        <div className="pl-4 border-l border-gray-200 dark:border-gray-700 ml-4 mt-1 space-y-1"> 
                            {item.children.map((subItem: SidebarMenuItem) => {
                                const subItemIdentifier = getItemIdentifier(subItem);
                                const isSubItemActive = isActive(subItem.ruta);
                                const hasSubChildren = subItem.children && subItem.children.length > 0;
                                
                                const isSubEffectivelyDisabled = !subItem.es_activo && !hasSubChildren;
                                const isSubParentClickable = hasSubChildren;

                                return (
                                <div key={subItem.menu_id}>
                                    <button
                                        className={`flex items-center w-full rounded px-2 py-1.5 text-left transition-colors text-xs 
                                            ${isSubItemActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'} 
                                            ${!subItem.es_activo && !hasSubChildren ? 'opacity-50' : ''} 
                                            ${isSubEffectivelyDisabled && !isSubParentClickable ? 'cursor-not-allowed' : ''}`}
                                        onClick={() => handleMenuClick(subItem)}
                                        disabled={isSubEffectivelyDisabled && !isSubParentClickable}
                                    >
                                        {getIcon(subItem.icono)}
                                        <span className="ml-2 flex-1">{subItem.nombre}</span>
                                        {hasSubChildren && ( <span className="ml-auto">{expandedItems.includes(subItemIdentifier) ? <LucideIcons.ChevronDown className="w-4 h-4" /> : <LucideIcons.ChevronRight className="w-4 h-4" />}</span>)}
                                    </button>
                                    {/* Sub-submenú si existe y está expandido */}
                                    {hasSubChildren && expandedItems.includes(subItemIdentifier) && (
                                        <div className="pl-4 border-l border-gray-200 dark:border-gray-700 ml-4 mt-1 space-y-1">
                                            {subItem.children.map((nestedItem: SidebarMenuItem) => {
                                                const isNestedActive = isActive(nestedItem.ruta);
                                                const canNestedNavigate = nestedItem.ruta && nestedItem.es_activo;
                                                return (
                                                    <button key={nestedItem.menu_id} className={`flex items-center w-full rounded px-2 py-1.5 text-left transition-colors text-xs ${isNestedActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'} ${!nestedItem.es_activo ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => { if (canNestedNavigate) handleNavigate(nestedItem.ruta as string); }} disabled={!canNestedNavigate}>
                                                        {getIcon(nestedItem.icono)}
                                                        <span className="ml-2">{nestedItem.nombre}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}
                  </div> // Fin del contenedor del ítem individual y sus hijos
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className={`
          border-t border-gray-200 dark:border-gray-700 flex-shrink-0
          w-64 relative h-16 flex items-center 
        `}
      >
        <div className={`
            absolute right-0 h-full flex items-center 
            ${isCollapsed ? `${collapsedVisibleWidthClass} justify-center p-2` : 'left-0 w-full p-4'}
        `}>
            <button
              onClick={toggleDarkMode}
              className={`
                flex items-center rounded-lg transition-colors duration-200
                hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200
                ${isCollapsed ? 'p-2' : 'w-full p-2'}
              `}
              aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {isDarkMode ? <LucideIcons.Sun className="w-5 h-5 text-yellow-500" /> : <LucideIcons.Moon className="w-5 h-5" />}
              {!isCollapsed && ( 
                <span className="ml-2 text-sm">
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;