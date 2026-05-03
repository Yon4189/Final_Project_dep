import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './api/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout & Auth
import Layout from './layout/Layout';
import Login from './pages/Login';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Workflow from './pages/Workflow';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
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
import Payment from './pages/Payment';
import Maintenance from './pages/Maintenance';
import Withdrawals from './pages/Withdrawals';
import WithdrawalDetail from './pages/WithdrawalDetail';

/**
 *  ProtectedRoute Component
 * This wrapper checks if the user exists in our AuthContext.
 * If not, it redirects them to the / page (Home).
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-admin-content text-slate-800 dark:text-admin-text">Loading...</div>;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  // Theme is now managed by ThemeProvider and its internal useEffect

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/payment/:txRef" element={<Payment />} />
              <Route path="/maintenance" element={<Maintenance />} />
              
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="verification" element={<Verification />} />
                <Route path="verification/pending" element={<Verification />} />
                <Route path="verification/approved" element={<Verification />} />
                <Route path="verification/rejected" element={<Verification />} />
                <Route path="verification/suspended" element={<Verification />} />
                <Route path="verification/all" element={<Verification />} />
                <Route path="users" element={<Users />} />
                <Route path="users/customers" element={<Users />} />
                <Route path="users/providers" element={<Users />} />
                <Route path="services" element={<Services />} />
                <Route path="services/categories" element={<Services />} />
                <Route path="services/services" element={<Services />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/pending" element={<Bookings />} />
                <Route path="bookings/accepted" element={<Bookings />} />
                <Route path="bookings/completed" element={<Bookings />} />
                <Route path="bookings/rejected" element={<Bookings />} />
                <Route path="bookings/expired" element={<Bookings />} />
                <Route path="bookings/cancelled" element={<Bookings />} />
                <Route path="disputes" element={<Disputes />} />
                <Route path="disputes/:id" element={<Disputes />} />
                <Route path="payments" element={<Payments />} />
                <Route path="withdrawals" element={<Withdrawals />} />
                <Route path="withdrawals/:id" element={<WithdrawalDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Profile />} />
                <Route path="*" element={<div className="p-10 text-center font-bold text-slate-900 dark:text-admin-text bg-white dark:bg-admin-content h-full">404 - Page Not Found</div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;