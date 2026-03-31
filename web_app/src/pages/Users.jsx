import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { useUsersData } from '../hooks/useUsersData';
import UsersTable from '../components/UsersTable';

const Users = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const userType = location.pathname.includes('/users/providers') ? 'Provider' : 'Customer';
  const { users, isLoading, isError, error, refetch } = useUsersData(userType);
  const [processingId, setProcessingId] = useState(null);

  const dbStatus = isError ? 'disconnected' : (isLoading ? 'checking' : 'connected');

  const handleToggleStatus = async (id, currentStatus) => {
    const action = currentStatus === 'Active' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
    setProcessingId(id);
    try {
      const url = userType === 'Provider'
        ? `/admin/providers/${id}/status`
        : `/admin/customers/${id}/status`;
      await api.patch(url, { status: currentStatus === 'Active' ? 'Suspended' : 'Active' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`PERMANENTLY DELETE ${name}? This cannot be undone.`)) return;
    setProcessingId(id);
    try {
      const url = userType === 'Provider'
        ? `/admin/providers/${id}`
        : `/admin/customers/${id}`;
      await api.delete(url);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {userType} Management
            </h1>
            {users.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                {users.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mt-1">
            Manage {userType.toLowerCase()} accounts and permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={14} className={
              dbStatus === 'connected' ? 'text-green-500' :
              dbStatus === 'disconnected' ? 'text-red-500' : 'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'Database Disconnected'}
              {dbStatus === 'checking' && 'Checking Database...'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <UsersTable
        users={users}
        userType={userType}
        isLoading={isLoading}
        processingId={processingId}
        dbStatus={dbStatus}
        error={error}
        onRefresh={refetch}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Users;