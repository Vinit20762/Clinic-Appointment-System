import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute
 * --------------
 * Wraps a route so only authenticated users with the correct role
 * can access it. Unauthorized users are redirected to /login.
 *
 * Usage:
 *   <ProtectedRoute roles={['admin']}>
 *     <AdminDashboard />
 *   </ProtectedRoute>
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    // Logged in but wrong role — send to their dashboard
    const dashboardMap = { admin: '/admin', doctor: '/doctor', patient: '/patient' };
    return <Navigate to={dashboardMap[user?.role] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
