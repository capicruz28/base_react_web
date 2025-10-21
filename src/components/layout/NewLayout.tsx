// src/components/layout/NewLayout.tsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { BreadcrumbProvider } from "../../context/BreadcrumbContext";
import NewSidebar from "./NewSidebar";
import Header from "./Header";
import LayoutWrapper from "../../common/LayoutWrapper";

const NewLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const sidebarWidthExpanded = "pl-64";
  const sidebarWidthCollapsed = "pl-16";

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        
        {/* Sidebar (Fixed) */}
        <NewSidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

        {/* Contenido principal (Header + Main) */}
        <div
          className={`flex-1 flex flex-col ${
            isSidebarCollapsed ? sidebarWidthCollapsed : sidebarWidthExpanded
          } transition-all duration-300`}
        >
          {/* Header con Breadcrumb */}
          <Header />

          {/* Main Content */}
          <main className="flex-1 bg-gray-100 dark:bg-gray-900 min-h-screen">
            <LayoutWrapper>
              <Outlet />
            </LayoutWrapper>
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
};

export default NewLayout;