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
import Disputes from './pages/Disputes';

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
          {/* Public Route: Login */}
          <Route path="/login" element={<Login />} />
          
          {/* 🔐 Protected Routes: All routes inside here require login and use the Layout */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* The "index" route is what shows up at exactly http://localhost:5173/ */}
            <Route index element={<Dashboard />} />

            {/* Placeholder routes for the other sidebar links 
                We will replace these <div>s with real components in the next steps */}
            <Route path="verification" element={<Verification />} />
            <Route path="users" element={<Users />} />
            <Route path="services" element={<Services />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="disputes" element={<div className="p-4">Dispute Resolution Module</div>} />
            <Route path="payments" element={<div className="p-4">Payment Analytics Module</div>} />
            <Route path="settings" element={<div className="p-4">Platform Settings</div>} />

            {/* 404 Catch-all */}
            <Route path="*" element={<div className="p-10 text-center font-bold">404 - Page Not Found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;