// src/pages/UnauthorizedPage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Para saber a dónde volver

const UnauthorizedPage: React.FC = () => {
  const { isAdmin } = useAuth();
  // Decide a dónde enviar al usuario: admin a su dashboard, otros a /home
  const returnPath = isAdmin ? '/admin/usuarios' : '/home';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold text-red-600 dark:text-red-500 mb-4">
        Acceso Denegado
      </h1>
      <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
        Lo sentimos, no tienes los permisos necesarios para acceder a esta página.
      </p>
      <Link
        to={returnPath}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors duration-200 text-lg"
      >
        Volver a mi página principal
      </Link>
    </div>
  );
};

export default UnauthorizedPage;