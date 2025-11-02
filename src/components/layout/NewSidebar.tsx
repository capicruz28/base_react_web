import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBreadcrumb } from '../../context/BreadcrumbContext';
import { Popover } from 'react-tiny-popover';
import * as LucideIcons from 'lucide-react';

import { menuService } from '../../services/menu.service'; 
import type { SidebarMenuItem, SidebarProps, PopoverContentProps } from '../../types/menu.types'; 
import { administrationNavItems } from '../../config/adminMenu';

// --- CLASES Y UTILIDADES COMUNES ---
const baseIconClasses = "w-5 h-5 text-current opacity-100 inline-block"; 
const transitionClass = 'transition-all duration-200 ease-in-out'; 

// Función utilitaria para obtener el ícono (SIN CAMBIOS)
const getIcon = (iconName: string | null | undefined, FallbackIcon: React.ElementType = LucideIcons.Circle) => {
    if (!iconName) {
        return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
    }
    
    try {
        const normalizedName = iconName
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        let IconComponent = (LucideIcons as any)[normalizedName];
        
        if (!IconComponent) {
            IconComponent = (LucideIcons as any)[iconName]; 
        }
        
        if (!IconComponent) {
            return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
        }
        
        return <IconComponent className={baseIconClasses} />;
    } catch (e) {
        return <FallbackIcon className={`${baseIconClasses} opacity-50`} />;
    }
};

// Componente PopoverContent (SIN CAMBIOS)
const PopoverContent: React.FC<PopoverContentProps> = React.memo(({
    item,
    nestedPopover,
    setNestedPopover,
    handleNavigate,
    currentPath,
    getItemIdentifier,
}) => {
    if (!item.children || item.children.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 p-1 min-w-[220px] z-50">
            {item.children.map((child: SidebarMenuItem) => { 
                const itemIdentifier = getItemIdentifier(child);
                const childPath = child.ruta ? (child.ruta.startsWith('/') ? child.ruta : `/${child.ruta}`) : '#';
                const isChildActive = child.ruta && currentPath.startsWith(childPath);
                const hasChildren = child.children && child.children.length > 0;
                const hasValidRoute = child.ruta && child.ruta !== '#' && child.es_activo;

                return (
                    <div 
                        key={itemIdentifier}
                        onMouseEnter={() => {
                            if (hasChildren) {
                                // OK: string | null es el tipo correcto
                                setNestedPopover(itemIdentifier);
                            }
                        }}
                        onMouseLeave={() => {
                            if (hasChildren && nestedPopover === itemIdentifier) {
                                // OK: string | null es el tipo correcto
                                setNestedPopover(null);
                            }
                        }}
                        className="relative"
                    >
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                if (hasValidRoute) {
                                    handleNavigate(childPath);
                                }
                            }}
                            className={`
                                flex items-center p-2 rounded-md transition-colors duration-150
                                ${hasValidRoute ? 'cursor-pointer' : 'cursor-default'}
                                ${isChildActive 
                                    ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-medium' 
                                    : hasValidRoute 
                                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    : 'text-gray-500 dark:text-gray-400'
                                }
                            `}
                        >
                            <span className={`
                                w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0
                                ${isChildActive ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-500'}
                            `}></span>
                            <span className="text-sm truncate">
                                {child.nombre}
                            </span>
                            {hasChildren && (
                                <LucideIcons.ChevronRight className="w-4 h-4 ml-auto text-gray-500 dark:text-gray-400" />
                            )}
                        </div>
                        
                        {nestedPopover === itemIdentifier && hasChildren && (
                            <div className="absolute left-full top-0 ml-2">
                                <PopoverContent 
                                    item={child} 
                                    nestedPopover={nestedPopover} 
                                    setNestedPopover={setNestedPopover}
                                    handleNavigate={handleNavigate}
                                    currentPath={currentPath}
                                    getItemIdentifier={getItemIdentifier}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

const NewSidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { logout, hasRole } = useAuth();
    const { setBreadcrumbs } = useBreadcrumb();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const isAdmin = useMemo(() => hasRole('admin'), [hasRole]);
    
    const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverItem, setPopoverItem] = useState<SidebarMenuItem | null>(null);
    const [nestedPopover, setNestedPopover] = useState<string | null>(null); 

    // Función para buscar breadcrumb (SIN CAMBIOS)
    const findBreadcrumbPath = useCallback((
        items: SidebarMenuItem[], 
        targetPath: string, 
        currentBreadcrumb: Array<{nombre: string, ruta?: string | null}> = []
    ): Array<{nombre: string, ruta?: string | null}> | null => {
        for (const item of items) {
            const itemPath = item.ruta ? (item.ruta.startsWith('/') ? item.ruta : `/${item.ruta}`) : '#';
            const newBreadcrumb = [...currentBreadcrumb, { nombre: item.nombre, ruta: item.ruta || null }];
            
            if (item.ruta && itemPath === targetPath) {
                return newBreadcrumb;
            }
            
            if (item.children && item.children.length > 0) {
                const childResult = findBreadcrumbPath(item.children, targetPath, newBreadcrumb);
                if (childResult) {
                    return childResult;
                }
            }
            
            if (item.ruta && targetPath.startsWith(itemPath) && itemPath !== '/') {
                return newBreadcrumb;
            }
        }
        return null;
    }, []);

    // Actualizar breadcrumb (SIN CAMBIOS)
    useEffect(() => {
        let breadcrumb = findBreadcrumbPath(menuItems, currentPath);
        
        if (!breadcrumb && isAdmin) {
            const adminItem = administrationNavItems.find(item => {
                if (item.isSeparator) return false;
                const itemPath = item.ruta ? (item.ruta.startsWith('/') ? item.ruta : `/${item.ruta}`) : '#';
                return currentPath === itemPath || currentPath.startsWith(itemPath);
            });
            
            if (adminItem) {
                breadcrumb = [
                    { nombre: 'Administración', ruta: null }, 
                    { nombre: adminItem.nombre, ruta: adminItem.ruta || null }
                ];
            }
        }
        
        if (breadcrumb) {
            setBreadcrumbs(breadcrumb);
        } else {
            setBreadcrumbs([]);
        }
    }, [currentPath, menuItems, isAdmin, findBreadcrumbPath, setBreadcrumbs]);

    const handleNavigate = useCallback((path: string) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        navigate(normalizedPath);
        if (isCollapsed) {
            setIsPopoverOpen(false);
            setPopoverItem(null);
            setNestedPopover(null);
        }
    }, [navigate, isCollapsed]);

    const getItemIdentifier = useCallback((item: SidebarMenuItem): string => {
        return `${item.menu_id}-${item.nombre}`;
    }, []);

    const handleMouseEnter = useCallback((item: SidebarMenuItem) => {
        if (!isCollapsed) return;
        setIsPopoverOpen(true);
        setPopoverItem(item);
    }, [isCollapsed]);

    const handleMouseLeave = useCallback(() => {
        if (!isCollapsed) return;
        setIsPopoverOpen(false);
        setPopoverItem(null);
        setNestedPopover(null);
    }, [isCollapsed]);

    const toggleExpanded = useCallback((identifier: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(identifier)) {
                newSet.delete(identifier);
            } else {
                newSet.add(identifier);
            }
            return newSet;
        });
    }, []);

    // Fetch data (SIN CAMBIOS)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const items = await menuService.getSidebarMenu();
                setMenuItems(items);
            } catch (err) {
                console.error('❌ Error fetching sidebar data:', err);
                setError(`No se pudieron cargar los datos del menú. Intente recargar.`);
                setMenuItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin]);

    // Expand Parents (SIN CAMBIOS)
    useEffect(() => {
        const findAndExpandParents = (
            items: SidebarMenuItem[], 
            targetPath: string, 
            currentExpanded: Set<string>
        ) => {
            let found = false;
            
            for (const item of items) {
                const itemIdentifier = getItemIdentifier(item);
                const itemPath = item.ruta ? (item.ruta.startsWith('/') ? item.ruta : `/${item.ruta}`) : '#';

                if (item.ruta && targetPath.startsWith(itemPath) && targetPath !== '/') {
                    return true;
                }
                
                if (item.children && item.children.length > 0) {
                    if (findAndExpandParents(item.children, targetPath, currentExpanded)) {
                        currentExpanded.add(itemIdentifier);
                        found = true;
                    }
                }
            }
            return found;
        };

        const newExpanded = new Set<string>();
        if (menuItems.length > 0) {
            findAndExpandParents(menuItems, currentPath, newExpanded);
        }
        setExpandedItems(newExpanded);
        
    }, [menuItems, currentPath, getItemIdentifier]);

    const collapsedWidthClass = 'w-[72px]';
    const expandedWidthClass = 'w-64';
    const widthClass = isCollapsed ? collapsedWidthClass : expandedWidthClass;

    // Obtención de clases de link (SIN CAMBIOS)
    const getLinkClasses = useCallback((path: string, exactMatch: boolean = false) => {
        const normalizedPath = path === '#' ? '#' : (path.startsWith('/') ? path : `/${path}`);
        const isActive = exactMatch ? currentPath === normalizedPath : currentPath.startsWith(normalizedPath);
        
        return `
            flex items-center p-2 rounded-lg relative
            ${isCollapsed ? 'justify-center' : 'w-full'}
            ${transitionClass}
            ${isActive
                ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 font-medium before:content-[""] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-indigo-600 before:rounded-lg'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
        `;
    }, [currentPath, isCollapsed, transitionClass]);

    // Función auxiliar para renderizar el contenido del item de menú (SIN CAMBIOS)
    const renderLinkContent = (item: SidebarMenuItem, hasChildren: boolean, isExpanded: boolean) => {
        const Icon = getIcon(item.icono, LucideIcons.Circle);
        return (
            <>
                <div className="flex-shrink-0 text-current">
                    {Icon}
                </div>
                {!isCollapsed && (
                    <>
                        <span className="ml-3 text-sm flex-1 truncate">{item.nombre}</span>
                        {hasChildren && (
                            <LucideIcons.ChevronDown 
                                className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            />
                        )}
                    </>
                )}
            </>
        );
    };

    // Función auxiliar para renderizar un elemento con o sin ruta válida (SIN CAMBIOS)
    const renderItemWrapper = useCallback((
        item: SidebarMenuItem, 
        isExpanded: boolean, 
        isChildActive: boolean, 
        indentClass: string
    ) => {
        const itemIdentifier = getItemIdentifier(item);
        const rawPath = item.ruta || '#';
        const itemPath = rawPath === '#' ? '#' : (rawPath.startsWith('/') ? rawPath : `/${rawPath}`);
        const hasValidRoute = item.ruta && item.ruta !== '#' && item.es_activo;
        const hasChildren = item.children && item.children.length > 0;
        
        // Opción 1: Tiene ruta (NavLink)
        if (hasValidRoute) {
            return (
                <div className={`flex items-stretch gap-1 ${indentClass}`}>
                    <NavLink
                        to={itemPath}
                        className={`flex-1 text-left ${getLinkClasses(itemPath, true)}`}
                        end={true}
                    >
                        <div className="flex items-center w-full">
                            {renderLinkContent(item, false, false)} 
                        </div>
                    </NavLink>
                    
                    {hasChildren && (
                        <button
                            onClick={() => toggleExpanded(itemIdentifier)}
                            className={`
                                flex items-center justify-center p-2 rounded-lg flex-shrink-0 w-8
                                ${transitionClass}
                                ${isExpanded || isChildActive
                                    ? 'bg-gray-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }
                            `}
                            title={isExpanded ? 'Colapsar' : 'Expandir'}
                        >
                            <LucideIcons.ChevronDown 
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            />
                        </button>
                    )}
                </div>
            );
        } 
        
        // Opción 2: No tiene ruta pero tiene hijos (Botón/Div para expandir)
        if (hasChildren && !hasValidRoute) {
            return (
                <button
                    onClick={() => toggleExpanded(itemIdentifier)}
                    className={`
                        flex items-center p-2 rounded-lg w-full text-left
                        ${transitionClass} ${indentClass}
                        ${isExpanded || isChildActive
                            ? 'bg-gray-100 dark:bg-gray-700 font-semibold text-indigo-700 dark:text-indigo-400' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                    `}
                >
                    {renderLinkContent(item, hasChildren, isExpanded)}
                </button>
            );
        }
        
        return null; 
    }, [getItemIdentifier, getLinkClasses, toggleExpanded, transitionClass, renderLinkContent]);


    const renderMenuItem = useCallback((item: SidebarMenuItem, level: number = 0) => {
        const itemIdentifier = getItemIdentifier(item);
        const hasChildren = item.children && item.children.length > 0;
        const rawPath = item.ruta || '#';
        const itemPath = rawPath === '#' ? '#' : (rawPath.startsWith('/') ? rawPath : `/${rawPath}`);
        const hasValidRoute = item.ruta && item.ruta !== '#' && item.es_activo;
        const isExpanded = expandedItems.has(itemIdentifier);
        
        const isChildActive = hasChildren && item.children?.some(child => {
            if (!child.ruta) return false;
            const childPath = child.ruta.startsWith('/') ? child.ruta : `/${child.ruta}`;
            return currentPath.startsWith(childPath);
        });
        const isDirectlyActive = hasValidRoute && currentPath.startsWith(itemPath);
        const isActive = isDirectlyActive || isChildActive; 

        const indentClass = level > 0 ? 'pl-4' : '';

        // 1. Colapsado con hijos (Popover)
        if (isCollapsed && hasChildren) {
             return (
                <div key={itemIdentifier}>
                  <Popover
                    isOpen={isPopoverOpen && popoverItem?.menu_id === item.menu_id}
                    positions={['right', 'bottom']}
                    align={'start'}
                    // CORRECCIÓN: zIndex como string
                    containerStyle={{ zIndex: '50' }}
                    content={() => (
                      <PopoverContent
                        item={item}
                        nestedPopover={nestedPopover} 
                        setNestedPopover={setNestedPopover}
                        handleNavigate={handleNavigate}
                        currentPath={currentPath}
                        getItemIdentifier={getItemIdentifier}
                      />
                    )}
                  >
                    <button
                      className={`
                        ${getLinkClasses(itemPath)}
                        ${isActive ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-400' : ''}
                      `}
                      title={item.nombre}
                      onMouseEnter={() => handleMouseEnter(item)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => {
                        if (hasValidRoute) {
                            handleNavigate(itemPath);
                        }
                      }}
                    >
                      {renderLinkContent(item, hasChildren, isExpanded)}
                    </button>
                  </Popover>
                </div>
              );
        }

        // 2. Colapsado sin hijos (NavLink directo)
        if (isCollapsed && !hasChildren) {
             if (!hasValidRoute) {
                 return null;
             }
             return (
                 <NavLink
                    key={itemIdentifier}
                    to={itemPath}
                    className={`${getLinkClasses(itemPath)} ${indentClass}`}
                    title={item.nombre}
                    end={true}
                 >
                     {renderLinkContent(item, hasChildren, isExpanded)}
                 </NavLink>
             );
        }

        // 3. Expandido (con o sin hijos)
        if (!isCollapsed) {
            if (!hasValidRoute && !hasChildren) {
                return null;
            }

            return (
                <div key={itemIdentifier}>
                    {renderItemWrapper(item, isExpanded, isChildActive, indentClass)}
                    
                    {hasChildren && (
                        <div 
                            className={`
                                ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} 
                                overflow-hidden ${transitionClass}
                                ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3
                            `}
                        >
                            {item.children?.map(child => renderMenuItem(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    }, [
        getItemIdentifier, 
        expandedItems, 
        currentPath, 
        isCollapsed, 
        getLinkClasses, 
        renderItemWrapper, // Dependencia de la función auxiliar
        isPopoverOpen,
        popoverItem,
        nestedPopover,
        handleMouseEnter,
        handleMouseLeave,
        handleNavigate,
        transitionClass,
        renderLinkContent
    ]);

    // Renderizados (AJUSTE: Se conserva mt-4 entre áreas)
    const renderDynamicMenu = useMemo(() => {
        const menuByArea = menuItems.reduce((acc, item) => {
            const areaName = item.area_nombre || 'General';
            if (!acc[areaName]) {
                acc[areaName] = [];
            }
            acc[areaName].push(item);
            return acc;
        }, {} as Record<string, SidebarMenuItem[]>);

        return Object.entries(menuByArea).map(([areaName, items]) => (
            <div key={areaName} className="mt-4 first:mt-0"> 
                {!isCollapsed && areaName !== 'General' && ( // Asumiendo que 'General' es el área raíz sin título explícito si hay otras áreas, o lo modificamos para que siempre aparezca el título 'PLANILLAS' debajo de MÓDULOS.
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 pl-2">
                        {areaName}
                    </h3>
                )}
                {/* En el ejemplo, 'PLANILLAS' es el subtítulo que sigue al icono de MODULOS. 
                    Si 'PLANILLAS' es el 'areaName', se usa 'mb-2' para separarlo de los items. */}
                {!isCollapsed && areaName === 'PLANILLAS' && (
                    <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 pl-2">
                        {areaName}
                    </h3>
                )}
                <div className="space-y-1">
                    {items.map(item => renderMenuItem(item))}
                </div>
            </div>
        ));
    }, [menuItems, isCollapsed, renderMenuItem]);

    // Renderizado estático del menú de administración (SIN CAMBIOS)
    const renderAdminStaticMenu = useMemo(() => (
        <div className="mb-3 border-b border-gray-200 dark:border-gray-700 pb-3">
            {!isCollapsed && (
                <div className="mb-2 pl-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <LucideIcons.Shield className="w-4 h-4" />
                        Administración
                    </h2>
                </div>
            )}
            
            {isCollapsed && (
                <div className="mb-3 px-1">
                    <div className="p-2 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <LucideIcons.Shield className="w-5 h-5" />
                    </div>
                </div>
            )}
            
            <div className="space-y-1">
                {administrationNavItems.map((item) => {
                    if (item.isSeparator) { 
                        if (isCollapsed) return null; 
                        return (
                            <h3 
                                key={item.menu_id}
                                className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2 pl-2 mt-4"
                            >
                                {item.nombre}
                            </h3>
                        );
                    }
                    
                    const IconComponent = getIcon(item.icono, LucideIcons.LayoutDashboard);

                    return (
                        <NavLink
                            key={item.menu_id}
                            to={item.ruta || '#'}
                            className={getLinkClasses(item.ruta || '#', true)}
                            title={item.nombre}
                            end={true}
                        >
                            {IconComponent}
                            {!isCollapsed && (
                                <span className="ml-3 text-sm flex-1 truncate">{item.nombre}</span>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    ), [isCollapsed, getLinkClasses]);

    return (
        <div 
            className={`
                fixed top-0 left-0 h-full z-30 
                bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
                flex flex-col flex-shrink-0
                ${widthClass} ${transitionClass}
            `}
            onMouseLeave={handleMouseLeave} 
        >
            
            <div className={`
                flex items-center h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800
                ${isCollapsed ? 'justify-center' : 'justify-between px-4'}
            `}>
                {!isCollapsed && (
                    <div className="font-bold text-lg text-gray-900 dark:text-white truncate">
                        Fidesoft
                    </div>
                )}
                <button
                    onClick={toggleSidebar} 
                    className={`
                        flex items-center p-2 rounded-lg 
                        ${transitionClass} 
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        text-gray-500 dark:text-gray-400 flex-shrink-0
                        ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? 'Expandir' : 'Colapsar'}
                >
                    {isCollapsed ? (
                        <LucideIcons.Menu className="w-5 h-5" />
                    ) : (
                        <LucideIcons.PanelLeftClose className="w-5 h-5" />
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thumb-rounded scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                {loading && (
                    <div className={`p-4 flex flex-col items-center justify-center text-center ${widthClass}`}>
                        <LucideIcons.Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">Cargando...</span>
                    </div>
                )}

                {error && (
                    <div className={`p-4 flex flex-col items-center text-center ${widthClass}`}>
                        <LucideIcons.AlertCircle className="w-6 h-6 text-red-500" />
                        <span className="mt-2 text-sm text-red-500">{error}</span>
                    </div>
                )}

                {!loading && !error && (
                    <nav className="px-2 pb-4">
                        {isAdmin && renderAdminStaticMenu}
                        
                        {menuItems.length > 0 && (
                            <div className="space-y-1"> 
                                {!isCollapsed && isAdmin && (
                                    <div className="pl-2 mb-4"> {/* CAMBIO APLICADO: De mb-1 a mb-2 */}
                                        <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                            <LucideIcons.Boxes className="w-4 h-4" />
                                            Módulos
                                        </h2>
                                    </div>
                                )}

                                {isCollapsed && isAdmin && (
                                     <div className="px-1 mb-1"> 
                                        <div className="p-2 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                            <LucideIcons.Boxes className="w-5 h-5" />
                                        </div>
                                    </div>
                                )}
                                
                                {renderDynamicMenu}
                            </div>
                        )}
                    </nav>
                )}
            </div>

            <div
                className={`
                    border-t border-gray-200 dark:border-gray-800 flex-shrink-0
                    h-auto flex flex-col justify-center p-2
                `}
            >
                <div className="flex flex-col space-y-1"> 
                    <button
                        onClick={toggleDarkMode}
                        className={`
                            flex items-center p-2 rounded-lg 
                            ${transitionClass}
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            text-gray-600 dark:text-gray-300
                            ${isCollapsed ? 'justify-center' : 'w-full'}
                        `}
                        title={isCollapsed ? (isDarkMode ? 'Claro' : 'Oscuro') : (isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro')}
                    >
                        {isDarkMode ? (
                            <LucideIcons.Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                            <LucideIcons.Moon className="w-5 h-5" />
                        )}
                        {!isCollapsed && (
                            <span className="ml-3 text-sm flex-1 text-left">
                                {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                            </span>
                        )}
                    </button>
                    
                    <button
                        onClick={logout}
                        className={`
                            flex items-center p-2 rounded-lg 
                            ${transitionClass}
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            text-gray-600 dark:text-gray-300 group
                            ${isCollapsed ? 'justify-center' : 'w-full'}
                        `}
                        title={isCollapsed ? 'Cerrar Sesión' : 'Cerrar Sesión'}
                    >
                        <LucideIcons.LogOut className="w-5 h-5 group-hover:text-red-500" />
                        {!isCollapsed && (
                            <span className="ml-3 text-sm flex-1 text-left">Cerrar Sesión</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewSidebar;