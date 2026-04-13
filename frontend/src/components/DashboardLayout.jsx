import React from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children, title }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <main className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {title && (
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        )}
        <div className="page-enter">{children}</div>
      </div>
    </main>
  </div>
);

export default DashboardLayout;
