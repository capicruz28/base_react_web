// src/pages/admin/RoleManagementPage.tsx

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
// --- Importar servicios y tipos de ROLES ---
import { getRoles, createRol, updateRol, deactivateRol, reactivateRol } from '../../services/rol.service'; // Ajusta la ruta si es necesario
import { Rol, PaginatedRolResponse, RolCreateData, RolUpdateData } from '../../types/rol.types'; // Ajusta la ruta si es necesario
// --- Importar servicios y utilidades comunes ---
import { Loader, Edit3, Plus, Search, EyeOff, Eye, KeyRound } from 'lucide-react'; // <--- Añadido KeyRound

// --- Importar el gestor de permisos (LO CREAREMOS DESPUÉS) ---
import RolePermissionsManager from './RolePermissionsManager'; // Descomentar cuando exista

// --- Hook useDebounce ---
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

// --- Estados iniciales para formularios de Roles ---
const initialCreateFormData: RolCreateData = { nombre: '', descripcion: '', es_activo: true };
const initialEditFormData: RolUpdateData = { nombre: '', descripcion: '', es_activo: true };

// --- Tipo para los errores del formulario ---
type FormErrors = { [key: string]: string | undefined };

// --- Tipo para el rol objetivo de permisos (NUEVO) ---
type PermissionsTargetRol = {
    id: number;
    nombre: string;
} | null;

const RoleManagementPage: React.FC = () => {
  // --- Estados de Tabla y Paginación ---
  const [roles, setRoles] = useState<Rol[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRoles, setTotalRoles] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const limitPerPage = 10;
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // --- Estados MODAL CREACIÓN ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newRolFormData, setNewRolFormData] = useState<RolCreateData>(initialCreateFormData);
  const [createFormErrors, setCreateFormErrors] = useState<FormErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // --- Estados MODAL EDICIÓN ---
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [editFormData, setEditFormData] = useState<RolUpdateData>(initialEditFormData);
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // --- Estados MODAL DESACTIVACIÓN ---
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState<boolean>(false);
  const [deactivatingRol, setDeactivatingRol] = useState<Rol | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  // --- Estados MODAL REACTIVACIÓN ---
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] = useState<boolean>(false);
  const [reactivatingRol, setReactivatingRol] = useState<Rol | null>(null);
  const [isReactivating, setIsReactivating] = useState<boolean>(false);

  // --- Estados MODAL PERMISOS (NUEVO) ---
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(false);
  const [permissionsTargetRol, setPermissionsTargetRol] = useState<PermissionsTargetRol>(null);

  // --- fetchRoles ---
  const fetchRoles = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: PaginatedRolResponse = await getRoles(page, limitPerPage, search || undefined);
      setRoles(data.roles);
      setTotalPages(data.total_paginas);
      setTotalRoles(data.total_roles);
      setCurrentPage(data.pagina_actual);
    } catch (err) {
      console.error("Error in fetchRoles:", err);
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Ocurrió un error al cargar los roles.';
      setError(errorMessage);
      toast.error(errorMessage);
      setRoles([]);
      setTotalPages(1);
      setTotalRoles(0);
    } finally {
      setIsLoading(false);
    }
  }, [limitPerPage]);

  // --- useEffect para cargar datos ---
  useEffect(() => {
    const pageToFetch = debouncedSearchTerm !== searchTerm ? 1 : currentPage;
    if (debouncedSearchTerm !== searchTerm) {
        setCurrentPage(1);
    }
    fetchRoles(pageToFetch, debouncedSearchTerm);
  }, [debouncedSearchTerm, currentPage, fetchRoles, searchTerm]);

  // --- Handlers de búsqueda y paginación ---
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

  // --- FUNCIONES MODAL CREACIÓN ---
  const handleOpenCreateModal = () => {
    setNewRolFormData(initialCreateFormData);
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };
  const handleCloseCreateModal = () => { if (!isSubmittingCreate) setIsCreateModalOpen(false); };
  const handleNewRolChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (event.target as HTMLInputElement).checked : value;
    setNewRolFormData(prev => ({ ...prev, [name]: val }));
    if (createFormErrors[name]) setCreateFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateCreateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!newRolFormData.nombre.trim()) { errors.nombre = 'Nombre del rol requerido.'; isValid = false; }
    setCreateFormErrors(errors);
    return isValid;
  };
  const handleCreateRolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCreateForm()) return;
    setIsSubmittingCreate(true);
    try {
      const dataToSend: RolCreateData = {
        nombre: newRolFormData.nombre.trim(),
        descripcion: newRolFormData.descripcion?.trim() || null,
        es_activo: newRolFormData.es_activo,
      };
      await createRol(dataToSend);
      handleCloseCreateModal();
      toast.success('Rol creado exitosamente.');
      fetchRoles(1, '');
      setSearchTerm('');
    } catch (err) {
      console.error("Error creating rol:", err);
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al crear rol.';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- FUNCIONES MODAL EDICIÓN ---
  const handleOpenEditModal = (rol: Rol) => {
    setEditingRol(rol);
    setEditFormData({
        nombre: rol.nombre || '',
        descripcion: rol.descripcion || '',
        es_activo: rol.es_activo
    });
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => { if (!isSubmittingEdit) setIsEditModalOpen(false); setEditingRol(null); };
  const handleEditRolChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (event.target as HTMLInputElement).checked : value;
    setEditFormData(prev => ({ ...prev, [name]: val }));
    if (editFormErrors[name]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateEditForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!editFormData.nombre?.trim()) { errors.nombre = 'Nombre del rol requerido.'; isValid = false; }
    setEditFormErrors(errors);
    return isValid;
  };
  const handleEditRolSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRol || !validateEditForm()) return;
    setIsSubmittingEdit(true);
    try {
      const dataToUpdate: RolUpdateData = {
        nombre: editFormData.nombre?.trim(),
        descripcion: editFormData.descripcion?.trim() || null,
        es_activo: editFormData.es_activo
      };
      await updateRol(editingRol.rol_id, dataToUpdate);
      handleCloseEditModal();
      toast.success('Rol actualizado exitosamente.');
      fetchRoles(currentPage, debouncedSearchTerm);
    } catch (err) {
      console.error("Error updating rol:", err);
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al actualizar rol.';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- FUNCIONES MODAL DESACTIVACIÓN ---
  const handleOpenDeactivateConfirm = (rol: Rol) => {
    setDeactivatingRol(rol);
    setIsDeactivateConfirmOpen(true);
  };
  const handleCloseDeactivateConfirm = () => { if (!isDeactivating) setIsDeactivateConfirmOpen(false); setDeactivatingRol(null); };
  const handleConfirmDeactivate = async () => {
    if (!deactivatingRol) return;
    setIsDeactivating(true);
    try {
      await deactivateRol(deactivatingRol.rol_id);
      handleCloseDeactivateConfirm();
      toast.success('Rol desactivado exitosamente.');
      fetchRoles(currentPage, debouncedSearchTerm);
    } catch (err) {
      console.error("Error deactivating rol:", err);
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al desactivar rol.';
      toast.error(errorMessage);
    } finally {
      setIsDeactivating(false);
    }
  };

  // --- FUNCIONES MODAL REACTIVACIÓN ---
  const handleOpenReactivateConfirm = (rol: Rol) => {
    setReactivatingRol(rol);
    setIsReactivateConfirmOpen(true);
  };
  const handleCloseReactivateConfirm = () => { if (!isReactivating) setIsReactivateConfirmOpen(false); setReactivatingRol(null); };
  const handleConfirmReactivate = async () => {
    if (!reactivatingRol) return;
    setIsReactivating(true);
    try {
      await reactivateRol(reactivatingRol.rol_id);
      handleCloseReactivateConfirm();
      toast.success('Rol reactivado exitosamente.');
      fetchRoles(currentPage, debouncedSearchTerm);
    } catch (err) {
      console.error("Error reactivating rol:", err);
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al reactivar rol.';
      toast.error(errorMessage);
    } finally {
      setIsReactivating(false);
    }
  };

  // --- FUNCIONES MODAL PERMISOS (NUEVO) ---
  const handleOpenPermissionsModal = (rol: Rol) => {
    setPermissionsTargetRol({ id: rol.rol_id, nombre: rol.nombre });
    setIsPermissionsModalOpen(true);
  };

  const handleClosePermissionsModal = () => {
    setIsPermissionsModalOpen(false);
    // Pequeño delay opcional para animaciones antes de limpiar
    setTimeout(() => {
       setPermissionsTargetRol(null);
    }, 150); // Ajusta si usas animaciones de cierre en el modal
  };


  // --- Renderizado ---
  return (
    <div className="w-full">

      {/* Barra de Búsqueda y Acciones */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-1/3">
            <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
        >
            <Plus className="h-5 w-5" />
            Crear Rol
        </button>
      </div>

      {/* Indicador de Carga */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
            <p className="ml-3 text-gray-500 dark:text-gray-400">Cargando roles...</p>
        </div>
      )}

      {/* Mensaje de Error General */}
      {error && !isLoading && <p className="text-center text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">{error}</p>}

      {/* Tabla de Roles */}
      {!isLoading && !error && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {roles.length > 0 ? (
                roles.map((rol) => (
                  <tr key={rol.rol_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{rol.rol_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{rol.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={rol.descripcion || ''}>{rol.descripcion || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        rol.es_activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {rol.es_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      {/* Botón Editar */}
                      <button
                        onClick={() => handleOpenEditModal(rol)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Editar Rol"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {/* --- Botón Permisos (MODIFICADO) --- */}
                      <button
                        onClick={() => handleOpenPermissionsModal(rol)} // Llama al nuevo handler
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Gestionar Permisos"
                      >
                        <KeyRound className="h-4 w-4" /> {/* Usa el icono importado */}
                      </button>
                      {/* ----------------------------------- */}
                      {/* Botón Desactivar / Reactivar */}
                      {rol.es_activo ? (
                        <button
                          onClick={() => handleOpenDeactivateConfirm(rol)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Desactivar Rol"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReactivateConfirm(rol)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Reactivar Rol"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron roles que coincidan con la búsqueda.' : 'No hay roles para mostrar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Controles de Paginación */}
      {!isLoading && !error && totalRoles > limitPerPage && (
        <div className="py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-4">
          <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{(currentPage - 1) * limitPerPage + 1}</span>
                {' '}a <span className="font-medium">{Math.min(currentPage * limitPerPage, totalRoles)}</span>
                {' '}de <span className="font-medium">{totalRoles}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                 <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </button>
                 <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Página {currentPage} de {totalPages}
                 </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" xmlns="http://w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </button>
              </nav>
            </div>
        </div>
      )}

      {/* --- MODAL DE CREACIÓN DE ROL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Crear Nuevo Rol</h3>
            <form onSubmit={handleCreateRolSubmit} noValidate>
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                    <label htmlFor="create_nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" id="create_nombre" name="nombre" value={newRolFormData.nombre} onChange={handleNewRolChange}
                    className={`mt-1 block w-full px-3 py-2 border ${createFormErrors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingCreate} required />
                    {createFormErrors.nombre && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createFormErrors.nombre}</p>}
                </div>
                {/* Descripción */}
                <div>
                    <label htmlFor="create_descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                    <textarea id="create_descripcion" name="descripcion" value={newRolFormData.descripcion || ''} onChange={handleNewRolChange} rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingCreate} />
                </div>
                {/* Es Activo */}
                <div className="flex items-center">
                    <input id="create_es_activo" name="es_activo" type="checkbox" checked={newRolFormData.es_activo} onChange={handleNewRolChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                    disabled={isSubmittingCreate} />
                    <label htmlFor="create_es_activo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Rol Activo
                    </label>
                </div>
              </div>
              {/* Botones */}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseCreateModal} disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" >
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center" >
                  {isSubmittingCreate && <Loader className="animate-spin h-4 w-4 mr-2" />}
                  {isSubmittingCreate ? 'Creando...' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN DE ROL --- */}
      {isEditModalOpen && editingRol && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Editar Rol: <span className='font-bold'>{editingRol.nombre}</span></h3>
            <form onSubmit={handleEditRolSubmit} noValidate>
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                    <label htmlFor="edit_nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" id="edit_nombre" name="nombre" value={editFormData.nombre || ''} onChange={handleEditRolChange}
                    className={`mt-1 block w-full px-3 py-2 border ${editFormErrors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingEdit} required />
                    {editFormErrors.nombre && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editFormErrors.nombre}</p>}
                </div>
                {/* Descripción */}
                <div>
                    <label htmlFor="edit_descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                    <textarea id="edit_descripcion" name="descripcion" value={editFormData.descripcion || ''} onChange={handleEditRolChange} rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingEdit} />
                </div>
                {/* Es Activo */}
                <div className="flex items-center">
                    <input id="edit_es_activo" name="es_activo" type="checkbox" checked={editFormData.es_activo} onChange={handleEditRolChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                    disabled={isSubmittingEdit} />
                    <label htmlFor="edit_es_activo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Rol Activo
                    </label>
                </div>
              </div>
              {/* Botones */}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseEditModal} disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" >
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center" >
                  {isSubmittingEdit && <Loader className="animate-spin h-4 w-4 mr-2" />}
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE DESACTIVACIÓN --- */}
      {isDeactivateConfirmOpen && deactivatingRol && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Confirmar Desactivación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">¿Estás seguro de que deseas desactivar el rol <strong>{deactivatingRol.nombre}</strong>?</p>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={handleCloseDeactivateConfirm} disabled={isDeactivating}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" >
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmDeactivate} disabled={isDeactivating}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center" >
                {isDeactivating && <Loader className="animate-spin h-4 w-4 mr-2" />}
                {isDeactivating ? 'Desactivando...' : 'Sí, Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE REACTIVACIÓN --- */}
      {isReactivateConfirmOpen && reactivatingRol && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Confirmar Reactivación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">¿Estás seguro de que deseas reactivar el rol <strong>{reactivatingRol.nombre}</strong>?</p>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={handleCloseReactivateConfirm} disabled={isReactivating}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50" >
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmReactivate} disabled={isReactivating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center justify-center" >
                {isReactivating && <Loader className="animate-spin h-4 w-4 mr-2" />}
                {isReactivating ? 'Reactivando...' : 'Sí, Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RENDERIZADO CONDICIONAL DEL MODAL DE PERMISOS (NUEVO) --- */}
      {/* Renderiza el componente solo si hay un rol seleccionado para editar permisos */}
       {permissionsTargetRol && (
        <RolePermissionsManager
          isOpen={isPermissionsModalOpen}
          rolId={permissionsTargetRol.id}
          rolName={permissionsTargetRol.nombre}
          onClose={handleClosePermissionsModal}
          // Opcional: Puedes añadir una función aquí si necesitas actualizar algo
          // en RoleManagementPage después de guardar los permisos.
          // onPermissionsUpdate={() => {
          //   console.log(`Permisos actualizados para el rol ID: ${permissionsTargetRol.id}`);        
          // }}
        />
      )}
      {/* --- FIN RENDERIZADO MODAL PERMISOS --- */}

    </div> // Cierre del contenedor principal
  );
};

export default RoleManagementPage;