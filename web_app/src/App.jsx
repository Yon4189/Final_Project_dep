import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout & Auth
import Layout from './layout/Layout';
import Login from './pages/Login';

// Pages
import Dashboard from './pages/Dashboard';
import Verification from './pages/Verification';
import Users from './pages/Users'; 
import Services from './pages/Services';
import Bookings from './pages/Bookings';
import Disputes from './pages/Disputes';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';

/**
 * 🛡️ ProtectedRoute Component
 * This wrapper checks if the user exists in our AuthContext.
 * If not, it redirects them to the /login page.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ✅ 1. PUBLIC ROUTES - Anyone can see these */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} /> 

          {/* 🔐 2. PROTECTED ROUTES - Only logged-in users */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/verification/pending" element={<Verification />} />
            <Route path="/verification/approved" element={<Verification />} />
            <Route path="/verification/rejected" element={<Verification />} />
            <Route path="/verification/suspended" element={<Verification />} />
            <Route path="/verification/all" element={<Verification />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/customers" element={<Users />} />
            <Route path="/users/providers" element={<Users />} />
            <Route path="services"   element={<Services />} />
            <Route path="/services/categories" element={<Services />} />
            <Route path="/services/services" element={<Services />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/pending" element={<Bookings />} />
            <Route path="/bookings/accepted" element={<Bookings />} />
            <Route path="/bookings/completed" element={<Bookings />} />
            <Route path="/bookings/cancelled" element={<Bookings />} />
            <Route path="disputes"   element={<Disputes />} />
            <Route path="payments"   element={<Payments />} />
            <Route path="settings"   element={<Settings />} />
            <Route path="profile"    element={<Profile />} />

            {/* Remove the /reset-password line from here! */}

            <Route path="*" element={<div className="p-10 text-center font-bold">404 - Page Not Found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;