// src/pages/admin/AreaManagementPage.tsx

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
// --- Importar servicios y tipos de ÁREAS ---
import { getAreas, createArea, updateArea, deactivateArea, reactivateArea } from '../../services/area.service'; // Ajusta la ruta
import { Area, PaginatedAreaResponse, AreaCreateData, AreaUpdateData } from '../../types/area.types'; // Ajusta la ruta
// --- Importar servicios y utilidades comunes ---
import { Loader, Edit3, Plus, Search, EyeOff, Eye } from 'lucide-react'; // Cambiado KeyRound por IconImage (o elige otro)

// --- Hook useDebounce (sin cambios) ---
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

// --- Estados iniciales para formularios de Áreas ---
const initialCreateFormData: AreaCreateData = { nombre: '', descripcion: '', icono: '', es_activo: true };
const initialEditFormData: AreaUpdateData = { nombre: '', descripcion: '', icono: '', es_activo: true };

// --- Tipo para los errores del formulario (sin cambios) ---
type FormErrors = { [key: string]: string | undefined };

// --- Componente AreaManagementPage ---
const AreaManagementPage: React.FC = () => {
  // --- Estados de Tabla y Paginación ---
  const [areas, setAreas] = useState<Area[]>([]); // <--- Cambiado
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAreas, setTotalAreas] = useState<number>(0); // <--- Cambiado
  const [searchTerm, setSearchTerm] = useState<string>('');
  const limitPerPage = 10;
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // --- Estados MODAL CREACIÓN ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newAreaFormData, setNewAreaFormData] = useState<AreaCreateData>(initialCreateFormData); // <--- Cambiado
  const [createFormErrors, setCreateFormErrors] = useState<FormErrors>({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // --- Estados MODAL EDICIÓN ---
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null); // <--- Cambiado
  const [editFormData, setEditFormData] = useState<AreaUpdateData>(initialEditFormData); // <--- Cambiado
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // --- Estados MODAL DESACTIVACIÓN ---
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState<boolean>(false);
  const [deactivatingArea, setDeactivatingArea] = useState<Area | null>(null); // <--- Cambiado
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false);

  // --- Estados MODAL REACTIVACIÓN ---
  const [isReactivateConfirmOpen, setIsReactivateConfirmOpen] = useState<boolean>(false);
  const [reactivatingArea, setReactivatingArea] = useState<Area | null>(null); // <--- Cambiado
  const [isReactivating, setIsReactivating] = useState<boolean>(false);

  // --- fetchAreas --- // <--- Renombrado
  const fetchAreas = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Llama al servicio de áreas
      const data: PaginatedAreaResponse = await getAreas(page, limitPerPage, search || undefined);
      setAreas(data.areas); // <--- Cambiado
      setTotalPages(data.total_paginas);
      setTotalAreas(data.total_areas); // <--- Cambiado
      setCurrentPage(data.pagina_actual);
    } catch (err) {
      console.error("Error in fetchAreas:", err); // <--- Cambiado
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Ocurrió un error al cargar las áreas.'; // <--- Cambiado
      setError(errorMessage);
      toast.error(errorMessage);
      setAreas([]); // <--- Cambiado
      setTotalPages(1);
      setTotalAreas(0); // <--- Cambiado
    } finally {
      setIsLoading(false);
    }
  }, [limitPerPage]);

  // --- useEffect para cargar datos (llama a fetchAreas) ---
  useEffect(() => {
    const pageToFetch = debouncedSearchTerm !== searchTerm ? 1 : currentPage;
    if (debouncedSearchTerm !== searchTerm) {
        setCurrentPage(1);
    }
    fetchAreas(pageToFetch, debouncedSearchTerm); // <--- Llama a fetchAreas
  }, [debouncedSearchTerm, currentPage, fetchAreas, searchTerm]); // <--- fetchAreas en dependencias

  // --- Handlers de búsqueda y paginación (sin cambios lógicos) ---
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

  // --- FUNCIONES MODAL CREACIÓN ---
  const handleOpenCreateModal = () => {
    setNewAreaFormData(initialCreateFormData); // <--- Cambiado
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };
  const handleCloseCreateModal = () => { if (!isSubmittingCreate) setIsCreateModalOpen(false); };
  const handleNewAreaChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // <--- Renombrado
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (event.target as HTMLInputElement).checked : value;
    setNewAreaFormData(prev => ({ ...prev, [name]: val })); // <--- Cambiado
    if (createFormErrors[name]) setCreateFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateCreateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!newAreaFormData.nombre.trim()) { errors.nombre = 'Nombre del área requerido.'; isValid = false; } // <--- Cambiado texto
    // Puedes añadir validación para icono si es necesario
    setCreateFormErrors(errors);
    return isValid;
  };
  const handleCreateAreaSubmit = async (event: FormEvent<HTMLFormElement>) => { // <--- Renombrado
    event.preventDefault();
    if (!validateCreateForm()) return;
    setIsSubmittingCreate(true);
    try {
      const dataToSend: AreaCreateData = {
        nombre: newAreaFormData.nombre.trim(),
        descripcion: newAreaFormData.descripcion?.trim() || null,
        icono: newAreaFormData.icono?.trim() || null, // <--- Añadido icono
        es_activo: newAreaFormData.es_activo,
      };
      await createArea(dataToSend); // <--- Llama a createArea
      handleCloseCreateModal();
      toast.success('Área creada exitosamente.'); // <--- Cambiado texto
      fetchAreas(1, ''); // <--- Llama a fetchAreas
      setSearchTerm('');
    } catch (err) {
      console.error("Error creating area:", err); // <--- Cambiado
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al crear área.'; // <--- Cambiado texto
      toast.error(errorMessage);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // --- FUNCIONES MODAL EDICIÓN ---
  const handleOpenEditModal = (area: Area) => { // <--- Cambiado tipo y nombre
    setEditingArea(area); // <--- Cambiado
    setEditFormData({ // <--- Cambiado
        nombre: area.nombre || '',
        descripcion: area.descripcion || '',
        icono: area.icono || '', // <--- Añadido icono
        es_activo: area.es_activo
    });
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => { if (!isSubmittingEdit) setIsEditModalOpen(false); setEditingArea(null); }; // <--- Cambiado
  const handleEditAreaChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // <--- Renombrado
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const val = isCheckbox ? (event.target as HTMLInputElement).checked : value;
    setEditFormData(prev => ({ ...prev, [name]: val })); // <--- Cambiado
    if (editFormErrors[name]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateEditForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;
    if (!editFormData.nombre?.trim()) { errors.nombre = 'Nombre del área requerido.'; isValid = false; } // <--- Cambiado texto
    setEditFormErrors(errors);
    return isValid;
  };
  const handleEditAreaSubmit = async (event: FormEvent<HTMLFormElement>) => { // <--- Renombrado
    event.preventDefault();
    if (!editingArea || !validateEditForm()) return; // <--- Cambiado
    setIsSubmittingEdit(true);
    try {
      const dataToUpdate: AreaUpdateData = {
        nombre: editFormData.nombre?.trim(),
        descripcion: editFormData.descripcion?.trim() || null,
        icono: editFormData.icono?.trim() || null, // <--- Añadido icono
        es_activo: editFormData.es_activo
      };
      await updateArea(editingArea.area_id, dataToUpdate); // <--- Llama a updateArea y usa area_id
      handleCloseEditModal();
      toast.success('Área actualizada exitosamente.'); // <--- Cambiado texto
      fetchAreas(currentPage, debouncedSearchTerm); // <--- Llama a fetchAreas
    } catch (err) {
      console.error("Error updating area:", err); // <--- Cambiado
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al actualizar área.'; // <--- Cambiado texto
      toast.error(errorMessage);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- FUNCIONES MODAL DESACTIVACIÓN ---
  const handleOpenDeactivateConfirm = (area: Area) => { // <--- Cambiado tipo y nombre
    setDeactivatingArea(area); // <--- Cambiado
    setIsDeactivateConfirmOpen(true);
  };
  const handleCloseDeactivateConfirm = () => { if (!isDeactivating) setIsDeactivateConfirmOpen(false); setDeactivatingArea(null); }; // <--- Cambiado
  const handleConfirmDeactivate = async () => {
    if (!deactivatingArea) return; // <--- Cambiado
    setIsDeactivating(true);
    try {
      await deactivateArea(deactivatingArea.area_id); // <--- Llama a deactivateArea y usa area_id
      handleCloseDeactivateConfirm();
      toast.success('Área desactivada exitosamente.'); // <--- Cambiado texto
      fetchAreas(currentPage, debouncedSearchTerm); // <--- Llama a fetchAreas
    } catch (err) {
      console.error("Error deactivating area:", err); // <--- Cambiado
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al desactivar área.'; // <--- Cambiado texto
      toast.error(errorMessage);
    } finally {
      setIsDeactivating(false);
    }
  };

  // --- FUNCIONES MODAL REACTIVACIÓN ---
  const handleOpenReactivateConfirm = (area: Area) => { // <--- Cambiado tipo y nombre
    setReactivatingArea(area); // <--- Cambiado
    setIsReactivateConfirmOpen(true);
  };
  const handleCloseReactivateConfirm = () => { if (!isReactivating) setIsReactivateConfirmOpen(false); setReactivatingArea(null); }; // <--- Cambiado
  const handleConfirmReactivate = async () => {
    if (!reactivatingArea) return; // <--- Cambiado
    setIsReactivating(true);
    try {
      await reactivateArea(reactivatingArea.area_id); // <--- Llama a reactivateArea y usa area_id
      handleCloseReactivateConfirm();
      toast.success('Área reactivada exitosamente.'); // <--- Cambiado texto
      fetchAreas(currentPage, debouncedSearchTerm); // <--- Llama a fetchAreas
    } catch (err) {
      console.error("Error reactivating area:", err); // <--- Cambiado
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Error al reactivar área.'; // <--- Cambiado texto
      toast.error(errorMessage);
    } finally {
      setIsReactivating(false);
    }
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
            Crear Área {/* <--- Cambiado texto botón */}
        </button>
      </div>

      {/* Indicador de Carga */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin h-8 w-8 text-indigo-600" />
            <p className="ml-3 text-gray-500 dark:text-gray-400">Cargando áreas...</p> {/* <--- Cambiado texto */}
        </div>
      )}

      {/* Mensaje de Error General */}
      {error && !isLoading && <p className="text-center text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200 p-3 rounded-md">{error}</p>}

      {/* Tabla de Áreas */}
      {!isLoading && !error && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {/* --- Cabeceras de tabla ajustadas --- */}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Icono</th> {/* <--- Nueva columna */}
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {areas.length > 0 ? ( // <--- Cambiado
                areas.map((area) => ( // <--- Cambiado
                  <tr key={area.area_id} className="hover:bg-gray-50 dark:hover:bg-gray-800"> {/* <--- Usa area_id */}
                    {/* --- Celdas de tabla ajustadas --- */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{area.area_id}</td> {/* <--- Usa area_id */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{area.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={area.descripcion || ''}>{area.descripcion || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{area.icono || '-'}</td> {/* <--- Nueva celda icono */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        area.es_activo // <--- Usa area.es_activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {area.es_activo ? 'Activo' : 'Inactivo'} {/* <--- Usa area.es_activo */}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      {/* Botón Editar */}
                      <button
                        onClick={() => handleOpenEditModal(area)} // <--- Pasa area
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Editar Área" // <--- Cambiado title
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {/* Botón Desactivar / Reactivar */}
                      {area.es_activo ? ( // <--- Usa area.es_activo
                        <button
                          onClick={() => handleOpenDeactivateConfirm(area)} // <--- Pasa area
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Desactivar Área" // <--- Cambiado title
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReactivateConfirm(area)} // <--- Pasa area
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Reactivar Área" // <--- Cambiado title
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  {/* --- Ajustado colSpan --- */}
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron áreas que coincidan con la búsqueda.' : 'No hay áreas para mostrar.'} {/* <--- Cambiado texto */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Controles de Paginación (Ajustado totalAreas) */}
      {!isLoading && !error && totalAreas > limitPerPage && ( // <--- Cambiado
        <div className="py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-4">
          <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{(currentPage - 1) * limitPerPage + 1}</span>
                {' '}a <span className="font-medium">{Math.min(currentPage * limitPerPage, totalAreas)}</span> {/* <--- Cambiado */}
                {' '}de <span className="font-medium">{totalAreas}</span> resultados {/* <--- Cambiado */}
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
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                </button>
              </nav>
            </div>
        </div>
      )}

      {/* --- MODAL DE CREACIÓN DE ÁREA --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Crear Nueva Área</h3> {/* <--- Cambiado título */}
            <form onSubmit={handleCreateAreaSubmit} noValidate> {/* <--- Llama a handleCreateAreaSubmit */}
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                    <label htmlFor="create_nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" id="create_nombre" name="nombre" value={newAreaFormData.nombre} onChange={handleNewAreaChange} // <--- Llama a handleNewAreaChange
                    className={`mt-1 block w-full px-3 py-2 border ${createFormErrors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingCreate} required />
                    {createFormErrors.nombre && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createFormErrors.nombre}</p>}
                </div>
                {/* Descripción */}
                <div>
                    <label htmlFor="create_descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                    <textarea id="create_descripcion" name="descripcion" value={newAreaFormData.descripcion || ''} onChange={handleNewAreaChange} rows={3} // <--- Llama a handleNewAreaChange
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingCreate} />
                </div>
                {/* Icono */}
                <div>
                    <label htmlFor="create_icono" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icono (Nombre Lucide)</label>
                    <input type="text" id="create_icono" name="icono" value={newAreaFormData.icono || ''} onChange={handleNewAreaChange} // <--- Llama a handleNewAreaChange
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: FolderKanban"
                    disabled={isSubmittingCreate} />
                     {/* Podrías añadir un preview del icono si importas dinámicamente */}
                </div>
                {/* Es Activo */}
                <div className="flex items-center">
                    <input id="create_es_activo" name="es_activo" type="checkbox" checked={newAreaFormData.es_activo} onChange={handleNewAreaChange} // <--- Llama a handleNewAreaChange
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                    disabled={isSubmittingCreate} />
                    <label htmlFor="create_es_activo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Área Activa {/* <--- Cambiado texto */}
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
                  {isSubmittingCreate ? 'Creando...' : 'Crear Área'} {/* <--- Cambiado texto */}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN DE ÁREA --- */}
      {isEditModalOpen && editingArea && ( // <--- Cambiado
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Editar Área: <span className='font-bold'>{editingArea.nombre}</span></h3> {/* <--- Cambiado título */}
            <form onSubmit={handleEditAreaSubmit} noValidate> {/* <--- Llama a handleEditAreaSubmit */}
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                    <label htmlFor="edit_nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" id="edit_nombre" name="nombre" value={editFormData.nombre || ''} onChange={handleEditAreaChange} // <--- Llama a handleEditAreaChange
                    className={`mt-1 block w-full px-3 py-2 border ${editFormErrors.nombre ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} rounded-md shadow-sm focus:outline-none sm:text-sm dark:bg-gray-700 dark:text-white`}
                    disabled={isSubmittingEdit} required />
                    {editFormErrors.nombre && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editFormErrors.nombre}</p>}
                </div>
                {/* Descripción */}
                <div>
                    <label htmlFor="edit_descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                    <textarea id="edit_descripcion" name="descripcion" value={editFormData.descripcion || ''} onChange={handleEditAreaChange} rows={3} // <--- Llama a handleEditAreaChange
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    disabled={isSubmittingEdit} />
                </div>
                 {/* Icono */}
                 <div>
                    <label htmlFor="edit_icono" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Icono (Nombre Lucide)</label>
                    <input type="text" id="edit_icono" name="icono" value={editFormData.icono || ''} onChange={handleEditAreaChange} // <--- Llama a handleEditAreaChange
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: FolderKanban"
                    disabled={isSubmittingEdit} />
                </div>
                {/* Es Activo */}
                <div className="flex items-center">
                    <input id="edit_es_activo" name="es_activo" type="checkbox" checked={editFormData.es_activo} onChange={handleEditAreaChange} // <--- Llama a handleEditAreaChange
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-indigo-600 dark:ring-offset-gray-800"
                    disabled={isSubmittingEdit} />
                    <label htmlFor="edit_es_activo" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Área Activa {/* <--- Cambiado texto */}
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
      {isDeactivateConfirmOpen && deactivatingArea && ( // <--- Cambiado
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Confirmar Desactivación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">¿Estás seguro de que deseas desactivar el área <strong>{deactivatingArea.nombre}</strong>?</p> {/* <--- Cambiado texto */}
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
      {isReactivateConfirmOpen && reactivatingArea && ( // <--- Cambiado
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-2">Confirmar Reactivación</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">¿Estás seguro de que deseas reactivar el área <strong>{reactivatingArea.nombre}</strong>?</p> {/* <--- Cambiado texto */}
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

      {/* --- ELIMINADO MODAL DE PERMISOS --- */}

    </div> // Cierre del contenedor principal
  );
};

export default AreaManagementPage;