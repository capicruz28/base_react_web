// src/hooks/useEficienciaKPIs.ts
import { useMemo } from 'react';
import { EficienciaCosturaItem } from '../types/costura.types';

export const useEficienciaKPIs = (datos: EficienciaCosturaItem[], selectedLinea: string | null) => {
  return useMemo(() => {
    const datosFiltrados = selectedLinea
      ? datos.filter(item => (item.linea || 'Sin Línea') === selectedLinea)
      : datos;

    // Objeto para tracking de trabajadores por día
    const trabajadoresPorDia: Record<string, Set<string>> = {};
    
    // Acumuladores
    let totalMinutosProducidos = 0;
    let totalMinutosDisponibles = 0;
    let totalPrendas = 0;
    const ordenesUnicas = new Set<string>();
    const lineasUnicas = new Set<string>();

    // Tracking para alertas
    const alertasBajaEficiencia: Array<{
      trabajador: string;
      eficiencia: number;
      linea: string;
    }> = [];

    datosFiltrados.forEach(item => {
      // Acumular totales
      totalMinutosProducidos += item.minutos_producidos_total;
      totalPrendas += item.cantidad_prendas_producidas;
      ordenesUnicas.add(item.orden_produccion);
      if (item.linea) lineasUnicas.add(item.linea);

      // Tracking de minutos disponibles por trabajador por día
      const fechaKey = item.fecha_proceso;
      if (!trabajadoresPorDia[fechaKey]) {
        trabajadoresPorDia[fechaKey] = new Set();
      }
      if (!trabajadoresPorDia[fechaKey].has(item.codigo_trabajador)) {
        trabajadoresPorDia[fechaKey].add(item.codigo_trabajador);
        totalMinutosDisponibles += item.minutos_disponibles_jornada;
      }
    });

    // Calcular eficiencia general
    const eficienciaGeneral = totalMinutosDisponibles > 0
      ? (totalMinutosProducidos / totalMinutosDisponibles) * 100
      : 0;

    // Determinar estado de eficiencia
    const estadoEficiencia: "success" | "warning" | "danger" =
    eficienciaGeneral >= 90
    ? "success"
    : eficienciaGeneral >= 80
    ? "warning"
    : "danger";

    return {
      kpis: {
        eficienciaGeneral,
        estadoEficiencia,
        totalPrendas,
        totalMinutosProducidos,
        totalMinutosDisponibles,
        totalOrdenes: ordenesUnicas.size,
        totalLineas: lineasUnicas.size
      },
      alertasBajaEficiencia
    };
  }, [datos, selectedLinea]);
};