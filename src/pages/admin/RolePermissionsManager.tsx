// src/components/admin/RolePermissionsManager.tsx (CORREGIDO v2)
import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Loader, AlertCircle } from 'lucide-react';

// --- Importar componentes de shadcn/ui ---
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";

// --- Importar servicios REALES ---
import { menuService } from '@/services/menu.service';
import { permissionService } from '@/services/permission.service';

// --- Importar tipos REALES ---
// Usamos SidebarMenuItem para el estado y la UI interna
// Usamos BackendManageMenuItem para el tipo de datos que esperamos de la API
import type { SidebarMenuItem, BackendManageMenuItem } from '@/types/menu.types';
import type { PermissionState } from '@/types/permission.types';

// --- Props del componente ---
interface RolePermissionsManagerProps {
  isOpen: boolean;
  rolId: number;
  rolName: string;
  onClose: () => void;
  onPermissionsUpdate?: () => void;
}

// --- Interfaz para Datos Agrupados ---
interface GroupedMenuItems {
  [areaName: string]: SidebarMenuItem[];
}

// --- FUNCIÓN DE TRANSFORMACIÓN RECURSIVA (CORREGIDA) ---
// Acepta el tipo de la API (BackendManageMenuItem) y devuelve el tipo del Frontend (SidebarMenuItem)
const transformApiMenuItem = (item: BackendManageMenuItem): SidebarMenuItem => {
    // Transforma el nodo actual
    const transformedNode: SidebarMenuItem = {
        // Mapea campos requeridos/conocidos
        menu_id: item.menu_id,
        nombre: item.nombre,
        // Transforma campos opcionales/problemáticos asegurando compatibilidad con SidebarMenuItem
        icono: item.icono === undefined ? null : item.icono, // undefined -> null
        ruta: item.ruta === undefined ? null : item.ruta,     // undefined -> null
        orden: item.orden === undefined ? null : item.orden,   // undefined -> null (SidebarMenuItem permite null)
        level: item.level, // Asumiendo que level es compatible o no está en SidebarMenuItem
        es_activo: item.es_activo, // Asumiendo que boolean es compatible
        padre_menu_id: item.padre_menu_id === undefined ? null : item.padre_menu_id, // undefined -> null
        area_id: item.area_id === undefined ? null : item.area_id, // undefined -> null
        area_nombre: item.area_nombre === undefined ? null : item.area_nombre, // undefined -> null
        // --- CORRECCIÓN CLAVE: Inicializa children como array vacío ---
        children: [],
    };

    // Si hay hijos en el item original, transfórmalos recursivamente y asigna el resultado
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        transformedNode.children = item.children.map(transformApiMenuItem); // Llamada recursiva
    }

    return transformedNode;
};


const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({
  isOpen,
  rolId,
  rolName,
  onClose,
  onPermissionsUpdate,
}) => {
  // --- Estados Internos (usa SidebarMenuItem) ---
  const [menuTree, setMenuTree] = useState<SidebarMenuItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- Cargar datos (USANDO TRANSFORMACIÓN RECURSIVA CORREGIDA) ---
  const loadData = useCallback(async () => {
    if (!rolId) return;
    setIsLoading(true);
    setError(null);
    setMenuTree([]);
    setPermissions({});
    try {
      console.log(`Cargando datos para rol ID: ${rolId}`);

      // Especificamos explícitamente el tipo esperado de la API para claridad
      const [menuDataFromApi, permissionsData] = await Promise.all([
        menuService.getFullMenuTree() as Promise<BackendManageMenuItem[]>, // Casting explícito
        permissionService.getRolePermissions(rolId),
      ]);

      console.log("Menu Tree Data (Original API):", menuDataFromApi);
      console.log("Permissions Data:", permissionsData);

      // --- Aplicar la transformación recursiva ---
      // Aseguramos que menuDataFromApi es un array antes de mapear
      const transformedMenuData = (menuDataFromApi || []).map(transformApiMenuItem);

      console.log("Menu Tree Data (Transformed):", transformedMenuData);

      // Usar los datos completamente transformados (SidebarMenuItem[])
      setMenuTree(transformedMenuData);
      setPermissions(permissionsData || {});

    } catch (err) {
      console.error("Error loading permissions data:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de permisos.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [rolId]);

  // --- Efecto para cargar datos (sin cambios) ---
  useEffect(() => {
    if (isOpen && rolId) {
      loadData();
    } else {
      setMenuTree([]);
      setPermissions({});
      setError(null);
      setIsLoading(false);
      setIsSaving(false);
    }
  }, [isOpen, rolId, loadData]);

  // --- Handler para cambiar SOLO el permiso 'ver' (sin cambios) ---
  const handleViewPermissionChange = (menuId: number, checked: boolean) => {
    setPermissions(prev => {
      const updatedPermissions = { ...prev };
      if (!updatedPermissions[menuId]) {
        updatedPermissions[menuId] = { ver: false, crear: false, editar: false, eliminar: false };
      }
      updatedPermissions[menuId].ver = checked;
      if (!checked) {
          updatedPermissions[menuId].crear = false;
          updatedPermissions[menuId].editar = false;
          updatedPermissions[menuId].eliminar = false;
      }
      return updatedPermissions;
    });
  };

  // --- Handler para guardar los cambios (sin cambios) ---
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    try {
        const permisosArray = Object.entries(permissions).map(([menuIdStr, perms]) => {
            const menu_id = parseInt(menuIdStr, 10);
            return {
                menu_id: menu_id,
                puede_ver: perms.ver,
                puede_crear: perms.crear,
                puede_editar: perms.editar,
                puede_eliminar: perms.eliminar,
            };
        }).filter(p => !isNaN(p.menu_id));

        console.log(`Enviando permisos para rol ID: ${rolId}`, { permisos: permisosArray });

        const payload = { permisos: permisosArray };
        await permissionService.updateRolePermissions(rolId, payload);

        toast.success(`Permisos para el rol "${rolName}" actualizados.`);
        onPermissionsUpdate?.();
        onClose();

    } catch (err) {
        console.error("Error saving permissions:", err);
        let errorMessage = 'Error al guardar los permisos.';
        if (axios.isAxiosError(err) && err.response?.status === 422 && err.response.data?.detail) {
             try {
                 const details = err.response.data.detail;
                 if (Array.isArray(details)) {
                     errorMessage = details.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('; ');
                 } else if (typeof details === 'string') {
                     errorMessage = details;
                 }
             } catch (parseError) { /* Ignorar */ }
        } else if (err instanceof Error) {
            errorMessage = err.message;
        }
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setIsSaving(false);
    }
  };

  // --- Función recursiva para renderizar el árbol (sin cambios) ---
  const renderMenuNode = (node: SidebarMenuItem, level: number = 0): JSX.Element => {
    const nodePermissions = permissions[node.menu_id] || { ver: false, crear: false, editar: false, eliminar: false };
    const indentClass = `ml-${level * 4}`;

    return (
      <div key={node.menu_id} className={`py-1 ${indentClass}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{node.nombre}</span>
          <div className="flex items-center mr-4">
            <Checkbox
              id={`perm-${node.menu_id}-ver`}
              checked={nodePermissions.ver}
              onCheckedChange={(checked) => handleViewPermissionChange(node.menu_id, !!checked)}
              disabled={isLoading || isSaving}
              aria-label={`Permiso de Ver para ${node.nombre}`}
              className="dark:border-gray-500 dark:data-[state=checked]:bg-indigo-500 dark:data-[state=checked]:border-indigo-500"
            />
          </div>
        </div>
        {/* Ahora node.children siempre es un array, por lo que la condición es segura */}
        {node.children.length > 0 && (
          <div className="border-l border-gray-200 dark:border-gray-700 pl-3">
            {node.children.map((child: SidebarMenuItem) => renderMenuNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // --- Memo para agrupar por área (sin cambios) ---
  const groupedMenuItems = useMemo(() => {
    const groups: GroupedMenuItems = {};
    menuTree.forEach((item) => {
      // Usamos padre_menu_id para identificar los items de nivel superior
      if (!item.padre_menu_id) {
        // Usamos area_nombre para agrupar
        const areaName = item.area_nombre || 'General'; // Fallback a 'General'
        if (!groups[areaName]) {
          groups[areaName] = [];
        }
        groups[areaName].push(item);
      }
    });
    // Ordenar áreas
    const sortedGroups: GroupedMenuItems = {};
    if (groups['General']) {
        sortedGroups['General'] = groups['General'];
        delete groups['General'];
    }
    Object.keys(groups).sort().forEach(areaName => {
        sortedGroups[areaName] = groups[areaName];
    });
    return sortedGroups;
  }, [menuTree]);


  // --- Renderizado del Componente (sin cambios estructurales) ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Gestionar Visibilidad para Rol: <span className="font-bold">{rolName}</span></DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Selecciona los menús que este rol podrá visualizar, agrupados por área.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 py-4 space-y-4">
          {/* Indicadores de carga y error */}
          {isLoading && (
            <div className="flex justify-center items-center h-40">
              <Loader className="animate-spin h-8 w-8 text-indigo-600" />
              <p className="ml-3 text-gray-500 dark:text-gray-400">Cargando estructura y permisos...</p>
            </div>
          )}
          {!isLoading && error && !isSaving && (
             <div className="flex justify-center items-center h-40 text-center text-red-600 dark:text-red-400">
                <AlertCircle className="h-6 w-6 mr-2"/> {error}
             </div>
          )}
          {/* Mensajes si no hay datos */}
          {!isLoading && !error && menuTree.length === 0 && (
             <div className="flex justify-center items-center h-40 text-gray-500 dark:text-gray-400">
                No se encontró la estructura del menú o no hay menús definidos.
             </div>
          )}
          {!isLoading && !error && menuTree.length > 0 && Object.keys(groupedMenuItems).length === 0 && (
             <div className="flex justify-center items-center h-40 text-gray-500 dark:text-gray-400">
                No se encontraron menús de nivel superior con área para agrupar. Verifica la estructura de datos y la lógica de agrupación.
             </div>
          )}
          {/* Renderizado por Áreas */}
          {!isLoading && !error && Object.keys(groupedMenuItems).length > 0 && (
            <div>
              {Object.entries(groupedMenuItems).map(([areaName, itemsInArea]) => (
                <div key={areaName} className="mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <h3 className="text-md font-semibold text-indigo-700 dark:text-indigo-300 mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10">
                    Área: {areaName}
                  </h3>
                  <div className="pl-2">
                    {itemsInArea.map(node => renderMenuNode(node, 0))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con Botones (sin cambios) */}
        <DialogFooter className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
           {error && isSaving && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{error}</p>}
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} disabled={isSaving} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSaveChanges}
            disabled={isLoading || isSaving || menuTree.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {isSaving && <Loader className="animate-spin h-4 w-4 mr-2" />}
            {isSaving ? 'Guardando...' : 'Guardar Visibilidad'} {/* Texto del botón actualizado */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RolePermissionsManager;