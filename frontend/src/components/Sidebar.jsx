import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Nav items per role
const navConfig = {
  patient: [
    { label: 'Dashboard',    path: '/patient',               icon: '🏠' },
    { label: 'Book Appointment', path: '/patient/book',      icon: '📅' },
    { label: 'My Appointments',  path: '/patient/appointments', icon: '📋' },
    { label: 'Token Queue',  path: '/patient/queue',          icon: '🔢' },
  ],
  doctor: [
    { label: 'Dashboard',    path: '/doctor',                icon: '🏠' },
    { label: 'Appointments', path: '/doctor/appointments',   icon: '📋' },
    { label: 'Availability', path: '/doctor/availability',   icon: '📅' },
    { label: 'Token Queue',  path: '/doctor/queue',          icon: '🔢' },
  ],
  admin: [
    { label: 'Dashboard',    path: '/admin',                 icon: '🏠' },
    { label: 'Doctors',      path: '/admin/doctors',         icon: '👨‍⚕️' },
    { label: 'Patients',     path: '/admin/patients',        icon: '👥' },
    { label: 'Reports',      path: '/admin/reports',         icon: '📊' },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const links            = navConfig[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    admin:   'from-purple-700 to-purple-900',
    doctor:  'from-blue-700 to-blue-900',
    patient: 'from-emerald-700 to-emerald-900',
  };

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Brand */}
      <div className={`px-6 py-5 bg-gradient-to-b ${roleColors[user?.role]}`}>
        <h1 className="text-xl font-bold tracking-tight">ClinicQ</h1>
        <p className="text-xs text-white/70 mt-0.5 capitalize">{user?.role} Portal</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/patient' || path === '/doctor' || path === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                     text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
