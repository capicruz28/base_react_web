// src/pages/admin/UserManagementPage.tsx

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Loader, Edit3, Trash2, UserPlus, Search } from 'lucide-react';

// Servicios de Usuario y Rol
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  assignRoleToUser,
  revokeRoleFromUser
} from '../../services/usuario.service';
import { getAllActiveRoles } from '../../services/rol.service';

// Tipos
import { UserWithRoles, PaginatedUsersResponse, UserFormData, UserUpdateData } from '../../types/usuario.types';
import { Rol } from '../../types/rol.types';

// Utilidad de errores
import { getErrorMessage } from '../../services/error.service';

// Guard de autenticación
import { useAuth } from '../../context/AuthContext';

// Hook useDebounce
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

// Estados iniciales
const initialCreateFormData: UserFormData = {
  nombre_usuario: '',
  correo: '',
  contrasena: '',
  nombre: '',
  apellido: '',
};
const initialEditFormData: UserUpdateData = {
  correo: '',
  nombre: '',
  apellido: '',
  es_activo: true,
};

type FormErrors = { [key: string]: string | undefined };

const UserManagementPage: React.FC = () => {
  // Autenticación (guards para no disparar fetch sin token)
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Tabla y paginación
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const limitPerPage = 10;
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Roles disponibles
  const [availableRoles, setAvailableRoles] = useState<Rol[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);

  // Modal creación
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newUserFormData, setNewUserFormData] = useState<UserFormData>(initialCreateFormData);
  const [createFormErrors, setCreateFormErrors] = useState<FormErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [selectedCreateRoleIds, setSelectedCreateRoleIds] = useState<number[]>([]);

  // Modal edición
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editFormData, setEditFormData] = useState<UserUpdateData>(initialEditFormData);
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [selectedEditRoleIds, setSelectedEditRoleIds] = useState<number[]>([]);

  // Modal desactivación
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch de usuarios
  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: PaginatedUsersResponse = await getUsers(page, limitPerPage, search || undefined);
      setUsers(data.usuarios);
      setTotalPages(data.total_paginas);
      setTotalUsers(data.total_usuarios);
      setCurrentPage(data.pagina_actual);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      const errorData = getErrorMessage(err);
      setError(errorData.message || 'Ocurrió un error al cargar los usuarios.');
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setIsLoading(false);
    }
  }, [limitPerPage]);

  // Fetch de roles
  const fetchAvailableRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const roles = await getAllActiveRoles();
      setAvailableRoles(roles);
    } catch (err) {
      console.error('Error fetching available roles:', err);
      toast.error(getErrorMessage(err).message || 'Error al cargar roles disponibles.');
      setAvailableRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  // Carga de usuarios con guards de auth
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const pageToFetch = debouncedSearchTerm !== searchTerm ? 1 : currentPage;
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
    }
    fetchUsers(pageToFetch, debouncedSearchTerm);
  }, [debouncedSearchTerm, currentPage, fetchUsers, searchTerm, authLoading, isAuthenticated]);

  // Carga de roles al montar con guards de auth
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchAvailableRoles();
  }, [fetchAvailableRoles, authLoading, isAuthenticated]);

  // Handlers de búsqueda y paginación
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

  // Modal creación: abrir/cerrar
  const handleOpenCreateModal = () => {
    setNewUserFormData(initialCreateFormData);
    setSelectedCreateRoleIds([]);
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };
  const handleCloseCreateModal = () => {
    if (!isSubmittingCreate) {
      setIsCreateModalOpen(false);
      setSelectedCreateRoleIds([]);
    }
  };

  // Form creación: cambios
  const handleNewUserChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewUserFormData(prev => ({ ...prev, [name]: value }));
    if (createFormErrors[name]) setCreateFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const handleCreateRoleSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => parseInt(option.value, 10));
    setSelectedCreateRoleIds(selectedOptions);
  };

  // Validación creación
  const validateCreateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!newUserFormData.nombre_usuario.trim()) { errors.nombre_usuario = 'Nombre de usuario requerido.'; isValid = false; }
    if (!newUserFormData.correo.trim()) { errors.correo = 'Correo requerido.'; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(newUserFormData.correo)) { errors.correo = 'Formato de correo inválido.'; isValid = false; }
    if (!newUserFormData.contrasena) { errors.contrasena = 'Contraseña requerida.'; isValid = false; }
    else if (newUserFormData.contrasena.length < 8) { errors.contrasena = 'Contraseña debe tener al menos 8 caracteres.'; isValid = false; }
    setCreateFormErrors(errors);
    return isValid;
  };

  // Submit creación
  const handleCreateUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCreateForm()) return;
    setIsSubmittingCreate(true);
    let createdUserId: number | null = null;

    try {
      const dataToSend: UserFormData = {
        nombre_usuario: newUserFormData.nombre_usuario.trim(),
        correo: newUserFormData.correo.trim(),
        contrasena: newUserFormData.contrasena,
        nombre: newUserFormData.nombre?.trim() || undefined,
        apellido: newUserFormData.apellido?.trim() || undefined,
      };
      const createdUser = await createUser(dataToSend);
      createdUserId = createdUser.usuario_id;
      toast.success('Usuario creado exitosamente. Asignando roles...');

      if (selectedCreateRoleIds.length > 0 && createdUserId) {
        const roleAssignmentPromises = selectedCreateRoleIds.map(roleId =>
          assignRoleToUser(createdUserId!, roleId)
        );
        await Promise.all(roleAssignmentPromises);
        toast.success('Roles asignados correctamente.');
      }

      handleCloseCreateModal();
      setSearchTerm('');
      fetchUsers(1, '');

    } catch (err) {
      console.error('Error creating user or assigning roles:', err);
      const errorData = getErrorMessage(err);
      if (createdUserId) {
        toast.error(`Usuario creado (ID: ${createdUserId}), pero hubo un error asignando roles: ${errorData.message}`);
      } else {
        toast.error(errorData.message || 'Error al crear usuario.');
      }
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Modal edición: abrir/cerrar
  const handleOpenEditModal = (user: UserWithRoles) => {
    setEditingUser(user);
    setEditFormData({
      correo: user.correo || '',
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      es_activo: user.es_activo,
    });
    setSelectedEditRoleIds(user.roles.map(role => role.rol_id));
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    if (!isSubmittingEdit) {
      setIsEditModalOpen(false);
      setEditingUser(null);
      setSelectedEditRoleIds([]);
    }
  };

  // Form edición: cambios
  const handleEditUserChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (event.target as HTMLInputElement).checked : value;
    setEditFormData(prev => ({ ...prev, [name]: val }));
    if (editFormErrors[name]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const handleEditRoleSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => parseInt(option.value, 10));
    setSelectedEditRoleIds(selectedOptions);
  };

  // Validación edición
  const validateEditForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!editFormData.correo.trim()) { errors.correo = 'Correo requerido.'; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(editFormData.correo)) { errors.correo = 'Formato de correo inválido.'; isValid = false; }
    setEditFormErrors(errors);
    return isValid;
  };

  // Submit edición
  const handleEditUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser || !validateEditForm()) return;
    setIsSubmittingEdit(true);

    const userId = editingUser.usuario_id;
    const initialRoleIds = editingUser.roles.map(r => r.rol_id);

    try {
      // Actualizar datos básicos
      const dataToUpdate: UserUpdateData = {
        correo: editFormData.correo.trim(),
        nombre: editFormData.nombre?.trim() || null,
        apellido: editFormData.apellido?.trim() || null,
        es_activo: editFormData.es_activo,
      };
      await updateUser(userId, dataToUpdate);
      toast.success('Datos del usuario actualizados. Actualizando roles...');

      // Determinar cambios en roles
      const rolesToAdd = selectedEditRoleIds.filter(id => !initialRoleIds.includes(id));
      const rolesToRemove = initialRoleIds.filter(id => !selectedEditRoleIds.includes(id));

      // Ejecutar cambios
      const assignmentPromises = rolesToAdd.map(roleId => assignRoleToUser(userId, roleId));
      const revocationPromises = rolesToRemove.map(roleId => revokeRoleFromUser(userId, roleId));
      await Promise.all([...assignmentPromises, ...revocationPromises]);

      toast.success('Roles actualizados correctamente.');
      handleCloseEditModal();
      fetchUsers(currentPage, debouncedSearchTerm);

    } catch (err) {
      console.error('Error updating user or roles:', err);
      const errorData = getErrorMessage(err);
      toast.error(errorData.message || 'Error al actualizar usuario o sus roles.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Modal desactivación
  const handleOpenDeleteConfirm = (user: UserWithRoles) => {
    setDeletingUser(user);
    setIsDeleteConfirmOpen(true);
  };
  const handleCloseDeleteConfirm = () => {
    if (!isDeleting) setIsDeleteConfirmOpen(false);
    setDeletingUser(null);
  };
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await deleteUser(deletingUser.usuario_id);
      handleCloseDeleteConfirm();
      toast.success('Usuario desactivado exitosamente.');
      fetchUsers(currentPage, debouncedSearchTerm);
    } catch (err) {
      console.error('Error deactivating user:', err);
      const errorData = getErrorMessage(err);
      toast.error(errorData.message || 'Error al desactivar usuario.');
    } finally {
      setIsDeleting(false);
    }
  };

  // UI
  return (
    <div className="w-full">      
      {/* Barra de Búsqueda y Acciones */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, correo..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
          disabled={isLoadingRoles || authLoading || !isAuthenticated}
          title={!isAuthenticated ? 'Debe iniciar sesión' : undefined}
        >
          <UserPlus className="h-5 w-5" />
          Crear Usuario
        </button>
      </div>

      {/* Indicadores de carga */}
      {(isLoading || isLoadingRoles || authLoading) && (
        <div className="flex justify-center items-center py-10">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <p className="ml-3 text-gray-500 dark:text-gray-400">
            {authLoading ? 'Verificando sesión...' : isLoading ? 'Cargando usuarios...' : 'Cargando roles...'}
          </p>
        </div>
      )}

      {/* Error general */}
      {error && !isLoading && !authLoading && (
        <p className="text-center text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">{error}</p>
      )}

      {/* Tabla de usuarios */}
      {!isLoading && !authLoading && !error && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Correo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Activo</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.usuario_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{user.usuario_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.nombre_usuario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.correo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{`${user.nombre || ''} ${user.apellido || ''}`.trim() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {user.roles.length > 0
                        ? user.roles.map(role => (
                            <span
                              key={role.rol_id}
                              className="px-2 py-1 mr-1 mb-1 inline-block text-xs font-semibold bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200"
                            >
                              {role.nombre}
                            </span>
                          ))
                        : <span className="italic text-gray-400 dark:text-gray-500">Sin roles</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.es_activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.es_activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Editar Usuario y Roles"
                        disabled={isLoadingRoles || authLoading || !isAuthenticated}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteConfirm(user)}
                        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          !user.es_activo
                            ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                        }`}
                        title={user.es_activo ? 'Desactivar Usuario' : 'Usuario ya inactivo'}
                        disabled={!user.es_activo || authLoading || !isAuthenticated}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios para mostrar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!isLoading && !authLoading && !error && totalUsers > limitPerPage && (
        <div className="py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-4">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando <span className="font-medium">{(currentPage - 1) * limitPerPage + 1}</span>
              {' '}a <span className="font-medium">{Math.min(currentPage * limitPerPage, totalUsers)}</span>
              {' '}de <span className="font-medium">{totalUsers}</span> resultados
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
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
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
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Modal Crear */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Crear Nuevo Usuario</h3>
            <form onSubmit={handleCreateUserSubmit} noValidate>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label htmlFor="nombre_usuario" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre de Usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre_usuario"
                    name="nombre_usuario"
                    value={newUserFormData.nombre_usuario}
                    onChange={handleNewUserChange}
                    className={`mt-1 block w-full px-3 py-2 border ${createFormErrors.nombre_usuario ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingCreate}
                    required
                  />
                  {createFormErrors.nombre_usuario && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createFormErrors.nombre_usuario}</p>}
                </div>
                <div>
                  <label htmlFor="correo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    value={newUserFormData.correo}
                    onChange={handleNewUserChange}
                    className={`mt-1 block w-full px-3 py-2 border ${createFormErrors.correo ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingCreate}
                    required
                  />
                  {createFormErrors.correo && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createFormErrors.correo}</p>}
                </div>
                <div>
                  <label htmlFor="contrasena" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="contrasena"
                    name="contrasena"
                    value={newUserFormData.contrasena}
                    onChange={handleNewUserChange}
                    className={`mt-1 block w-full px-3 py-2 border ${createFormErrors.contrasena ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingCreate}
                    required
                  />
                  {createFormErrors.contrasena && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createFormErrors.contrasena}</p>}
                </div>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre (Opcional)</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={newUserFormData.nombre || ''}
                    onChange={handleNewUserChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingCreate}
                  />
                </div>
                <div>
                  <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido (Opcional)</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={newUserFormData.apellido || ''}
                    onChange={handleNewUserChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingCreate}
                  />
                </div>

                {/* Selección de Roles */}
                <div>
                  <label htmlFor="create_roles" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</label>
                  <select
                    id="create_roles"
                    name="roles"
                    multiple
                    value={selectedCreateRoleIds.map(String)}
                    onChange={handleCreateRoleSelectionChange}
                    disabled={isSubmittingCreate || isLoadingRoles || availableRoles.length === 0}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600"
                    size={Math.min(5, availableRoles.length || 1)}
                  >
                    {isLoadingRoles && <option disabled>Cargando roles...</option>}
                    {!isLoadingRoles && availableRoles.length === 0 && <option disabled>No hay roles disponibles</option>}
                    {!isLoadingRoles && availableRoles.map(role => (
                      <option key={role.rol_id} value={role.rol_id}>{role.nombre}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mantén presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples roles.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || isLoadingRoles}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmittingCreate && <Loader className="animate-spin h-4 w-4 mr-2" />}
                  {isSubmittingCreate ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Editar Usuario: <span className="font-bold">{editingUser.nombre_usuario}</span>
            </h3>
            <form onSubmit={handleEditUserSubmit} noValidate>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label htmlFor="edit_correo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="edit_correo"
                    name="correo"
                    value={editFormData.correo}
                    onChange={handleEditUserChange}
                    className={`mt-1 block w-full px-3 py-2 border ${editFormErrors.correo ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingEdit}
                    required
                  />
                  {editFormErrors.correo && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editFormErrors.correo}</p>}
                </div>
                <div>
                  <label htmlFor="edit_nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                  <input
                    type="text"
                    id="edit_nombre"
                    name="nombre"
                    value={editFormData.nombre || ''}
                    onChange={handleEditUserChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingEdit}
                  />
                </div>
                <div>
                  <label htmlFor="edit_apellido" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido</label>
                  <input
                    type="text"
                    id="edit_apellido"
                    name="apellido"
                    value={editFormData.apellido || ''}
                    onChange={handleEditUserChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingEdit}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="edit_es_activo"
                    name="es_activo"
                    type="checkbox"
                    checked={editFormData.es_activo}
                    onChange={handleEditUserChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                    disabled={isSubmittingEdit}
                  />
                  <label htmlFor="edit_es_activo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Usuario Activo
                  </label>
                </div>

                {/* Selección de Roles */}
                <div>
                  <label htmlFor="edit_roles" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</label>
                  <select
                    id="edit_roles"
                    name="roles"
                    multiple
                    value={selectedEditRoleIds.map(String)}
                    onChange={handleEditRoleSelectionChange}
                    disabled={isSubmittingEdit || isLoadingRoles || availableRoles.length === 0}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-600"
                    size={Math.min(5, availableRoles.length || 1)}
                  >
                    {isLoadingRoles && <option disabled>Cargando roles...</option>}
                    {!isLoadingRoles && availableRoles.length === 0 && <option disabled>No hay roles disponibles</option>}
                    {!isLoadingRoles && availableRoles.map(role => (
                      <option key={role.rol_id} value={role.rol_id}>{role.nombre}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mantén presionada la tecla Ctrl (o Cmd en Mac) para seleccionar múltiples roles.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || isLoadingRoles}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmittingEdit && <Loader className="animate-spin h-4 w-4 mr-2" />}
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Desactivación */}
      {isDeleteConfirmOpen && deletingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Confirmar Desactivación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              ¿Estás seguro de que deseas desactivar al usuario <strong>{deletingUser.nombre_usuario}</strong>?
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting && <Loader className="animate-spin h-4 w-4 mr-2" />}
                {isDeleting ? 'Desactivando...' : 'Sí, Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;