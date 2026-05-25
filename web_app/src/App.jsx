import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './api/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout
import Layout from './layout/Layout';

// Lazy loaded Pages
const Login = React.lazy(() => import('./pages/Login'));
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Workflow = React.lazy(() => import('./pages/Workflow'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Verification = React.lazy(() => import('./pages/Verification'));
const Users = React.lazy(() => import('./pages/Users'));
const Services = React.lazy(() => import('./pages/Services'));
const Bookings = React.lazy(() => import('./pages/Bookings'));
const Disputes = React.lazy(() => import('./pages/Disputes'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const Payment = React.lazy(() => import('./pages/Payment'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Withdrawals = React.lazy(() => import('./pages/Withdrawals'));
const WithdrawalDetail = React.lazy(() => import('./pages/WithdrawalDetail'));

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-admin-content text-slate-800 dark:text-admin-text">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-medium animate-pulse text-indigo-600">Loading...</p>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;