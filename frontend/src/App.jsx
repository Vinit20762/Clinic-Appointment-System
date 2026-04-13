import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login           from './pages/Login';
import Register        from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard  from './pages/DoctorDashboard';
import AdminDashboard   from './pages/AdminDashboard';

// Redirect logged-in users from / to their dashboard
const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const map = { admin: '/admin', doctor: '/doctor', patient: '/patient' };
  return <Navigate to={map[user?.role] || '/login'} replace />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-based protected routes */}
        <Route
          path="/patient/*"
          element={
            <ProtectedRoute roles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/*"
          element={
            <ProtectedRoute roles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Root → dashboard based on role */}
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
