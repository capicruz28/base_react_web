// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { auth, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Verificando sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectState = location.pathname !== '/unauthorized' ? { from: location } : undefined;
    return <Navigate to="/login" state={redirectState} replace />;
  }

  if (requiredRole) {
    const userRoles = (auth.user?.roles ?? []).map(r => r.toLowerCase());
    const required = requiredRole.toLowerCase();

    // Soporta tanto "Administrador" (backend) como "admin" (frontend)
    const synonyms: Record<string, string[]> = {
      admin: ['admin', 'administrador'],
    };
    const accepted = new Set(synonyms[required] ?? [required]);

    const hasRequiredRole = userRoles.some(r => accepted.has(r));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;