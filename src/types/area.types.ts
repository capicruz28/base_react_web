// src/types/area.types.ts

// Corresponde a AreaRead en el backend
export interface Area {
    area_id: number;
    nombre: string;
    descripcion: string | null;
    icono: string | null;
    es_activo: boolean;
    fecha_creacion: string; // Las fechas vienen como string ISO desde JSON
  }
  
  // Corresponde a AreaCreate en el backend
  export interface AreaCreateData {
    nombre: string;
    descripcion?: string | null;
    icono?: string | null;
    es_activo?: boolean; // Aunque tenga default, podemos enviarlo
  }
  
  // Corresponde a AreaUpdate en el backend
  export interface AreaUpdateData {
    nombre?: string;
    descripcion?: string | null;
    icono?: string | null;
    es_activo?: boolean;
  }
  
  // Estructura esperada de la respuesta paginada del backend para áreas
  export interface PaginatedAreaResponse {
    areas: Area[];
    pagina_actual: number;
    total_paginas: number;
    total_areas: number; // Cambiado de total_roles
  }