// src/types/user.types.ts

// Corresponde a schemas.rol.RolRead en el backend
export interface Role {
    rol_id: number;
    nombre: string;
    descripcion?: string | null; // Asegúrate que coincida con Pydantic (Optional[str])
    es_activo: boolean;
    fecha_creacion: string; // O Date si lo conviertes
  }
  
  // Corresponde a schemas.usuario.UsuarioReadWithRoles en el backend
  export interface UserWithRoles {
    usuario_id: number;
    nombre_usuario: string;
    correo: string;
    nombre?: string | null;
    apellido?: string | null;
    es_activo: boolean;
    correo_confirmado: boolean;
    fecha_creacion: string; // O Date
    fecha_ultimo_acceso?: string | null; // O Date
    fecha_actualizacion?: string | null; // O Date
    roles: Role[]; // Lista de roles asociados
  }
  
  // Corresponde a schemas.usuario.PaginatedUsuarioResponse en el backend
  export interface PaginatedUsersResponse {
    usuarios: UserWithRoles[];
    total_usuarios: number;
    pagina_actual: number;
    total_paginas: number;
  }
  
  // (Opcional) Para el formulario de creación/edición si lo añades después
  export interface UserFormData {
      nombre_usuario: string;
      correo: string;
      nombre?: string;
      apellido?: string;
      contrasena?: string; // Solo para creación
      es_activo?: boolean;
  }

  // --- NUEVO: Tipo específico para el formulario de EDICIÓN ---
  export interface UserUpdateData {
      correo: string; // Correo suele ser editable
      nombre?: string | null; // Nombre opcional, permitir null para borrarlo si el backend lo soporta
      apellido?: string | null; // Apellido opcional, permitir null
      es_activo?: boolean; // Opcional: si quieres controlar el estado desde el modal de edición
}