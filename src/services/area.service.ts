// src/services/area.service.ts

import api from './api';
import { PaginatedAreaResponse, AreaCreateData, AreaUpdateData, Area } from '../types/area.types';

const API_URL = '/areas';

export const getAreas = async (
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<PaginatedAreaResponse> => {
  try {
    const skip = (page - 1) * limit;
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (search) {
      params.append('search', search);
    }

    // ✅ Ya tiene / al final - OK
    const response = await api.get<PaginatedAreaResponse>(`${API_URL}/?${params.toString()}`);
    return response.data;

  } catch (error: any) {
    console.error("Error fetching areas:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Error al obtener las áreas desde el servicio');
  }
};

export const createArea = async (areaData: AreaCreateData): Promise<Area> => {
  try {
    // ✅ Ya tiene / al final - OK
    const response = await api.post<Area>(API_URL + '/', areaData);
    return response.data;
  } catch (error: any) {
    console.error("Error creating area:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Error al crear el área');
  }
};

export const updateArea = async (areaId: number, areaData: AreaUpdateData): Promise<Area> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.put<Area>(`${API_URL}/${areaId}/`, areaData);
    return response.data;
  } catch (error: any) {
    console.error("Error updating area:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Error al actualizar el área');
  }
};

export const deactivateArea = async (areaId: number): Promise<Area> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.delete<Area>(`${API_URL}/${areaId}/`);
    return response.data;
  } catch (error: any) {
    console.error("Error deactivating area:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Error al desactivar el área');
  }
};

export const reactivateArea = async (areaId: number): Promise<Area> => {
  try {
    // ✅ CAMBIO: Ya tiene / al final - OK
    const response = await api.put<Area>(`${API_URL}/${areaId}/reactivate/`);
    return response.data;
  } catch (error: any) {
    console.error("Error reactivating area:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Error al reactivar el área');
  }
};

export const getAreaById = async (areaId: number): Promise<Area> => {
    try {
        // ✅ CAMBIO: Ya tiene / al final - OK
        const response = await api.get<Area>(`${API_URL}/${areaId}/`);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching area ${areaId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || `Error al obtener el área ${areaId}`);
    }
};