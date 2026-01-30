import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';

const Dashboard = () => <h2 className="text-2xl font-bold">Dashboard Overview</h2>;
const Verification = () => <h2 className="text-2xl font-bold">Verification Queue</h2>;
const ServicesCRUD = () => <h2 className="text-2xl font-bold">Manage Service Categories</h2>;
const Payments = () => <h2 className="text-2xl font-bold">Payment Analytics</h2>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="verification" element={<Verification />} />
          <Route path="services" element={<ServicesCRUD />} /> {/* CRUD HERE */}
          <Route path="payments" element={<Payments />} />     {/* PAYMENTS HERE */}
          <Route path="*" element={<div className="p-10 text-center text-2xl">404 - Page Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App