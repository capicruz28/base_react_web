// src/services/autorizacion.service.ts
import api from './api';
import {
  PendienteAutorizacion,
  AutorizacionUpdate,
  AutorizacionResponse,
  AutorizacionMultipleResponse,
  AutorizacionCountResponse,
  FinalizarTareoRequest, 
  FinalizarTareoResponse
} from '../types/autorizacion.types';

const BASE_URL = '/autorizacion';

export const getPendientesAutorizacion = async (): Promise<PendienteAutorizacion[]> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.get<PendienteAutorizacion[]>(`${BASE_URL}/pendientes/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pendientes de autorización:', error);
    throw error;
  }
};

export const getConteoPendientes = async (): Promise<AutorizacionCountResponse> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.get<AutorizacionCountResponse>(`${BASE_URL}/pendientes/count/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conteo de pendientes:', error);
    throw error;
  }
};

export const autorizarProceso = async (
  data: AutorizacionUpdate
): Promise<AutorizacionResponse> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.put<AutorizacionResponse>(`${BASE_URL}/autorizar/`, data);
    return response.data;
  } catch (error) {
    console.error('Error autorizando proceso:', error);
    throw error;
  }
};

export const autorizarMultipleProcesos = async (
  data: AutorizacionUpdate[]
): Promise<AutorizacionMultipleResponse> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.put<AutorizacionMultipleResponse>(
      `${BASE_URL}/autorizar-multiple/`,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error en autorización múltiple:', error);
    throw error;
  }
};

export const finalizarTareo = async (
  data: FinalizarTareoRequest
): Promise<FinalizarTareoResponse> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.put<FinalizarTareoResponse>(`${BASE_URL}/finalizar-tareo/`, data);
    return response.data;
  } catch (error) {
    console.error('Error finalizando tareo:', error);
    throw error;
  }
};

export const getReporteAutorizacion = async (
  fecha_inicio: string,
  fecha_fin: string
): Promise<PendienteAutorizacion[]> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.post<PendienteAutorizacion[]>(
      `${BASE_URL}/reporte/`,
      { fecha_inicio, fecha_fin }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching reporte de autorización:", error);
    throw error;
  }
};