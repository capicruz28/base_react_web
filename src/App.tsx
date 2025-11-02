// src/App.tsx (MODIFICADO PARA USAR AdminLayout)
import './index.css'

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'; // Ajusta ruta
import { AuthProvider } from './context/AuthContext';   // Ajusta ruta
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { DndProvider } from 'react-dnd'; // <<< Importa DndProvider
import { HTML5Backend } from 'react-dnd-html5-backend'; // <<< Importa el Backend

// Layouts y Protección
import ProtectedRoute from './components/ProtectedRoute'; // Ajusta ruta
//import MainLayout from './components/layout/MainLayout'; // Ajusta ruta
//import AdminLayout from './components/layout/AdminLayout'; // <-- IMPORTAR NUEVO LAYOUT
import NewLayout from './components/layout/NewLayout'; // <-- AÑADIR NUEVO LAYOUT

// Páginas Públicas
import Login from './pages/auth/Login'; // Ajusta ruta
import UnauthorizedPage from './pages/UnauthorizedPage'; // Ajusta ruta

// Páginas Principales/Normales (Importaciones sin cambios)
import Home from './pages/Home'; // Ajusta ruta

// Páginas de Administración
import UserManagementPage from './pages/admin/UserManagementPage'; // Ajusta ruta
import RoleManagementPage from './pages/admin/RoleManagementPage'; // Ajusta ruta
import AreaManagementPage from './pages/admin/AreaManagementPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import ActiveSessionsPage from './pages/admin/ActiveSessionsPage'; // 🆕 NUEVA PÁGINA
// ... (importa otras páginas de admin si las tienes) ...
import AutorizacionPage from './pages/AutorizacionPage';
import FinalizarTareoPage from './pages/FinalizarTareoPage';
import ReporteAutorizacionPage from './pages/ReporteAutorizacionPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider> {/* Envuelve todo en AuthProvider */}
          <BrowserRouter>
            <Routes>
              {/* --- Rutas Públicas --- */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* --- Rutas Protegidas (Usuario Normal - Usan MainLayout) --- */}
              {/* Protección base: Requiere estar autenticado */}
              <Route element={<ProtectedRoute />}>
                {/* Layout principal para usuarios autenticados */}
                <Route path="/" element={<NewLayout  />}>
                  {/* Redirección del índice a la página principal */}
                  <Route index element={<Navigate to="/home" replace />} />

                  {/* Rutas accesibles para cualquier usuario autenticado */}
                  <Route path="home" element={<Home />} />                  
                  {/* Si /administracion es una página normal, va aquí */}
                  <Route path="finalizartareo" element={<FinalizarTareoPage />} />
                  <Route path="autorizacion" element={<AutorizacionPage />} />
                  <Route path="reportedestajo" element={<ReporteAutorizacionPage />} />

                  {/* Catch-all DENTRO de MainLayout: redirige a /home si la ruta no existe */}
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Route> {/* Fin MainLayout */}
              </Route> {/* Fin ProtectedRoute base */}


              {/* --- Rutas de Administración (Usan AdminLayout) --- */}
              {/* Ruta padre para toda la sección /admin */}
              <Route
                path="/admin"
                element={
                  // Protección específica: Requiere rol 'admin' para acceder a CUALQUIER ruta /admin/*
                  <ProtectedRoute requiredRole="admin">
                    <DndProvider backend={HTML5Backend}>
                    <NewLayout  /> {/* Usar el layout específico de admin */}
                    </DndProvider>
                  </ProtectedRoute>
                }
              >
                {/* Las rutas anidadas se renderizarán dentro del <Outlet /> de AdminLayout */}

                {/* Redirigir la ruta base /admin a la página de usuarios por defecto */}
                <Route index element={<Navigate to="usuarios" replace />} />

                {/* Páginas específicas de administración (ya no necesitan ProtectedRoute individual) */}
                
                <Route path="usuarios" element={<UserManagementPage />} />
                <Route path="roles" element={<RoleManagementPage />} />
                <Route path="areas" element={<AreaManagementPage />} />                
                <Route path="menus" element={<MenuManagementPage />} />
                       {/* 🆕 NUEVA RUTA: Gestión de Sesiones Activas */}
                <Route path="sesiones" element={<ActiveSessionsPage />} />
                
                {/* Añade aquí más rutas específicas de admin si las tienes */}
                {/* Ejemplo: <Route path="permisos" element={<PermissionPage />} /> */}

                 {/* Catch-all DENTRO de AdminLayout: redirige a /admin/usuarios si la ruta admin no existe */}
                 <Route path="*" element={<Navigate to="/admin/usuarios" replace />} />

              </Route> {/* Fin de rutas /admin */}


              {/* --- Catch-all Global (Opcional) --- */}
              {/* Si ninguna ruta coincide (ni pública, ni normal, ni admin), */}
              {/* puedes redirigir a login o mostrar una página 404 general. */}
              {/* Ejemplo: <Route path="*" element={<Navigate to="/login" replace />} /> */}

            </Routes>
            <Toaster position="top-right" /> {/* Configuración global de Toaster */}
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;