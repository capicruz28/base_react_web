// src/types/autorizacion.types.ts
export interface PendienteAutorizacion {
  fecha_destajo: string;
  cod_producto: string;
  producto: string;
  cod_subproceso?: string;
  subproceso?: string;
  cod_cliente: string;
  cliente: string;
  lote: string;
  cod_proceso: string;
  proceso: string;
  cod_trabajador: string;
  trabajador: string;
  horas: number;
  kilos: number;
  tarifa: number;
  importe_total: number;
  estado_autorizado: string;
  hora_inicio?: string;           // formato esperado: "HH:mm" o "HH:mm:ss"
  hora_fin?: string;              // formato esperado: "HH:mm" o "HH:mm:ss"
  observacion?: string;           // observación general
  detalle_observacion?: string;   // observación específica de trabajador
  fecha_autorizacion: string;
  observacion_autorizacion?: string;         
}

export interface AutorizacionUpdate {
  lote: string;
  fecha_destajo: string;
  cod_proceso: string;
  cod_subproceso?: string;
  nuevo_estado: string;
  observacion_autorizacion: string;
}

export interface AutorizacionResponse {
  message: string;
  lote: string;
  fecha_destajo: string;
  cod_proceso: string;
  cod_subproceso?: string;
  nuevo_estado: string;
  observacion_autorizacion: string;
}

export interface AutorizacionMultipleResponse {
  message: string;
  exitosos: number;
  fallidos: number;
  total_procesados: number;
  errores: string[];
}

export interface AutorizacionCountResponse {
  total_pendientes: number;
  fecha_consulta: string;
}

export interface FinalizarTareoRequest {
  fecha_destajo: string;
  lote: string;
  cod_proceso: string;
  cod_subproceso?: string;
  cod_trabajador: string;
  hora_inicio?: string;
  hora_fin?: string;
  horas?: number;
  kilos?: number;
  observacion?: string;
  detalle_observacion?: string;
}

export interface FinalizarTareoResponse {
  message: string;
  fecha_destajo: string;
  lote: string;
  cod_proceso: string;
  cod_subproceso?: string;
  cod_trabajador: string;
}