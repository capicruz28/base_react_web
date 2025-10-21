import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getReporteAutorizacion } from "../services/autorizacion.service";
import { PendienteAutorizacion } from "../types/autorizacion.types";
import { Loader, FileText, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatDateYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Meses son 0-11
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// Función para formatear fecha y hora a yyyy-MM-dd HH:mm
function formatDateTimeYYYYMMDDHHMM(dateTimeStr?: string) {
  if (!dateTimeStr) return "-";
  
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return "-";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Función para formatear hora a HH:MM
function formatTimeHHMM(timeStr?: string) {
  if (!timeStr) return "-";
  
  // Si ya viene en formato HH:MM, devolverlo tal como está
  if (timeStr.match(/^\d{2}:\d{2}$/)) {
    return timeStr;
  }
  
  // Si viene como fecha completa, extraer solo la hora
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // Si viene en otro formato, intentar parsearlo
  return timeStr.substring(0, 5) || "-";
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

// Función utilitaria para procesar datos en chunks asíncronos
const processDataInChunks = async <T, R>(
  data: T[],
  processor: (chunk: T[]) => R[],
  chunkSize = 1000
): Promise<R[]> => {
  const result: R[] = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const processed = processor(chunk);
    result.push(...processed);
    
    // Permitir que el navegador respire
    if (i + chunkSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return result;
};

const ReporteAutorizacionPage: React.FC = () => {
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const [rawData, setRawData] = useState<PendienteAutorizacion[]>([]);
  const [processedData, setProcessedData] = useState<{
    cabeceras: PendienteAutorizacion[];
    kpis: { total: number; pendientes: number; rechazados: number; aprobados: number };
  }>({ cabeceras: [], kpis: { total: 0, pendientes: 0, rechazados: 0, aprobados: 0 } });
  
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [fechaInicio, setFechaInicio] = useState<string>(lastWeek.toISOString().slice(0, 10));
  const [fechaFin, setFechaFin] = useState<string>(today.toISOString().slice(0, 10));
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  // Referencias para cancelar procesamiento
  const processingRef = useRef<boolean>(false);

  // Procesar datos raw de forma asíncrona
  const processRawData = useCallback(async (data: PendienteAutorizacion[]) => {
    if (processingRef.current || data.length === 0) return;
    
    processingRef.current = true;
    setProcessing(true);

    try {
      // Procesar cabeceras en chunks para no bloquear UI
      const cabeceras = await processDataInChunks(
        data,
        (chunk) => {
          const map = new Map<string, PendienteAutorizacion>();
          chunk.forEach(item => {
            const key = `${item.fecha_destajo}_${item.cod_producto}_${
              item.cod_subproceso || ""
            }_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`;
            if (!map.has(key)) map.set(key, item);
          });
          return sortData(Array.from(map.values()));
        }
      );

      // Eliminar duplicados finales
      const uniqueCabeceras = Array.from(
        new Map(cabeceras.map(item => [
          `${item.fecha_destajo}_${item.cod_producto}_${item.cod_subproceso || ""}_${item.cod_cliente}_${item.lote}_${item.cod_proceso}`,
          item
        ])).values()
      );

      // Calcular KPIs de forma eficiente
      const kpis = {
        total: uniqueCabeceras.length,
        pendientes: uniqueCabeceras.filter(d => d.estado_autorizado === "P").length,
        rechazados: uniqueCabeceras.filter(d => d.estado_autorizado === "R").length,
        aprobados: uniqueCabeceras.filter(d => d.estado_autorizado === "A").length,
      };

      setProcessedData({ cabeceras: uniqueCabeceras, kpis });
      
      // Auto-seleccionar primer registro
      if (uniqueCabeceras.length > 0) {
        setSelectedRow(uniqueCabeceras[0]);
      }

    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Error procesando los datos");
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, []);

  // Filtrar datos procesados (más eficiente)
  const filteredCabeceras = useMemo(() => {
    let filtered = processedData.cabeceras;
    
    // Filtro por estado (más rápido primero)
    if (estadoFiltro) {
      filtered = filtered.filter(d => d.estado_autorizado === estadoFiltro);
    }
    
    // Filtro por búsqueda solo si hay término
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        // Búsqueda optimizada con early return
        return formatDateYYYYMMDD(item.fecha_destajo).includes(term) ||
               (item.cod_producto && item.cod_producto.toLowerCase().includes(term)) ||
               (item.producto && item.producto.toLowerCase().includes(term)) ||
               (item.cod_proceso && item.cod_proceso.toLowerCase().includes(term)) ||
               (item.proceso && item.proceso.toLowerCase().includes(term)) ||
               (item.cod_subproceso && item.cod_subproceso.toLowerCase().includes(term)) ||
               (item.subproceso && item.subproceso.toLowerCase().includes(term)) ||
               (item.cliente && item.cliente.toLowerCase().includes(term)) ||
               (item.lote && item.lote.toLowerCase().includes(term)) ||
               (item.estado_autorizado && item.estado_autorizado.toLowerCase().includes(term));
      });
    }
    
    return filtered;
  }, [processedData.cabeceras, estadoFiltro, searchTerm]);

  // Paginación memoizada
  const paginatedCabeceras = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCabeceras.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCabeceras, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCabeceras.length / itemsPerPage);

  // Detalle optimizado - solo buscar cuando es necesario
  const detalle = useMemo(() => {
    if (!selectedRow) return [];
    
    return rawData.filter(p => 
      p.lote === selectedRow.lote &&
      p.fecha_destajo === selectedRow.fecha_destajo &&
      p.cod_proceso === selectedRow.cod_proceso &&
      (p.cod_subproceso || "") === (selectedRow.cod_subproceso || "")
    );
  }, [rawData, selectedRow?.lote, selectedRow?.fecha_destajo, selectedRow?.cod_proceso, selectedRow?.cod_subproceso]);

  // Cargar datos con indicador de progreso
  const fetchData = useCallback(async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error("Seleccione rango de fechas válido");
      return;
    }

    setLoading(true);
    setProcessedData({ cabeceras: [], kpis: { total: 0, pendientes: 0, rechazados: 0, aprobados: 0 } });
    setSelectedRow(null);
    
    try {
      const result = await getReporteAutorizacion(
        fechaInicio ,
        fechaFin
      );

      const dataArray = result || [];
      setRawData(dataArray);
      
      // Procesar datos de forma asíncrona
      if (dataArray.length > 0) {
        processRawData(dataArray);
        toast.success(`${dataArray.length} registros cargados - Procesando...`);
      } else {
        toast.success("Consulta completada - No se encontraron registros");
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error cargando datos");
      setRawData([]);
    } finally {
      setLoading(false);
      setCurrentPage(1);
    }
  }, [fechaInicio, fechaFin, processRawData]);

  // Resetear página cuando cambien filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [estadoFiltro, searchTerm]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Funciones de filtro optimizadas con useCallback
 const handleEstadoFilter = useCallback((estado: string | null) => {
  setEstadoFiltro(estado);

  // Después de aplicar el filtro, seleccionar automáticamente el primer registro visible
  setTimeout(() => {
    const filtered = processedData.cabeceras.filter((d) =>
      estado ? d.estado_autorizado === estado : true
    );
    if (filtered.length > 0) {
      setSelectedRow(filtered[0]);
    } else {
      setSelectedRow(null);
    }
  }, 0);
}, [processedData.cabeceras]);

  const handleRowClick = useCallback((item: PendienteAutorizacion) => {
    setSelectedRow(item);
  }, []);

  // Generar PDF optimizado
  const generarPDF = useCallback(() => {
    if (!selectedRow) {
      toast.error("Seleccione un registro para generar el PDF");
      return;
    }
    
    const doc = new jsPDF();
    const fechaReporte = formatDateYYYYMMDD(new Date().toISOString());
    const estadoLegible = selectedRow.estado_autorizado === "P" ? "PENDIENTE" :
                        selectedRow.estado_autorizado === "A" ? "APROBADO" : "RECHAZADO";

    const addHeaderFooter = (data: any) => {
      doc.addImage("/psf.png", "PNG", 10, 5, 30, 12);
      doc.setFontSize(16);
      doc.text("Reporte de Destajo", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      
      doc.setFontSize(12);
      const centerX = doc.internal.pageSize.getWidth() / 2;
      
      // Escribir "Estado: " en negro
      doc.setTextColor(0, 0, 0);
      const estadoTexto = "Estado: ";
      const estadoTextoWidth = doc.getTextWidth(estadoTexto);
      const startX = centerX - (doc.getTextWidth(`Estado: ${estadoLegible}`) / 2);
      
      doc.text(estadoTexto, startX, 22);
      
      // Escribir solo el estado en color
      if (selectedRow.estado_autorizado === "A") {
        doc.setTextColor(22, 163, 74); // Verde equivalente a bg-green-600 (#16a34a)
      } else if (selectedRow.estado_autorizado === "R") {
        doc.setTextColor(220, 38, 38); // Rojo equivalente a bg-red-600 (#dc2626)
      } else {
        doc.setTextColor(75, 85, 99); // Gris para pendiente (#4b5563)
      }
      
      doc.text(estadoLegible, startX + estadoTextoWidth, 22);
      
      // Restaurar color negro para el resto
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`${fechaReporte}`, doc.internal.pageSize.getWidth() - 15, 10, { align: "right" });
      
      const pageCount = (doc.internal as any).getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 15,
        doc.internal.pageSize.getHeight() - 10,
        { align: "right" }
      );
    };

    const row = selectedRow;
    const headerData = [
      ["Fecha:", formatDateYYYYMMDD(row.fecha_destajo), "Producto:", `${row.cod_producto} ${row.producto}`],
      ["Proceso:", `${row.cod_proceso} ${row.proceso}`, "Subproceso:", row.subproceso ? `${row.cod_subproceso} ${row.subproceso}` : "-"],
      ["Cliente:", `${row.cod_cliente} ${row.cliente}`, "Lote:", row.lote],
      ["Hora Inicio:", formatTimeHHMM(row.hora_inicio), "Hora Fin:", formatTimeHHMM(row.hora_fin)],
      ["Supervisor:", row.lote, "Fecha Autor.:", formatDateTimeYYYYMMDDHHMM(row.fecha_autorizacion)],
      ["Observación:", { content: row.observacion_autorizacion || "-", colSpan: 3, styles: { fontStyle: 'normal' } }],
    ];

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const usablePageWidth = pageWidth - marginX * 2;

    autoTable(doc, {
      startY: 30,
      theme: "grid",
      head: [["", "", "", ""]],
      body: headerData,
      margin: { left: marginX, right: marginX, top: 40 },
      columnStyles: {
        0: { cellWidth: usablePageWidth * 0.15, fontStyle: 'bold' },
        1: { cellWidth: usablePageWidth * 0.35 },
        2: { cellWidth: usablePageWidth * 0.15, fontStyle: 'bold' },
        3: { cellWidth: usablePageWidth * 0.35 },
      },
      styles: { overflow: 'linebreak', cellPadding: 2, fontSize: 10 },
      headStyles: {
        fillColor: [68, 114, 196], // Ejemplo: Azul ([R, G, B])
        textColor: [255, 255, 255], // Color de texto blanco
      },
      didDrawCell: function(data: any) {
        // Aplicar negrita solo a las columnas 0 y 2 (títulos)
        if ((data.column.index === 0 || data.column.index === 2) && data.section === 'body') {
          doc.setFont('helvetica', 'bold'); // Especificar la fuente explícitamente
        } else if (data.section === 'body') {
          doc.setFont('helvetica', 'normal'); // Resetear a normal para otras celdas
        }
      },
      didDrawPage: addHeaderFooter,
    });

    if (detalle.length > 0) {
      autoTable(doc, {
        theme: "grid",
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Cod Trabajador", "Trabajador", "Horas", "Kilos"]],
        body: detalle.map((d) => [
          d.cod_trabajador,
          d.trabajador,
          { content: d.horas, styles: { halign: 'right' } },
          { content: d.kilos, styles: { halign: 'right' } }
        ]),
        margin: { top: 40 },
        headStyles: {
        fillColor: [68, 114, 196], // Ejemplo: Azul ([R, G, B])
        textColor: [255, 255, 255], // Color de texto blanco
        },
        didDrawPage: addHeaderFooter,
      });
    }

    doc.save(`reporte_${row.lote}_${formatDateYYYYMMDD(row.fecha_destajo)}.pdf`);
  }, [selectedRow, detalle]);

  return (
    <div className="w-full">
      {/* Encabezado con buscador y botón */}
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
          onClick={generarPDF}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm"
        >
          <FileText className="h-4 w-4" />
          Generar PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading || processing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </div>

      {/* Estado de procesamiento */}
      {processing && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
          <div className="flex items-center">
            <Loader className="animate-spin h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">
              Procesando {rawData.length} registros en segundo plano...
            </span>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => handleEstadoFilter(null)}
          className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
            estadoFiltro === null ? 'bg-indigo-100 dark:bg-indigo-900/50 border-l-4 border-indigo-500' : 'bg-white dark:bg-gray-800'
          }`}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">Total Destajos</p>
          <p className="text-xl font-bold">{processedData.kpis.total}</p>
        </div>
        <div
          onClick={() => handleEstadoFilter("P")}
          className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
            estadoFiltro === "P" ? 'bg-yellow-200 border-l-4 border-yellow-500' : 'bg-yellow-100'
          }`}
        >
          <p className="text-sm text-gray-600">Pendientes</p>
          <p className="text-xl font-bold">{processedData.kpis.pendientes}</p>
        </div>
        <div
          onClick={() => handleEstadoFilter("R")}
          className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
            estadoFiltro === "R" ? 'bg-red-200 border-l-4 border-red-500' : 'bg-red-100'
          }`}
        >
          <p className="text-sm text-gray-600">Rechazados</p>
          <p className="text-xl font-bold">{processedData.kpis.rechazados}</p>
        </div>
        <div
          onClick={() => handleEstadoFilter("A")}
          className={`cursor-pointer p-4 rounded-lg shadow hover:opacity-80 ${
            estadoFiltro === "A" ? 'bg-green-200 border-l-4 border-green-500' : 'bg-green-100'
          }`}
        >
          <p className="text-sm text-gray-600">Aprobados</p>
          <p className="text-xl font-bold">{processedData.kpis.aprobados}</p>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader className="animate-spin h-8 w-8 text-indigo-600" />
          <span className="ml-2">Cargando datos desde el servidor...</span>
        </div>
      ) : (
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
                <th className="px-2 py-1 text-left text-table-header">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCabeceras.length > 0 ? (
                paginatedCabeceras.map((item, idx) => {
                  const isSelected = 
                    selectedRow?.lote === item.lote &&
                    selectedRow?.fecha_destajo === item.fecha_destajo &&
                    selectedRow?.cod_proceso === item.cod_proceso &&
                    (selectedRow?.cod_subproceso || "") === (item.cod_subproceso || "");

                  return (
                    <tr
                      key={`${item.lote}-${item.fecha_destajo}-${idx}`}
                      onClick={() => handleRowClick(item)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-100 dark:bg-indigo-900/50"
                          : ""
                      }`}
                    >
                      <td
                        className={`px-2 py-1 text-table-cell ${
                          isSelected
                            ? "border-l-4 border-indigo-500"
                            : ""
                        }`}
                      >
                        {formatDateYYYYMMDD(item.fecha_destajo)}
                      </td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_producto} {item.producto}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_proceso} {item.proceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cod_subproceso} {item.subproceso}</td>
                      <td className="px-2 py-1 text-table-cell">{item.cliente}</td>
                      <td className="px-2 py-1 text-table-cell">{item.lote}</td>
                      <td className="px-2 py-1 text-table-cell">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.estado_autorizado === 'P' ? 'bg-yellow-100 text-yellow-800' :
                          item.estado_autorizado === 'A' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.estado_autorizado === 'P' ? 'Pendiente' :
                            item.estado_autorizado === 'A' ? 'Aprobado' : 'Rechazado'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-500 text-table-cell">
                    {processing ? "Procesando datos..." : 
                     searchTerm || estadoFiltro ? "No se encontraron registros que coincidan con los filtros." : 
                     "No hay registros."}
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
            {(searchTerm || estadoFiltro) && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                (mostrando {filteredCabeceras.length} de {processedData.kpis.total} registros filtrados)
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

      {/* Tabla Detalle */}
      {selectedRow && (
        <div className="mb-4">
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-t-lg">
            <h3 className="font-semibold text-sm">
              Detalle seleccionado → Fecha Destajo: {formatDateYYYYMMDD(selectedRow.fecha_destajo)} | Lote:{" "}
              {selectedRow.lote} | Proceso: {selectedRow.proceso}
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
                    <tr key={`${d.cod_trabajador}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 py-1 text-table-cell">{d.cod_trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.trabajador}</td>
                      <td className="px-2 py-1 text-table-cell">{d.horas}</td>
                      <td className="px-2 py-1 text-table-cell">{d.kilos}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500 text-table-detail">
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

export default ReporteAutorizacionPage;
