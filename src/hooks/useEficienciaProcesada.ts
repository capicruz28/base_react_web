import { useMemo } from 'react';
import { EficienciaCosturaItem } from '../types/costura.types';

export const useEficienciaProcesada = (datos: EficienciaCosturaItem[]) => {
  return useMemo(() => {
    // Datos para el mapa de calor
    const mapaCalor = datos.reduce((acc, item) => {
      const fecha = item.fecha_proceso;
      const linea = item.linea || 'Sin Línea';
      const key = `${fecha}-${linea}`;
      
      if (!acc[key]) {
        acc[key] = {
          fecha,
          linea,
          minutosProducidos: 0,
          minutosDisponibles: 0,
          trabajadoresProcesados: new Set<string>()
        };
      }
      
      acc[key].minutosProducidos += item.minutos_producidos_total;
      
      if (!acc[key].trabajadoresProcesados.has(item.codigo_trabajador)) {
        acc[key].minutosDisponibles += item.minutos_disponibles_jornada;
        acc[key].trabajadoresProcesados.add(item.codigo_trabajador);
      }
      
      return acc;
    }, {} as Record<string, any>);

    const datosMapaCalor = Object.values(mapaCalor).map(item => ({
      fecha: item.fecha,
      linea: item.linea,
      eficiencia: (item.minutosProducidos / item.minutosDisponibles) * 100
    }));

    // Datos para top costureros
    const costureros = datos.reduce((acc, item) => {
      const id = item.codigo_trabajador;
      if (!acc[id]) {
        acc[id] = {
          codigo: id,
          nombre: item.nombre_trabajador || id,
          minutosProducidos: 0,
          minutosDisponibles: 0,
          prendas: 0,
          linea: item.linea || 'Sin Línea',
          fechasProcesadas: new Set<string>()
        };
      }
      
      acc[id].minutosProducidos += item.minutos_producidos_total;
      acc[id].prendas += item.cantidad_prendas_producidas;
      
      if (!acc[id].fechasProcesadas.has(item.fecha_proceso)) {
        acc[id].minutosDisponibles += item.minutos_disponibles_jornada;
        acc[id].fechasProcesadas.add(item.fecha_proceso);
      }
      
      return acc;
    }, {} as Record<string, any>);

    const topCostureros = Object.values(costureros)
      .map(c => ({
        ...c,
        eficiencia: (c.minutosProducidos / c.minutosDisponibles) * 100
      }))
      .sort((a, b) => b.eficiencia - a.eficiencia)
      .slice(0, 10);

    // Eficiencia por línea (minutos disponibles solo una vez por trabajador y fecha)
    const lineas: Record<string, {
      minutosProducidos: number;
      minutosDisponibles: number;
      prendasProducidas: number;
      trabajadoresPorDia: Record<string, Set<string>>;
    }> = {};

    datos.forEach(item => {
      const linea = item.linea || 'Sin Línea';
      if (!lineas[linea]) {
        lineas[linea] = {
          minutosProducidos: 0,
          minutosDisponibles: 0,
          prendasProducidas: 0,
          trabajadoresPorDia: {}
        };
      }
      // Sumar minutos producidos y prendas normalmente
      lineas[linea].minutosProducidos += item.minutos_producidos_total;
      lineas[linea].prendasProducidas += item.cantidad_prendas_producidas;

      // Sumar minutos disponibles solo una vez por trabajador y fecha
      const fechaKey = item.fecha_proceso;
      if (!lineas[linea].trabajadoresPorDia[fechaKey]) {
        lineas[linea].trabajadoresPorDia[fechaKey] = new Set();
      }
      if (!lineas[linea].trabajadoresPorDia[fechaKey].has(item.codigo_trabajador)) {
        lineas[linea].trabajadoresPorDia[fechaKey].add(item.codigo_trabajador);
        lineas[linea].minutosDisponibles += item.minutos_disponibles_jornada;
      }
    });

    const eficienciaPorLinea = Object.entries(lineas).map(([linea, valores]) => ({
      linea,
      minutosProducidos: valores.minutosProducidos,
      minutosDisponibles: valores.minutosDisponibles,
      prendasProducidas: valores.prendasProducidas,
      eficiencia: valores.minutosDisponibles > 0
        ? (valores.minutosProducidos / valores.minutosDisponibles) * 100
        : 0
    }));

    // NUEVO: Tendencia de eficiencia por fecha (deduplicando minutos disponibles por trabajador y fecha)
    const fechas: Record<string, {
      minutosProducidos: number;
      minutosDisponibles: number;
      trabajadores: Set<string>;
      trabajadoresPorFecha: Record<string, Set<string>>;
    }> = {};

    datos.forEach(item => {
      const fecha = item.fecha_proceso || 'Sin Fecha';
      if (!fechas[fecha]) {
        fechas[fecha] = {
          minutosProducidos: 0,
          minutosDisponibles: 0,
          trabajadores: new Set(),
          trabajadoresPorFecha: {}
        };
      }
      fechas[fecha].minutosProducidos += item.minutos_producidos_total;

      // Sumar minutos disponibles solo una vez por trabajador por fecha
      if (!fechas[fecha].trabajadoresPorFecha[fecha]) {
        fechas[fecha].trabajadoresPorFecha[fecha] = new Set();
      }
      if (!fechas[fecha].trabajadoresPorFecha[fecha].has(item.codigo_trabajador)) {
        fechas[fecha].trabajadoresPorFecha[fecha].add(item.codigo_trabajador);
        fechas[fecha].minutosDisponibles += item.minutos_disponibles_jornada;
      }
    });

    const tendenciaEficiencia = Object.entries(fechas)
      .map(([fecha, valores]) => ({
        fecha,
        eficiencia: valores.minutosDisponibles > 0
          ? (valores.minutosProducidos / valores.minutosDisponibles) * 100
          : 0
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      datosMapaCalor,
      topCostureros,
      eficienciaPorLinea,
      tendenciaEficiencia
    };
  }, [datos]);
};