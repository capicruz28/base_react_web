import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../admin/AdminSidebar"; 
import LayoutWrapper from "../../common/LayoutWrapper";

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar de administración */}
      <AdminSidebar />

      {/* Área principal */}
      <main className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900 min-h-screen">
        {/* Si después quieres un header especial para admin, lo agregas aquí */}
        {/* <AdminHeader /> */}

        {/* Contenido */}
        <LayoutWrapper>
          <Outlet />
        </LayoutWrapper>
      </main>
    </div>
  );
};

export default AdminLayout;