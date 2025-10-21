import React, { useEffect, useState } from "react";
import {
  getPendientesAutorizacion,
  finalizarTareo,
} from "../services/autorizacion.service";
import {
  PendienteAutorizacion,
  FinalizarTareoRequest,
} from "../types/autorizacion.types";
import { Loader, Save, Copy, Search } from "lucide-react";
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

interface DetalleEditable {
  cod_trabajador: string;
  trabajador: string;
  horas: number;
  kilos: number;
  detalle_observacion: string;
}

const FinalizarTareoPage: React.FC = () => {
  const [pendientes, setPendientes] = useState<PendienteAutorizacion[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para el buscador
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Formulario
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [tipoValor, setTipoValor] = useState<"horas" | "kilos">("horas");
  const [valorInput, setValorInput] = useState<number>(0);
  const [prorratear, setProrratear] = useState(false);
  const [observacion, setObservacion] = useState("");

  // Paginación cabecera
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [detalleEditable, setDetalleEditable] = useState<DetalleEditable[]>([]);

  // Función para formatear hora automáticamente
  const formatearHora = (value: string): string => {
    let val = value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length > 2) {
      val = val.slice(0, 2) + ":" + val.slice(2);
    }
    return val;
  };

  // Función para validar formato de hora
  const validarHora = (hora: string): boolean => {
    return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(hora);
  };

  // Función para extraer hora de datetime string del backend
  const extraerHora = (datetimeStr?: string): string => {
    if (!datetimeStr) return "";
    if (datetimeStr.includes("T")) {
      return datetimeStr.split("T")[1].slice(0, 5);
    }
    if (datetimeStr.includes(":")) {
      return datetimeStr.slice(0, 5);
    }
    return "";
  };

  // Agrupar cabeceras
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
    // Aplicar el ordenamiento a los valores del map
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getPendientesAutorizacion();
        setPendientes(data);
      } catch {
        toast.error("Error al cargar pendientes.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
  // Inicializar valores desde el backend
  useEffect(() => {
    if (detalle.length > 0) {
      const first = detalle[0];
      setHoraInicio(extraerHora(first.hora_inicio));
      setHoraFin(extraerHora(first.hora_fin));
      setObservacion(first.observacion || "");
      setDetalleEditable(
        detalle.map((d) => ({
          cod_trabajador: d.cod_trabajador,
          trabajador: d.trabajador,
          horas: d.horas,
          kilos: d.kilos,
          detalle_observacion: d.detalle_observacion || "",
        }))
      );
    } else {
      setHoraInicio("");
      setHoraFin("");
      setObservacion("");
      setDetalleEditable([]);
    }
  }, [detalle]);

  const handleAplicarValor = () => {
    if (valorInput <= 0) {
      toast.error("Ingrese un valor válido.");
      return;
    }
    const nuevoDetalle = [...detalleEditable];
    if (prorratear) {
      const val = valorInput / nuevoDetalle.length;
      nuevoDetalle.forEach((item) => {
        if (tipoValor === "horas") {
          item.horas = Number(val.toFixed(2));
          item.kilos = 0;
        } else {
          item.kilos = Number(val.toFixed(2));
          item.horas = 0;
        }
      });
    } else {
      nuevoDetalle.forEach((item) => {
        if (tipoValor === "horas") {
          item.horas = valorInput;
          item.kilos = 0;
        } else {
          item.kilos = valorInput;
          item.horas = 0;
        }
      });
    }
    setDetalleEditable(nuevoDetalle);
    toast.success(`Valor aplicado ${prorratear ? "prorrateado" : ""}`);
  };

  const handleGuardar = async () => {
    if (!selectedRow || detalleEditable.length === 0) return;
    if (horaInicio && !validarHora(horaInicio)) {
      toast.error("Hora de inicio inválida. Use formato HH:mm (00:00 - 23:59)");
      return;
    }
    if (horaFin && !validarHora(horaFin)) {
      toast.error("Hora de fin inválida. Use formato HH:mm (00:00 - 23:59)");
      return;
    }
    for (const item of detalleEditable) {
      if (item.horas > 0 && item.kilos > 0) {
        toast.error(`El trabajador ${item.trabajador} tiene valores en Horas y Kilos a la vez.`);
        return;
      }
      if (item.horas === 0 && item.kilos === 0) {
        toast.error(`El trabajador ${item.trabajador} debe tener al menos un valor en Horas o Kilos.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      for (const item of detalleEditable) {
        const req: FinalizarTareoRequest = {
          fecha_destajo: selectedRow.fecha_destajo,
          lote: selectedRow.lote,
          cod_proceso: selectedRow.cod_proceso!,
          cod_subproceso: selectedRow.cod_subproceso,
          cod_trabajador: item.cod_trabajador,
          hora_inicio: horaInicio || undefined,
          hora_fin: horaFin || undefined,
          horas: item.horas,
          kilos: item.kilos,
          observacion: observacion || undefined,
          detalle_observacion: item.detalle_observacion || undefined,
        };
        await finalizarTareo(req);
      }
      const data = await getPendientesAutorizacion();
      setPendientes(data);
      toast.success("Tareo finalizado correctamente.");
      setSelectedRow(null);
    } catch {
      toast.error("Error al guardar tareo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Encabezado con buscador y botón alineados */}
      <div className="flex justify-between items-center mb-4 gap-4">
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
        <button
          onClick={handleGuardar}
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 text-sm"
        >
          {isSaving && <Loader className="animate-spin h-4 w-4" />}
          <Save className="h-4 w-4" /> {isSaving ? "Guardando..." : "Registrar Destajo"}
        </button>
      </div>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center items-center py-6">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <p className="ml-3 text-gray-500 dark:text-gray-400 text-sm">Cargando pendientes...</p>
        </div>
      )}

      {/* Tabla principal */}
      {!loading && (
        <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
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
                paginatedCabeceras.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedRow(item)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                      selectedRow?.lote === item.lote &&
                      selectedRow?.fecha_destajo === item.fecha_destajo &&
                      selectedRow?.cod_proceso === item.cod_proceso &&
                      (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "")
                        ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500"
                        : ""
                    }`}
                  >
                    <td className={`px-2 py-1 text-table-cell ${
                      selectedRow?.lote === item.lote &&
                      selectedRow?.fecha_destajo === item.fecha_destajo &&
                      selectedRow?.cod_proceso === item.cod_proceso &&
                      (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "")
                        ? "bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500"
                        : ""
                    }`}>
                      {formatDateYYYYMMDD(item.fecha_destajo)}
                    </td>
                    <td className="px-2 py-1 text-table-cell">{item.cod_producto} {item.producto}</td>
                    <td className="px-2 py-1 text-table-cell">{item.cod_proceso} {item.proceso}</td>
                    <td className="px-2 py-1 text-table-cell">{item.cod_subproceso} {item.subproceso}</td>
                    <td className="px-2 py-1 text-table-cell">{item.cliente}</td>
                    <td className="px-2 py-1 text-table-cell">{item.lote}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                    {searchTerm ? "No se encontraron registros que coincidan con la búsqueda." : "No hay registros disponibles"}
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
            <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-gray-300">registros</span>
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
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 border border-gray-300 dark:border-gray-600"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 rounded text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 border border-gray-300 dark:border-gray-600"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Formulario + detalle */}
      {selectedRow && (
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
          <div className="col-span-3 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Hora Inicio</label>
                  <input
                    type="text"
                    value={horaInicio}
                    onChange={(e) => {
                      const formatted = formatearHora(e.target.value);
                      setHoraInicio(formatted);
                    }}
                    onBlur={() => {
                      if (horaInicio && !validarHora(horaInicio)) {
                        toast.error("Hora de inicio inválida. Use formato HH:mm (00:00 - 23:59)");
                        setHoraInicio("");
                      }
                    }}
                    onMouseDown={(e) => {
                      const target = e.currentTarget;
                      setTimeout(() => target.select(), 0);
                    }}
                    placeholder="HH:mm"
                    maxLength={5}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Hora Fin</label>
                  <input
                    type="text"
                    value={horaFin}
                    onChange={(e) => {
                      const formatted = formatearHora(e.target.value);
                      setHoraFin(formatted);
                    }}
                    onBlur={() => {
                      if (horaFin && !validarHora(horaFin)) {
                        toast.error("Hora de fin inválida. Use formato HH:mm (00:00 - 23:59)");
                        setHoraFin("");
                      }
                    }}
                    onMouseDown={(e) => {
                      const target = e.currentTarget;
                      setTimeout(() => target.select(), 0);
                    }}
                    placeholder="HH:mm"
                    maxLength={5}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Tipo</label>
                  <select
                    value={tipoValor}
                    onChange={(e) => setTipoValor(e.target.value as any)}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="horas">Horas</option>
                    <option value="kilos">Kilos</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Valor</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorInput}
                    onChange={(e) => setValorInput(Number(e.target.value))}
                    onMouseDown={(e) => {
                      const target = e.currentTarget;
                      setTimeout(() => target.select(), 0);
                    }}
                    className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="pt-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={prorratear}
                      onChange={(e) => setProrratear(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-indigo-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Prorratear</label>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">Observación General</label>
                <textarea
                  rows={2}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  onMouseDown={(e) => {
                    const target = e.currentTarget;
                    setTimeout(() => target.select(), 0);
                  }}
                  className="border rounded w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ingrese observación..."
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAplicarValor}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
              >
                <Copy className="h-4 w-4" /> Aplicar
              </button>
            </div>
          </div>

          <div className="col-span-7">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-semibold text-sm">
                Detalle seleccionado → Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | 
                Lote: {selectedRow.lote} | 
                Proceso: {selectedRow.proceso}
                {selectedRow.subproceso && ` | Subproceso: ${selectedRow.subproceso}`}
                {selectedRow.cliente && ` | Cliente: ${selectedRow.cliente}`}
              </h3>
            </div>

            <div className="shadow-md rounded-b-lg border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-table-header">Cod Trabajador</th>
                    <th className="px-2 py-1 text-left text-table-header">Trabajador</th>
                    <th className="px-2 py-1 text-left text-table-header">Horas</th>
                    <th className="px-2 py-1 text-left text-table-header">Kilos</th>
                    <th className="px-2 py-1 text-left text-table-header">Obs. Detalle</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {detalleEditable.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={d.horas}
                          onChange={(e) =>
                            setDetalleEditable((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, horas: Number(e.target.value) } : row
                              )
                            )
                          }
                          onBlur={() =>
                            setDetalleEditable((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, kilos: row.horas > 0 ? 0 : row.kilos } : row
                              )
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setDetalleEditable((prev) =>
                                prev.map((row, idx) =>
                                  idx === i ? { ...row, kilos: row.horas > 0 ? 0 : row.kilos } : row
                                )
                              );
                            }
                          }}
                          onMouseDown={(e) => {
                            const target = e.currentTarget;
                            setTimeout(() => target.select(), 0);
                          }}
                          className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={d.kilos}
                          onChange={(e) =>
                            setDetalleEditable((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, kilos: Number(e.target.value) } : row
                              )
                            )
                          }
                          onBlur={() =>
                            setDetalleEditable((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, horas: row.kilos > 0 ? 0 : row.horas } : row
                              )
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setDetalleEditable((prev) =>
                                prev.map((row, idx) =>
                                  idx === i ? { ...row, horas: row.kilos > 0 ? 0 : row.horas } : row
                                )
                              );
                            }
                          }}
                          onMouseDown={(e) => {
                            const target = e.currentTarget;
                            setTimeout(() => target.select(), 0);
                          }}
                          className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={d.detalle_observacion}
                          onChange={(e) =>
                            setDetalleEditable((prev) =>
                              prev.map((row, idx) =>
                                idx === i ? { ...row, detalle_observacion: e.target.value } : row
                              )
                            )
                          }
                          onMouseDown={(e) => {
                            const target = e.currentTarget;
                            setTimeout(() => target.select(), 0);
                          }}
                          className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Observación..."
                          style={{ textTransform: 'uppercase' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalizarTareoPage;