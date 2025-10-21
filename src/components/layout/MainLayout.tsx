import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import LayoutWrapper from "../../common/LayoutWrapper";

const MainLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />

      {/* Contenido principal */}
      <div
        className={`flex-1 flex flex-col ${
          isSidebarCollapsed ? "pl-16" : "pl-64"
        }`}
      >
        <Header />

        {/* Main limpio sin paddings extra */}
        <main className="flex-1 bg-gray-100 dark:bg-gray-900 min-h-screen">
          <LayoutWrapper>
            <Outlet />
          </LayoutWrapper>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;