import React from "react";

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3">
      {children}
    </div>
  );
};

export default LayoutWrapper;