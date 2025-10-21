// src/components/layout/Header.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBreadcrumb } from '../../context/BreadcrumbContext';
import { User, Mail, Settings, LogOut, ChevronDown, ChevronRight, Home } from 'lucide-react';

const Header = () => {
  const { auth, logout } = useAuth();
  const { breadcrumbs } = useBreadcrumb();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (auth.user?.nombre && auth.user?.apellido) {
      return `${auth.user.nombre.charAt(0)}${auth.user.apellido.charAt(0)}`;
    }
    return 'U';
  };

  const handleBreadcrumbClick = (ruta?: string | null) => {
    if (ruta && ruta !== '#' && ruta !== null) {
      const normalizedPath = ruta.startsWith('/') ? ruta : `/${ruta}`;
      navigate(normalizedPath);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex-shrink-0 w-full border-b border-gray-200 dark:border-gray-700"> 
      <div className="h-full px-4 flex justify-between items-center">
        
        {/* Breadcrumb Section */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {breadcrumbs.length > 0 ? (
            <nav className="flex items-center space-x-2 text-sm overflow-x-auto">
              {/* Home Icon */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors flex-shrink-0"
                title="Inicio"
              >
                <Home className="w-4 h-4" />
              </button>
              
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                const hasRoute = crumb.ruta && crumb.ruta !== '#';
                
                return (
                  <div key={index} className="flex items-center space-x-2 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    
                    {hasRoute && !isLast ? (
                      <button
                        onClick={() => handleBreadcrumbClick(crumb.ruta)}
                        className="text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors font-medium truncate max-w-xs"
                        title={crumb.nombre}
                      >
                        {crumb.nombre}
                      </button>
                    ) : (
                      <span 
                        className={`truncate max-w-xs ${
                          isLast 
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                        title={crumb.nombre}
                      >
                        {crumb.nombre}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          ) : (
            <div className="flex items-center space-x-2">
              <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-lg font-semibold text-gray-800 dark:text-white">
                Dashboard
              </span>
            </div>
          )}
        </div>

        {/* User Menu Section */}
        <div className="relative ml-4 flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-sm">
              {getInitials()}
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-white hidden sm:inline">
              {auth.user?.nombre}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50">
              <button
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <User className="w-4 h-4 mr-3" />
                Mi perfil
              </button>

              <button
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <Mail className="w-4 h-4 mr-3" />
                Bandeja de entrada
              </button>

              <button
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <Settings className="w-4 h-4 mr-3" />
                Configuraciones de la cuenta
              </button>

              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

              <button
                onClick={logout}
                className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;