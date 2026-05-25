import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Database, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useUsersData } from '../hooks/useUsersData';
import UsersTable from '../components/UsersTable';

const Users = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const location = useLocation();
  const userTypeRaw = location.pathname.includes('/users/providers') ? 'Provider' : 'Customer';
  const { users, isLoading, isError, error, refetch } = useUsersData(userTypeRaw);
  const [processingId, setProcessingId] = useState(null);

  const dbStatus = isError ? 'disconnected' : (isLoading ? 'checking' : 'connected');
  const localizedUserType = t(userTypeRaw.toLowerCase());

  const handleToggleStatus = async (id, currentStatus) => {
    const normalizedStatus = currentStatus?.toLowerCase();
    const isActive = normalizedStatus === 'active' || normalizedStatus === 'approved';
    const actionKey = isActive ? 'user_mgmt_suspend_action' : 'user_mgmt_activate_action';
    
    if (!window.confirm(t('user_mgmt_confirm_toggle', { action: t(actionKey) }))) return;
    setProcessingId(id);
    try {
      const url = userTypeRaw === 'Provider'
        ? `/admin/providers/${id}/status`
        : `/admin/customers/${id}/status`;
      
      await api.patch(url);
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      console.error(err);
      alert(t('user_mgmt_err_status'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t('user_mgmt_confirm_delete', { name }))) return;
    setProcessingId(id);
    try {
      const url = userTypeRaw === 'Provider'
        ? `/admin/providers/${id}`
        : `/admin/customers/${id}`;
      await api.delete(url);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (err) {
      console.error(err);
      alert(t('user_mgmt_err_delete'));
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
            <h1 className="text-2xl font-black text-admin-text tracking-tight italic">
              {t('user_mgmt_title', { type: localizedUserType })}
            </h1>
            {users.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-sm">
                {users.length}
              </span>
            )}
          </div>
          <p className="text-admin-text-muted text-xs font-black uppercase tracking-widest italic mt-1">
            {t('user_mgmt_subtitle', { type: localizedUserType })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-admin-border bg-admin-card shadow-sm">
            <Database size={14} className={
              dbStatus === 'connected' ? 'text-green-500' :
              dbStatus === 'disconnected' ? 'text-red-500' : 'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-semibold uppercase tracking-wider text-admin-text-muted">
              {t(`db_${dbStatus}`)}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-admin-card border border-admin-border rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Refresh data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <UsersTable
        users={users}
        userType={userTypeRaw}
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