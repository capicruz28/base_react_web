import React, { useEffect, useState } from "react";
import {
  getPendientesAutorizacion,
  autorizarMultipleProcesos,
} from "../services/autorizacion.service";
import {
  PendienteAutorizacion,
  AutorizacionUpdate,
} from "../types/autorizacion.types";
import { Loader, CheckSquare, X, Search } from "lucide-react";
import { toast } from "react-hot-toast";

function formatDateYYYYMMDD(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const sortData = (data: PendienteAutorizacion[]): PendienteAutorizacion[] => {
  return [...data].sort((a, b) => {
    // Ordenar por fecha_destajo
    const dateA = new Date(a.fecha_destajo).getTime();
    const dateB = new Date(b.fecha_destajo).getTime();
    if (dateA !== dateB) return dateB - dateA;

    // Ordenar por producto
    const prodA = `${a.cod_producto} ${a.producto}`.toLowerCase();
    const prodB = `${b.cod_producto} ${b.producto}`.toLowerCase();
    if (prodA !== prodB) return prodB.localeCompare(prodA);

    // Ordenar por proceso
    const procA = `${a.cod_proceso} ${a.proceso}`.toLowerCase();
    const procB = `${b.cod_proceso} ${b.proceso}`.toLowerCase();
    if (procA !== procB) return procB.localeCompare(procA);

    // Ordenar por subproceso
    const subA = `${a.cod_subproceso || ''} ${a.subproceso || ''}`.toLowerCase();
    const subB = `${b.cod_subproceso || ''} ${b.subproceso || ''}`.toLowerCase();
    return subB.localeCompare(subA);
  });
};

const AutorizacionPage: React.FC = () => {
  const [pendientes, setPendientes] = useState<PendienteAutorizacion[]>([]);
  const [selectedLotes, setSelectedLotes] = useState<Set<string>>(new Set());
  const [selectedRow, setSelectedRow] = useState<{
    lote: string;
    fecha_destajo: string;
    cod_proceso?: string;
    cod_subproceso?: string;
    producto?: string;
    proceso?: string;
    subproceso?: string;
    cliente?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  
  // Estados para modales de confirmación
  const [showAuthorizeModal, setShowAuthorizeModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  // Estados para el rechazo con observación
  const [showRejectObservationModal, setShowRejectObservationModal] = useState<boolean>(false);
  const [rejectObservation, setRejectObservation] = useState<string>("");

  // Estado para el buscador
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Estado para controlar si ya se mostró el toast de selección múltiple
  const [hasShownMultiSelectToast, setHasShownMultiSelectToast] = useState<boolean>(false);

  // Agrupar cabeceras únicas
  const cabeceras = React.useMemo(() => {
    const map = new Map<string, PendienteAutorizacion>();
    for (const item of pendientes) {
      const key = `${item.fecha_destajo}_${item.cod_producto}_${
        item.cod_subproceso || ""
      }_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return sortData(Array.from(map.values()));
  }, [pendientes]);

  // Filtrar cabeceras basado en el término de búsqueda
  const filteredCabeceras = React.useMemo(() => {
    if (!searchTerm.trim()) return cabeceras;
    
    const term = searchTerm.toLowerCase().trim();
    return cabeceras.filter(item => 
      formatDateYYYYMMDD(item.fecha_destajo).toLowerCase().includes(term) ||
      (item.cod_producto || "").toLowerCase().includes(term) ||
      (item.producto || "").toLowerCase().includes(term) ||
      (item.cod_proceso || "").toLowerCase().includes(term) ||
      (item.proceso || "").toLowerCase().includes(term) ||
      (item.cod_subproceso || "").toLowerCase().includes(term) ||
      (item.subproceso || "").toLowerCase().includes(term) ||
      (item.cliente || "").toLowerCase().includes(term) ||
      (item.lote || "").toLowerCase().includes(term)
    );
  }, [cabeceras, searchTerm]);

  const totalPages = Math.ceil(filteredCabeceras.length / itemsPerPage);

  const paginatedCabeceras = filteredCabeceras.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const detalle = React.useMemo(() => {
    if (!selectedRow) return [];
    return pendientes.filter(
      (p) =>
        p.lote === selectedRow.lote &&
        p.fecha_destajo === selectedRow.fecha_destajo &&
        p.cod_proceso === selectedRow.cod_proceso &&
        (p.cod_subproceso || "") === (selectedRow.cod_subproceso || "")
    );
  }, [pendientes, selectedRow]);

  // Cargar lista de pendientes
  const fetchPendientes = async () => {
    setLoading(true);
    try {
      const data = await getPendientesAutorizacion();
      setPendientes(data);
    } catch (err) {
      toast.error("Error al cargar pendientes de autorización.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  // Resetear página cuando cambie el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Seleccionar automáticamente el primer registro cuando cambien las cabeceras filtradas
  useEffect(() => {
    if (filteredCabeceras.length > 0 && !selectedRow) {
      const firstItem = filteredCabeceras[0];
      setSelectedRow({
        lote: firstItem.lote,
        fecha_destajo: firstItem.fecha_destajo,
        cod_proceso: firstItem.cod_proceso,
        cod_subproceso: firstItem.cod_subproceso,
        producto: firstItem.producto,
        proceso: firstItem.proceso,
        subproceso: firstItem.subproceso,
        cliente: firstItem.cliente,
      });
    }
  }, [filteredCabeceras, selectedRow]);

  // Efecto para mostrar toast cuando se seleccionen múltiples registros
  useEffect(() => {
    if (selectedLotes.size > 1 && !hasShownMultiSelectToast) {
      toast.error("La selección múltiple no permite rechazar registros. Solo puede rechazar un registro a la vez.", {
        duration: 5000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
        }
      });
      setHasShownMultiSelectToast(true);
    } else if (selectedLotes.size <= 1) {
      setHasShownMultiSelectToast(false);
    }
  }, [selectedLotes.size, hasShownMultiSelectToast]);

  const toggleCheckbox = (
    lote: string,
    fecha_destajo: string,
    cod_proceso: string,
    cod_subproceso?: string
  ) => {
    const key = `${lote}_${fecha_destajo}_${cod_proceso}_${cod_subproceso || ""}`;
    const updated = new Set(selectedLotes);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    setSelectedLotes(updated);
  };

  const handleRowClick = (item: PendienteAutorizacion) => {
    setSelectedRow({
      lote: item.lote,
      fecha_destajo: item.fecha_destajo,
      cod_proceso: item.cod_proceso,
      cod_subproceso: item.cod_subproceso,
      producto: item.producto,
      proceso: item.proceso,
      subproceso: item.subproceso,
      cliente: item.cliente,
    });
  };

  const handleAutorizar = async () => {
    if (selectedLotes.size === 0) {
      toast.error("Seleccione al menos un registro.");
      return;
    }
    setIsAuthorizing(true);
    try {
      const payload: AutorizacionUpdate[] = [];
      selectedLotes.forEach((key) => {
        const [lote, fecha_destajo, cod_proceso, cod_subproceso] = key.split("_");
        payload.push({
          lote,
          fecha_destajo,
          cod_proceso,
          cod_subproceso: cod_subproceso || undefined,
          nuevo_estado: 'A', // Autorizado
          observacion_autorizacion:"",
        });
      });
      const result = await autorizarMultipleProcesos(payload);
      if (result.exitosos > 0) {
        toast.success(
          `✔ ${result.exitosos} procesos autorizados. ❌ ${result.fallidos} fallidos`
        );
      } else {
        toast.error("No se autorizó ningún proceso.");
      }
      await fetchPendientes();
      setSelectedLotes(new Set());
      setSelectedRow(null);
      setCurrentPage(1);
    } catch (err) {
      toast.error("Error al autorizar procesos.");
      console.error(err);
    } finally {
      setIsAuthorizing(false);
      setShowAuthorizeModal(false);
    }
  };

  const handleRechazar = async () => {
    if (selectedLotes.size === 0) {
      toast.error("Seleccione al menos un registro.");
      return;
    }
    setIsRejecting(true);
    try {
      const payload: AutorizacionUpdate[] = [];
      selectedLotes.forEach((key) => {
        const [lote, fecha_destajo, cod_proceso, cod_subproceso] = key.split("_");
        payload.push({
          lote,
          fecha_destajo,
          cod_proceso,
          cod_subproceso: cod_subproceso || undefined,
          nuevo_estado: 'R', // Rechazado
          observacion_autorizacion: rejectObservation,
        });
      });
      const result = await autorizarMultipleProcesos(payload);
      if (result.exitosos > 0) {
        toast.success(
          `✔ ${result.exitosos} procesos rechazados. ❌ ${result.fallidos} fallidos`
        );
      } else {
        toast.error("No se rechazó ningún proceso.");
      }
      await fetchPendientes();
      setSelectedLotes(new Set());
      setSelectedRow(null);
      setCurrentPage(1);
      setRejectObservation("");
    } catch (err) {
      toast.error("Error al rechazar procesos.");
      console.error(err);
    } finally {
      setIsRejecting(false);
      setShowRejectModal(false);
      setShowRejectObservationModal(false);
    }
  };

  const openAuthorizeModal = () => {
    if (selectedLotes.size === 0) {
      toast.error("Seleccione al menos un registro.");
      return;
    }
    setShowAuthorizeModal(true);
  };

  const openRejectModal = () => {
    if (selectedLotes.size === 0) {
      toast.error("Seleccione al menos un registro.");
      return;
    }

    // Validar que solo se pueda rechazar un registro a la vez
    if (selectedLotes.size > 1) {
      toast.error("Solo puede rechazar un registro a la vez. Por favor, seleccione únicamente un registro.", {
        duration: 4000,
        style: {
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
        }
      });
      return;
    }

    // Mostrar modal para ingresar observación
    setShowRejectObservationModal(true);
  };

  const confirmRejectWithObservation = () => {
    if (!rejectObservation.trim()) {
      toast.error("Debe ingresar un motivo de rechazo.");
      return;
    }
    setShowRejectObservationModal(false);
    setShowRejectModal(true);
  };

  return (
    <div className="w-full">
      {/* Encabezado con buscador y botones alineados */}
      <div className="flex justify-between items-center mb-4 gap-4">
        {/* Buscador */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar en cualquier columna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
        
        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={openRejectModal}
            disabled={isRejecting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            {isRejecting && <Loader className="animate-spin h-4 w-4" />}
            <X className="h-4 w-4" />
            {isRejecting ? "Rechazando..." : "Rechazar Destajo"}
          </button>
          <button
            onClick={openAuthorizeModal}
            disabled={isAuthorizing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            {isAuthorizing && <Loader className="animate-spin h-4 w-4" />}
            <CheckSquare className="h-4 w-4" />
            {isAuthorizing ? "Autorizando..." : "Autorizar Destajo"}
          </button>
        </div>
      </div>

      {/* Modal para ingresar motivo de rechazo */}
      {showRejectObservationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Motivo de Rechazo
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              Debe ingresar un motivo para rechazar el registro seleccionado.
            </p>
            <textarea
              value={rejectObservation}
              onChange={(e) => setRejectObservation(e.target.value)}
              placeholder="Ingrese el motivo del rechazo..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white text-sm"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectObservationModal(false);
                  setRejectObservation("");
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRejectWithObservation}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para Autorizar */}
      {showAuthorizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Autorización
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              ¿Está seguro que desea autorizar {selectedLotes.size} proceso(s) seleccionado(s)?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAuthorizeModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleAutorizar}
                disabled={isAuthorizing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isAuthorizing && <Loader className="animate-spin h-4 w-4" />}
                Confirmar Autorización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para Rechazar */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Rechazo
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              ¿Está seguro que desea rechazar el proceso seleccionado?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">Motivo del rechazo:</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">{rejectObservation}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setShowRejectObservationModal(true);
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Modificar Motivo
              </button>
              <button
                onClick={handleRechazar}
                disabled={isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isRejecting && <Loader className="animate-spin h-4 w-4" />}
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-6">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <p className="ml-3 text-gray-500 dark:text-gray-400 text-sm">
            Cargando pendientes...
          </p>
        </div>
      )}

      {/* Tabla Cabeceras */}
      {!loading && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1 text-left text-table-header">Fecha Destajo</th>
                <th className="px-2 py-1 text-left text-table-header">Producto</th>
                <th className="px-2 py-1 text-left text-table-header">Proceso</th>
                <th className="px-2 py-1 text-left text-table-header">Subproceso</th>
                <th className="px-2 py-1 text-left text-table-header">Cliente</th>
                <th className="px-2 py-1 text-left text-table-header">Lote</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCabeceras.length > 0 ? (
                paginatedCabeceras.map((item, idx) => {
                  const key = `${item.lote}_${item.fecha_destajo}_${item.cod_proceso}_${item.cod_subproceso || ""}`;
                  return (
                    <tr
                      key={idx}
                      onClick={() => handleRowClick(item)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        selectedRow?.lote === item.lote &&
                        selectedRow?.fecha_destajo === item.fecha_destajo &&
                        selectedRow?.cod_proceso === item.cod_proceso &&
                        (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "")
                          ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500"
                          : ""
                      }`}
                    >
                      <td className={`px-2 py-1 text-center ${
                        selectedRow?.lote === item.lote &&
                        selectedRow?.fecha_destajo === item.fecha_destajo &&
                        selectedRow?.cod_proceso === item.cod_proceso &&
                        (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "")
                          ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500"
                          : ""
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedLotes.has(key)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() =>
                            toggleCheckbox(item.lote, item.fecha_destajo, item.cod_proceso, item.cod_subproceso)
                          }
                          className="text-table-cell"
                        />
                      </td>
                      <td className="px-2 py-1 text-table-cell">{formatDateYYYYMMDD(item.fecha_destajo)}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_producto} {item.producto}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_proceso} {item.proceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_subproceso} {item.subproceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cliente}</td>
                      <td className="px-2 py-1 text-table-cell">{item.lote}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                    {searchTerm ? "No se encontraron registros que coincidan con la búsqueda." : "No hay registros pendientes de autorización."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {filteredCabeceras.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm">registros</span>
            {searchTerm && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                (mostrando {filteredCabeceras.length} de {cabeceras.length} registros filtrados)
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Tabla Detalle con título */}
      {selectedRow && (
        <div className="mb-4">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-semibold text-sm">
              Detalle seleccionado → Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | 
              Lote: {selectedRow.lote} | 
              Proceso: {selectedRow.proceso}
              {selectedRow.subproceso && ` | Subproceso: ${selectedRow.subproceso}`}
              {selectedRow.cliente && ` | Cliente: ${selectedRow.cliente}`}
            </h3>
          </div>
          <div className="shadow-md rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 overflow-x-auto max-h-72 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-2 py-1 text-left text-table-header">Cod Trabajador</th>
                  <th className="px-2 py-1 text-left text-table-header">Trabajador</th>
                  <th className="px-2 py-1 text-left text-table-header">Horas</th>
                  <th className="px-2 py-1 text-left text-table-header">Kilos</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {detalle.length > 0 ? (
                  detalle.map((d, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.horas}</td>
                      <td className="px-2 py-1 text-table-cell">{d.kilos}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-500 text-table-detail">
                      No hay detalle para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutorizacionPage;