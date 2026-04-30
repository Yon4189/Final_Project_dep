import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import {
  Settings as SettingsIcon, Save, Activity, ShieldCheck,
  Percent, Globe, Zap, Database, Server, AlertTriangle,
  Image as ImageIcon, Type, UploadCloud, RefreshCcw, Loader2, Download, MapPin, Trash2, Plus, Pencil, Check, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const Settings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [latency, setLatency] = useState({ api: '...', db: '...' });
  const [depositPercentage, setDepositPercentage] = useState(20);
  const [isSavingDeposit, setIsSavingDeposit] = useState(false);
  const [depositSaved, setDepositSaved] = useState(false);

  // 1. Platform Configuration (Initially Mock but ready for backend sync)
  const [config, setConfig] = useState({
    commissionRate: 10,
    maxServiceRadius: 15,
    minPayoutAmount: 500,
    maintenanceMode: false,
  });

  // 2. Branding Configuration
  const [branding, setBranding] = useState({
    systemName: 'HB Service Finder Admin',
    logoUrl: null,
  });

  // 3. Service Cities
  const [cities, setCities] = useState([]);
  const [newCityName, setNewCityName] = useState('');
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [editingCityId, setEditingCityId] = useState(null);
  const [editCityName, setEditCityName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch existing settings from backend
  const { data: existingSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/settings');
        return response.data.success ? response.data.data : null;
      } catch (err) {
        console.error('Failed to load settings:', err);
        return null;
      }
    },
  });

  // Update state when settings are loaded
  useEffect(() => {
    if (existingSettings) {
      if (existingSettings.settings) {
        setConfig(existingSettings.settings);
      }
      if (existingSettings.branding) {
        setBranding(existingSettings.branding);
      }
    }
  }, [existingSettings]);

  // Fetch deposit percentage
  const { data: depositData } = useQuery({
    queryKey: ['depositPercentage'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/settings/deposit-percentage');
        return response.data.success ? response.data.data : null;
      } catch (err) {
        return null;
      }
    },
  });

  useEffect(() => {
    if (depositData?.deposit_percentage !== undefined) {
      setDepositPercentage(depositData.deposit_percentage);
    }
  }, [depositData]);

  const handleSaveDeposit = async () => {
    if (depositPercentage < 1 || depositPercentage > 99) {
      alert('Deposit percentage must be between 1 and 99');
      return;
    }
    setIsSavingDeposit(true);
    try {
      const response = await api.put('/admin/settings/deposit-percentage', { deposit_percentage: depositPercentage });
      if (response.data.success) {
        setDepositSaved(true);
        queryClient.invalidateQueries({ queryKey: ['depositPercentage'] });
        setTimeout(() => setDepositSaved(false), 3000);
      }
    } catch (err) {
      alert('Failed to save deposit percentage');
    } finally {
      setIsSavingDeposit(false);
    }
  };



  // Fetch real statistics from backend to provide context for settings
  const { data: stats, isLoading: isStatsLoading, refetch: refreshStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        const response = await api.get('/admin/stats');
        return response.data.success ? response.data.data : null;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // Real-time API Latency Monitoring
  useEffect(() => {
    const checkLatency = async () => {
      const start = Date.now();
      try {
        await api.get('/health');
        const end = Date.now();
        setLatency(prev => ({ ...prev, api: `${end - start}ms` }));
      } catch (e) {
        setLatency(prev => ({ ...prev, api: 'OFFLINE' }));
      }
    };

    checkLatency();
    const interval = setInterval(checkLatency, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  // --- CITY MANAGEMENT LOGIC ---
  const fetchCities = async () => {
    setIsLoadingCities(true);
    try {
      const response = await api.get('/admin/cities');
      if (response.data.success) {
        setCities(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    } finally {
      setIsLoadingCities(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cities') {
      fetchCities();
    }
  }, [activeTab]);

  const handleAddCity = async () => {
    if (!newCityName.trim()) return;
    setIsAddingCity(true);
    try {
      const response = await api.post('/admin/cities', {
        name: newCityName,
        status: 'Active'
      });
      if (response.data.success) {
        setCities([...cities, response.data.data]);
        setNewCityName('');
        alert(t('set_cities_added'));
      }
    } catch (err) {
      alert(err.response?.data?.message || t('set_cities_add_failed'));
    } finally {
      setIsAddingCity(false);
    }
  };

  const toggleCityStatus = async (city) => {
    const newStatus = city.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const response = await api.put(`/admin/cities/${city.cityID}`, {
        status: newStatus
      });
      if (response.data.success) {
        setCities(cities.map(c => c.cityID === city.cityID ? { ...c, status: newStatus } : c));
      }
    } catch (err) {
      alert(t('set_cities_status_failed'));
    }
  };

  const handleDeleteCity = async (cityID) => {
    if (!window.confirm(t('set_cities_delete_confirm'))) return;
    try {
      const response = await api.delete(`/admin/cities/${cityID}`);
      if (response.data.success) {
        setCities(cities.filter(c => c.cityID !== cityID));
        alert(t('set_cities_deleted'));
      }
    } catch (err) {
      alert(t('set_cities_delete_failed'));
    }
  };

  const handleStartEdit = (city) => {
    setEditingCityId(city.cityID);
    setEditCityName(city.name);
  };

  const handleCancelEdit = () => {
    setEditingCityId(null);
    setEditCityName('');
  };

  const handleSaveEdit = async (cityID) => {
    if (!editCityName.trim()) return;
    setIsSavingEdit(true);
    try {
      const response = await api.put(`/admin/cities/${cityID}`, {
        name: editCityName
      });
      if (response.data.success) {
        setCities(cities.map(c => c.cityID === cityID ? { ...c, name: editCityName } : c));
        setEditingCityId(null);
        setEditCityName('');
        alert(t('set_cities_updated'));
      }
    } catch (err) {
      alert(err.response?.data?.message || t('set_cities_update_failed'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = cities.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(cities.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Attempt to persist settings to backend
      const response = await api.post('/admin/settings', {
        settings: config,
        branding: branding
      });

      if (response.data.success) {
        // Invalidate settings cache to refetch
        queryClient.invalidateQueries(['adminSettings']);
        
        alert(t('Settings saved successfully!'));
      }
    } catch (error) {
      console.error("Persist failed:", error);
      
      // Show appropriate error message
      if (error.response?.status === 404) {
        alert(t('Settings endpoint not found. Please contact support.'));
      } else if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        const errorMessages = errors ? Object.values(errors).flat().join('\n') : 'Validation failed';
        alert(`Validation errors:\n${errorMessages}`);
      } else {
        alert(t('Failed to save settings. Please try again.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const downloadReport = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get('/admin/system-report');
      if (!response.data.success) throw new Error('Failed');
      const d = response.data.data;

      const fmt = (n) => Number(n || 0).toLocaleString('en-ET');
      const pct = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;
      const maxRev = Math.max(...(d.monthly_revenue || []).map(m => m.revenue), 1);

      const statusBadge = (s) => {
        const map = { completed:'#16a34a', accepted:'#2563eb', pending:'#d97706', cancelled:'#dc2626', pending_final:'#7c3aed' };
        const bg = { completed:'#dcfce7', accepted:'#dbeafe', pending:'#fef3c7', cancelled:'#fee2e2', pending_final:'#ede9fe' };
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;background:${bg[s]||'#f1f5f9'};color:${map[s]||'#475569'}">${s}</span>`;
      };

      const progressBar = (val, max, color) =>
        `<div style="background:#f1f5f9;border-radius:6px;height:8px;width:100%;margin-top:6px"><div style="background:${color};height:8px;border-radius:6px;width:${pct(val,max)}%"></div></div>`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${d.settings.system_name} – System Report ${d.generated_at}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f0f4f8;color:#1e293b;padding:40px;font-size:13px;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    .page-break{page-break-before:always}

    /* COVER */
    .cover{background:linear-gradient(135deg,#1e40af 0%,#6366f1 50%,#8b5cf6 100%);color:#fff;border-radius:24px;padding:56px 48px;margin-bottom:28px;position:relative;overflow:hidden}
    .cover::after{content:'';position:absolute;right:-60px;top:-60px;width:280px;height:280px;background:rgba(255,255,255,.07);border-radius:50%}
    .cover-tag{font-size:10px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;opacity:.7;margin-bottom:12px}
    .cover h1{font-size:36px;font-weight:900;line-height:1.15;letter-spacing:-.5px}
    .cover-sub{margin-top:10px;opacity:.75;font-size:14px}
    .cover-meta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
    .chip{background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700}

    /* SECTION */
    .section{background:#fff;border-radius:18px;padding:28px 32px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.05);border:1px solid #e8edf2}
    .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:#94a3b8;margin-bottom:22px;display:flex;align-items:center;gap:8px}
    .section-title span{display:inline-block;width:3px;height:14px;background:linear-gradient(#6366f1,#3b82f6);border-radius:2px}

    /* KPI GRID */
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}
    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px 18px}
    .kpi .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:10px}
    .kpi .kpi-val{font-size:26px;font-weight:900;line-height:1}
    .kpi .kpi-unit{font-size:11px;color:#64748b;margin-top:4px;font-weight:600}
    .kpi-green{color:#16a34a}.kpi-blue{color:#2563eb}.kpi-amber{color:#d97706}.kpi-red{color:#dc2626}.kpi-purple{color:#7c3aed}

    /* TWO COL */
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px}

    /* BAR CHART */
    .bar-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    .bar-label{width:72px;font-size:11px;font-weight:700;color:#64748b;text-align:right;flex-shrink:0}
    .bar-track{flex:1;background:#f1f5f9;border-radius:6px;height:10px}
    .bar-fill{height:10px;border-radius:6px;min-width:2px}
    .bar-val{width:60px;font-size:11px;font-weight:800;color:#1e293b;text-align:right;flex-shrink:0}

    /* PROVIDER BREAKDOWN */
    .prov-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9}
    .prov-row:last-child{border-bottom:none}
    .prov-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:8px}

    /* TABLE */
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding:8px 12px;border-bottom:2px solid #e2e8f0;background:#f8fafc}
    td{padding:11px 12px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#f8fafc}
    .tr-alt{background:#fafbfc}

    /* SETTINGS GRID */
    .setting-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .setting-item:last-child{border-bottom:none}
    .setting-key{font-size:12px;font-weight:600;color:#475569}
    .setting-val{font-size:13px;font-weight:800;color:#1e293b}

    /* FOOTER */
    .footer{text-align:center;padding:24px 0 0;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:8px}

    @media print{body{padding:20px;background:#fff}.cover{border-radius:12px}}
  </style>
</head>
<body>

<!-- ═══ COVER ═══ -->
<div class="cover">
  <div class="cover-tag">Official Administrative Report</div>
  <h1>${d.settings.system_name}<br/>System Report</h1>
  <p class="cover-sub">Comprehensive platform infrastructure, financial and operational overview</p>
  <div class="cover-meta">
    <div class="chip">📅 ${d.generated_at}</div>
    <div class="chip">👤 ${d.generated_by}</div>
    <div class="chip">✉️ ${d.admin_email || 'admin'}</div>
    <div class="chip">${d.settings.maintenance_mode ? '🔴 MAINTENANCE ON' : '🟢 SYSTEM LIVE'}</div>
  </div>
</div>

<!-- ═══ PLATFORM CONFIGURATION ═══ -->
<div class="section">
  <div class="section-title"><span></span>Platform Configuration (Active Settings)</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
    <div class="setting-item" style="padding-right:32px">
      <span class="setting-key">💰 Commission Rate</span>
      <span class="setting-val kpi-purple">${d.settings.commission_rate}%</span>
    </div>
    <div class="setting-item" style="padding-left:32px;border-left:1px solid #f1f5f9">
      <span class="setting-key">🌍 Max Service Radius</span>
      <span class="setting-val kpi-blue">${d.settings.max_service_radius} KM</span>
    </div>
    <div class="setting-item" style="padding-right:32px">
      <span class="setting-key">💵 Min Withdrawal Threshold</span>
      <span class="setting-val">${fmt(d.settings.min_payout_amount)} ETB</span>
    </div>
    <div class="setting-item" style="padding-left:32px;border-left:1px solid #f1f5f9">
      <span class="setting-key">🔒 Maintenance Mode</span>
      <span class="setting-val ${d.settings.maintenance_mode ? 'kpi-red' : 'kpi-green'}">${d.settings.maintenance_mode ? 'ACTIVE' : 'OFFLINE'}</span>
    </div>
  </div>
</div>

<!-- ═══ USER STATISTICS ═══ -->
<div class="section">
  <div class="section-title"><span></span>User Statistics</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Providers</div><div class="kpi-val">${d.users.total_providers}</div></div>
    <div class="kpi"><div class="kpi-label">Approved</div><div class="kpi-val kpi-green">${d.users.approved_providers}</div><div class="kpi-unit">${pct(d.users.approved_providers, d.users.total_providers)}% of total</div></div>
    <div class="kpi"><div class="kpi-label">Pending Review</div><div class="kpi-val kpi-amber">${d.users.pending_providers}</div></div>
    <div class="kpi"><div class="kpi-label">Suspended</div><div class="kpi-val kpi-red">${d.users.suspended_providers}</div></div>
    <div class="kpi"><div class="kpi-label">Rejected</div><div class="kpi-val" style="color:#64748b">${d.users.rejected_providers || 0}</div></div>
    <div class="kpi"><div class="kpi-label">Total Customers</div><div class="kpi-val kpi-blue">${d.users.total_customers}</div></div>
  </div>
  <div style="margin-top:24px">
    ${[['Approved',d.users.approved_providers,'#16a34a'],['Pending',d.users.pending_providers,'#d97706'],['Suspended',d.users.suspended_providers,'#dc2626'],['Rejected',d.users.rejected_providers||0,'#94a3b8']].map(([label,val,color])=>`
      <div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="background:${color};width:${pct(val,d.users.total_providers)}%"></div></div>
        <div class="bar-val">${val} (${pct(val,d.users.total_providers)}%)</div>
      </div>`).join('')}
  </div>
</div>

<!-- ═══ TWO COL: BOOKINGS + FINANCIALS ═══ -->
<div class="two-col">
  <div class="section" style="margin-bottom:0">
    <div class="section-title"><span></span>Booking Statistics</div>
    <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-val">${d.bookings.total}</div></div>
      <div class="kpi"><div class="kpi-label">Completed</div><div class="kpi-val kpi-green">${d.bookings.completed}</div><div class="kpi-unit">${pct(d.bookings.completed,d.bookings.total)}%</div></div>
      <div class="kpi"><div class="kpi-label">In Progress</div><div class="kpi-val kpi-blue">${d.bookings.accepted || 0}</div></div>
      <div class="kpi"><div class="kpi-label">Pending</div><div class="kpi-val kpi-amber">${d.bookings.pending}</div></div>
      <div class="kpi" style="grid-column:span 2"><div class="kpi-label">Cancelled</div><div class="kpi-val kpi-red">${d.bookings.cancelled}</div></div>
    </div>
  </div>
  <div class="section" style="margin-bottom:0">
    <div class="section-title"><span></span>Withdrawal Overview</div>
    <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
      <div class="kpi"><div class="kpi-label">Total Requests</div><div class="kpi-val">${d.withdrawals?.total || 0}</div></div>
      <div class="kpi"><div class="kpi-label">Approved</div><div class="kpi-val kpi-green">${d.withdrawals?.approved || 0}</div></div>
      <div class="kpi"><div class="kpi-label">Pending</div><div class="kpi-val kpi-amber">${d.withdrawals?.pending || 0}</div></div>
      <div class="kpi"><div class="kpi-label">Total Paid Out</div><div class="kpi-val kpi-purple">${fmt(d.withdrawals?.amount)}</div><div class="kpi-unit">ETB</div></div>
    </div>
  </div>
</div>

<!-- ═══ FINANCIAL OVERVIEW ═══ -->
<div class="section" style="margin-top:20px">
  <div class="section-title"><span></span>Financial Overview (ETB)</div>
  <div class="kpi-grid">
    <div class="kpi" style="border-left:4px solid #6366f1">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-val kpi-purple">${fmt(d.financials.total_revenue)}</div>
      <div class="kpi-unit">ETB collected</div>
    </div>
    <div class="kpi" style="border-left:4px solid #2563eb">
      <div class="kpi-label">Platform Commission (${d.settings.commission_rate}%)</div>
      <div class="kpi-val kpi-blue">${fmt(d.financials.platform_commission)}</div>
      <div class="kpi-unit">ETB earned</div>
    </div>
    <div class="kpi" style="border-left:4px solid #16a34a">
      <div class="kpi-label">Provider Payouts</div>
      <div class="kpi-val kpi-green">${fmt(d.financials.provider_payouts)}</div>
      <div class="kpi-unit">ETB released</div>
    </div>
    <div class="kpi" style="border-left:4px solid #d97706">
      <div class="kpi-label">Pending Funds</div>
      <div class="kpi-val kpi-amber">${fmt(d.financials.pending_payments)}</div>
      <div class="kpi-unit">ETB in escrow</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Transactions</div>
      <div class="kpi-val">${d.financials.total_transactions || 0}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Successful</div>
      <div class="kpi-val kpi-green">${d.financials.successful_payments || 0}</div>
      <div class="kpi-unit">${pct(d.financials.successful_payments, d.financials.total_transactions)}% success rate</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Failed</div>
      <div class="kpi-val kpi-red">${d.financials.failed_payments || 0}</div>
    </div>
  </div>
</div>

<!-- ═══ MONTHLY REVENUE BAR CHART ═══ -->
<div class="section">
  <div class="section-title"><span></span>Monthly Revenue Trend (Last 6 Months)</div>
  ${(d.monthly_revenue || []).map(m => `
    <div class="bar-row">
      <div class="bar-label" style="width:80px;font-size:10px">${m.month}</div>
      <div class="bar-track"><div class="bar-fill" style="background:linear-gradient(90deg,#6366f1,#3b82f6);width:${pct(m.revenue, maxRev)}%"></div></div>
      <div class="bar-val">${m.revenue > 0 ? fmt(m.revenue) + ' ETB' : '—'}</div>
    </div>`).join('')}
</div>

<!-- ═══ TWO COL: TOP PROVIDERS + CATEGORIES ═══ -->
<div class="two-col">
  <div class="section" style="margin-bottom:0">
    <div class="section-title"><span></span>Top 5 Providers by Rating</div>
    ${(d.top_providers || []).length ? `<table>
      <thead><tr><th>#</th><th>Name</th><th>City</th><th>Rating</th><th>Jobs</th></tr></thead>
      <tbody>${(d.top_providers || []).map((p,i)=>`<tr class="${i%2?'tr-alt':''}">
        <td style="font-weight:800;color:#6366f1">${i+1}</td>
        <td><div style="font-weight:700">${p.name}</div><div style="color:#94a3b8;font-size:10px">${p.email}</div></td>
        <td>${p.city}</td>
        <td style="font-weight:800;color:#d97706">⭐ ${p.rating || 'N/A'}</td>
        <td style="font-weight:700;color:#16a34a">${p.completed_jobs}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<p style="color:#94a3b8;font-size:12px;text-align:center;padding:20px">No approved providers yet</p>'}
  </div>
  <div class="section" style="margin-bottom:0">
    <div class="section-title"><span></span>Category Breakdown</div>
    ${(d.category_breakdown || []).slice(0,8).map(c=>`
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:12px;font-weight:600;color:#334155">${c.name}</span>
          <span style="font-size:11px;font-weight:800;color:#6366f1">${c.providers} providers</span>
        </div>
        ${progressBar(c.providers, Math.max(...(d.category_breakdown||[]).map(x=>x.providers),1), '#6366f1')}
      </div>`).join('')}
  </div>
</div>

<!-- ═══ RECENT BOOKINGS ═══ -->
<div class="section" style="margin-top:20px;page-break-inside:avoid">
  <div class="section-title"><span></span>Recent Booking Activity (Last 10)</div>
  <table>
    <thead><tr><th>#</th><th>Customer</th><th>Provider</th><th>Service</th><th>Amount</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
    <tbody>
      ${(d.recent_bookings || []).map((b,i)=>`
        <tr class="${i%2?'tr-alt':''}">
          <td style="font-weight:800;color:#94a3b8">#${b.id}</td>
          <td style="font-weight:600">${b.customer}</td>
          <td style="font-weight:600">${b.provider}</td>
          <td style="color:#64748b">${b.service}</td>
          <td style="font-weight:800">${fmt(b.amount)} <span style="font-size:10px;color:#94a3b8">ETB</span></td>
          <td>${statusBadge(b.status)}</td>
          <td>${statusBadge(b.payment_status || 'unpaid')}</td>
          <td style="color:#64748b;font-size:11px">${b.date}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="footer">
  <strong>CONFIDENTIAL</strong> — This report was generated by ${d.settings.system_name} Admin Panel on ${d.generated_at} by ${d.generated_by} (${d.admin_email || ''}).<br/>
  For internal use only. Unauthorized distribution is prohibited.
</div>

</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${d.settings.system_name.replace(/\s+/g,'-')}-Report-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
      alert('Failed to generate system report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('set_branding_logo_size_error') || 'Logo size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.post('/admin/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const logoUrl = response.data.data.logo_url;
        setBranding({ ...branding, logoUrl });
        queryClient.invalidateQueries(['adminSettings']);
        alert(t('set_branding_logo_success') || 'Logo uploaded successfully!');
      }
    } catch (err) {
      console.error('Logo upload failed:', err);
      alert(t('set_branding_logo_error') || 'Failed to upload logo. Please try again.');
    }

    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const systemHealth = [
    {
      name: t('set_health_api'),
      status: latency.api === 'OFFLINE' ? t('db_disconnected') : t('set_status_optimal'),
      latency: latency.api,
      icon: Server,
      color: latency.api === 'OFFLINE' ? 'text-rose-500' : 'text-emerald-500'
    },
    {
      name: t('set_health_mysql'),
      status: stats ? t('set_status_active_sync') : t('set_status_reconnecting'),
      latency: '14ms',
      icon: Database,
      color: stats ? 'text-emerald-500' : 'text-amber-500'
    },
    {
      name: t('set_health_network'),
      status: t('set_status_providers', { count: stats?.active || 0 }),
      latency: stats ? t('set_status_optimal') : t('set_status_wait'),
      icon: Zap,
      color: 'text-sky-400'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-admin-accent/10 rounded-2xl text-admin-accent">
              <SettingsIcon size={24} />
            </div>
            <h1 className="text-2xl font-bold text-admin-text tracking-tight">{t('set_title')}</h1>
          </div>
          <p className="text-admin-text-muted text-[11px] font-bold uppercase tracking-[0.2em] mt-2 ml-1">
            {t('set_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { refreshStats(); alert("System health cache cleared."); }}
            className="p-4 bg-admin-card border-2 border-admin-border rounded-2xl text-slate-400 hover:text-admin-accent transition-all group active:scale-95 shadow-sm"
          >
            <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT: Configuration Area */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tab Navigation */}
          <div className="flex gap-2 p-2 bg-admin-card w-fit rounded-[2rem] border border-admin-border shadow-sm">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-admin-card text-admin-accent shadow-sm ring-1 ring-admin-border dark:ring-slate-800' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              {t('set_tab_economics')}
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'branding' ? 'bg-admin-card text-admin-accent shadow-sm ring-1 ring-admin-border dark:ring-slate-800' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              {t('set_tab_branding')}
            </button>
            <button
              onClick={() => setActiveTab('cities')}
              className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cities' ? 'bg-admin-card text-admin-accent shadow-sm ring-1 ring-admin-border dark:ring-slate-800' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              {t('set_tab_cities')}
            </button>
          </div>

          <div className="bg-admin-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-admin-border overflow-hidden">
            {activeTab === 'general' ? (
              /* --- GENERAL RULES TAB --- */
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Percent size={14} className="text-admin-accent" /> {t('set_comm_rate')}
                    </label>
                    <div className="relative group">
                      <input
                        type="number"
                        max="100"
                        min="0"
                        className="w-full border-2 border-admin-border bg-admin-card rounded-2xl py-5 px-6 focus:outline-none focus:border-admin-accent font-black text-xl text-admin-text transition-all shadow-sm"
                        value={config.commissionRate}
                        onChange={(e) => setConfig({ ...config, commissionRate: parseInt(e.target.value) || 0 })}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-admin-accent transition-colors">%</div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">{t('set_comm_desc')}</p>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Globe size={14} className="text-admin-accent" /> {t('set_radius')}
                    </label>
                    <div className="relative group">
                      <input
                        type="number"
                        className="w-full border-2 border-admin-border bg-admin-card rounded-2xl py-5 px-6 focus:outline-none focus:border-admin-accent font-black text-xl text-admin-text transition-all shadow-sm"
                        value={config.maxServiceRadius}
                        onChange={(e) => setConfig({ ...config, maxServiceRadius: parseInt(e.target.value) || 0 })}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-admin-accent transition-colors">KM</div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">{t('set_radius_desc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Zap size={14} className="text-admin-accent" /> {t('set_min_payout')}
                    </label>
                    <div className="relative group">
                      <input
                        type="number"
                        className="w-full border-2 border-admin-border bg-admin-card rounded-2xl py-5 px-6 focus:outline-none focus:border-admin-accent font-black text-xl text-admin-text transition-all shadow-sm"
                        value={config.minPayoutAmount}
                        onChange={(e) => setConfig({ ...config, minPayoutAmount: parseInt(e.target.value) || 0 })}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-admin-accent transition-colors">ETB</div>
                    </div>
                  </div>
                </div>

                <div className={`p-8 rounded-3xl border transition-all duration-700 flex flex-col md:flex-row items-center justify-between gap-6 
                  ${config.maintenanceMode && config.maintenanceMode === existingSettings?.settings?.maintenanceMode 
                    ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]' 
                    : config.maintenanceMode 
                      ? 'bg-amber-500/5 border-amber-200' 
                      : 'bg-admin-card border-admin-border'}`}>
                  
                  <div className="text-center md:text-left flex-1">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <p className={`text-sm font-black uppercase tracking-widest ${config.maintenanceMode ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 text-admin-text'}`}>
                        {t('set_maintenance_title')}
                      </p>
                      
                      {/* --- CLEAR STATUS INDICATORS --- */}
                      {config.maintenanceMode !== existingSettings?.settings?.maintenanceMode ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-amber-200/50">
                          <Save size={10} /> {t('set_status_draft')}
                        </div>
                      ) : config.maintenanceMode ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-rose-200/50 animate-pulse">
                          <Activity size={10} /> {t('set_status_live')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] font-black uppercase rounded-full">
                          {t('set_status_inactive')}
                        </div>
                      )}
                    </div>
                    
                    <p className={`text-xs mt-2 ${config.maintenanceMode ? 'text-rose-600/70 font-bold' : 'text-slate-500'}`}>
                      {config.maintenanceMode && config.maintenanceMode === existingSettings?.settings?.maintenanceMode 
                        ? "THE SYSTEM IS CURRENTLY LOCKED. ALL EXTERNAL ACCESS IS DENIED."
                        : t('set_maintenance_desc')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                      className={`w-20 h-10 rounded-full transition-all relative p-1 shadow-inner ${config.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300 dark:bg-admin-sidebar'}`}
                    >
                      <div className={`w-8 h-8 bg-white rounded-full shadow-lg transform transition-all duration-300 ${config.maintenanceMode ? 'translate-x-10' : 'translate-x-0'}`}>
                      </div>
                    </button>
                  </div>
                </div>

                {/* --- INTEGRATED SPLIT PAYMENT SECTION --- */}
                <div className="border-t border-admin-border pt-10 space-y-10">
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-admin-text uppercase tracking-widest flex items-center gap-2">
                      <Percent size={16} className="text-admin-accent" /> {t('set_split_title')}
                    </h3>
                    <p className="text-xs text-slate-400">{t('set_split_desc')}</p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-6 space-y-2">
                    <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">{t('set_split_how')}</p>
                    <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>{t('set_split_upfront_desc', { percent: depositPercentage })}</li>
                      <li>{t('set_split_post_desc', { percent: 100 - depositPercentage })}</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Percent size={14} className="text-admin-accent" /> {t('set_split_label')}
                    </label>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className="w-32 border-2 border-admin-border bg-admin-card rounded-2xl py-4 px-6 focus:outline-none focus:border-admin-accent font-black text-2xl text-admin-text transition-all shadow-sm text-center"
                          value={depositPercentage}
                          onChange={(e) => setDepositPercentage(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                        />
                        <span className="text-2xl font-black text-admin-text">%</span>
                      </div>
                      <div className="flex-1 w-full bg-admin-card border border-admin-border rounded-2xl p-4">
                        <div className="h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex">
                          <div className="bg-blue-500 transition-all duration-300" style={{ width: `${depositPercentage}%` }} />
                          <div className="bg-green-400 flex-1" />
                        </div>
                        <div className="flex justify-between text-[10px] font-black mt-2 uppercase tracking-tighter">
                          <span className="text-blue-500">{depositPercentage}% {t('set_split_upfront')}</span>
                          <span className="text-green-500">{100 - depositPercentage}% {t('set_split_post')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveDeposit}
                    disabled={isSavingDeposit}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingDeposit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {depositSaved ? `✓ ${t('set_split_saved')}` : t('set_split_update')}
                  </button>

                  {/* Overdue Payment Management */}
                  <div className="border-t border-admin-border pt-8 space-y-4">
                    <h3 className="text-sm font-black text-admin-text uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500" /> {t('set_overdue_title')}
                    </h3>
                    {stats?.overdue_bookings?.length > 0 ? (
                      <div className="space-y-3">
                        {stats.overdue_bookings.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4">
                            <div>
                              <p className="text-xs font-black text-admin-text">Booking #{booking.id}</p>
                              <p className="text-[10px] text-slate-400">{booking.customer_name} • {t('set_overdue_days', { count: booking.days_overdue })}</p>
                            </div>
                            <span className="text-red-500 font-black text-xs">{booking.amount_owed} ETB</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-2xl p-6 text-center">
                        <p className="text-xs font-black text-green-600 uppercase tracking-widest">{t('set_overdue_up_to_date')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'cities' ? (
              /* --- CITIES MANAGEMENT TAB --- */
              <div className="p-10 space-y-10">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-admin-text uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={16} className="text-admin-accent" /> {t('set_cities_title')}
                  </h3>
                  <p className="text-xs text-slate-400">{t('set_cities_desc')}</p>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 relative group">
                    <input
                      type="text"
                      className="w-full border-2 border-admin-border bg-admin-card rounded-2xl py-5 px-6 focus:outline-none focus:border-admin-accent font-black text-lg text-admin-text transition-all shadow-sm"
                      placeholder={t('set_cities_placeholder')}
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCity()}
                    />
                  </div>
                  <button
                    onClick={handleAddCity}
                    disabled={isAddingCity || !newCityName.trim()}
                    className="bg-admin-accent text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200/50 dark:shadow-none"
                  >
                    {isAddingCity ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {t('set_cities_add')}
                  </button>
                </div>

                <div className="border border-admin-border rounded-3xl overflow-hidden bg-admin-card/30">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-admin-card border-b border-admin-border">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('set_cities_col_name')}</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('set_cities_col_status')}</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('set_cities_col_actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                      {isLoadingCities ? (
                        <tr>
                          <td colSpan="3" className="px-8 py-10 text-center">
                            <Loader2 size={24} className="animate-spin text-admin-accent mx-auto" />
                          </td>
                        </tr>
                      ) : cities.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-8 py-10 text-center text-slate-400 font-bold italic">
                            {t('set_cities_empty')}
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((city) => (
                          <tr key={city.cityID} className="group hover:bg-admin-card/50 transition-colors">
                            <td className="px-8 py-5">
                              {editingCityId === city.cityID ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    className="bg-admin-card border-2 border-admin-accent/50 rounded-xl px-4 py-2 font-black text-admin-text uppercase italic focus:outline-none focus:border-admin-accent shadow-sm"
                                    value={editCityName}
                                    onChange={(e) => setEditCityName(e.target.value)}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEdit(city.cityID)}
                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                    disabled={isSavingEdit}
                                  >
                                    {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-2 text-slate-400 hover:bg-slate-500/10 rounded-lg transition-all"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-black text-admin-text uppercase italic">{city.name}</span>
                              )}
                            </td>
                            <td className="px-8 py-5">
                              <button
                                onClick={() => toggleCityStatus(city)}
                                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${city.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}
                              >
                                {t(city.status === 'Active' ? 'serv_status_active' : 'serv_status_inactive')}
                              </button>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                {editingCityId !== city.cityID && (
                                  <button
                                    onClick={() => handleStartEdit(city)}
                                    className="p-3 text-slate-300 hover:text-admin-accent hover:bg-admin-accent/10 rounded-xl transition-all active:scale-90"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteCity(city.cityID)}
                                  className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination UI */}
                {!isLoadingCities && cities.length > itemsPerPage && (
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {t('set_cities_showing', { start: indexOfFirstItem + 1, end: Math.min(indexOfLastItem, cities.length), total: cities.length })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl bg-admin-card border border-admin-border text-slate-400 hover:text-admin-accent disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      
                      <div className="flex gap-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => paginate(i + 1)}
                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-90 ${currentPage === i + 1 ? 'bg-admin-accent text-white shadow-lg shadow-blue-200/50 dark:shadow-none' : 'bg-admin-card border border-admin-border text-slate-500 hover:border-admin-accent hover:text-admin-accent'}`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl bg-admin-card border border-admin-border text-slate-400 hover:text-admin-accent disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* --- BRANDING TAB (LOGO & NAME) --- */
              <div className="p-10 space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <Type size={14} className="text-admin-accent" /> {t('set_branding_name')}
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-admin-border bg-admin-card rounded-2xl py-6 px-8 focus:outline-none focus:border-admin-accent font-black text-2xl text-admin-text transition-all shadow-sm"
                    value={branding.systemName}
                    onChange={(e) => setBranding({ ...branding, systemName: e.target.value })}
                    placeholder={t('set_branding_name_placeholder')}
                  />
                  <p className="text-[10px] text-slate-400 italic">{t('set_branding_name_desc')}</p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <ImageIcon size={14} className="text-admin-accent" /> {t('set_branding_assets')}
                  </label>
                  <div className="flex flex-col md:flex-row gap-8 items-center border-4 border-dashed border-admin-border p-12 rounded-[3rem] bg-admin-card/50 group hover:border-admin-accent/20 transition-colors">
                    <div className="w-32 h-32 bg-admin-card rounded-3xl shadow-xl border border-admin-border flex items-center justify-center text-slate-200 group-hover:scale-105 transition-transform duration-500 overflow-hidden relative">
                      {branding.logoUrl ? (
                        <img src={branding.logoUrl} alt="System Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={48} />
                      )}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <UploadCloud size={24} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100 italic">{t('set_branding_logo_title')}</p>
                      <p className="text-xs text-slate-400 mb-6 font-medium">{t('set_branding_logo_desc')}</p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoUpload} 
                        accept="image/png, image/jpeg, image/svg+xml" 
                        className="hidden" 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-3 bg-blue-600 dark:bg-admin-accent text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                      >
                        <UploadCloud size={16} /> {t('set_branding_logo_btn')}
                      </button>
                    </div>
                  </div>
                </div>


              </div>
            )}

            <div className="px-10 py-8 bg-admin-card border-t border-admin-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-emerald-500" /> {t('set_save_verified')}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`
                  flex items-center gap-3 px-12 py-5 rounded-[1.5rem] font-black tracking-widest uppercase text-xs shadow-2xl transition-all active:scale-95 
                  ${isSaving
                    ? 'bg-slate-200 bg-admin-card text-slate-400 cursor-not-allowed'
                    : 'bg-admin-accent text-white hover:bg-blue-600 shadow-blue-200/50 dark:shadow-blue-900/50'}
                `}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? t('user_mgmt_processing') : t('set_save_btn')}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Ledger & Health */}
        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-admin-sidebar rounded-[3rem] p-10 text-white shadow-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-admin-accent/10 rounded-full blur-[80px] group-hover:bg-admin-accent/20 transition-all duration-1000"></div>

            <h2 className="text-xs font-black flex items-center gap-3 mb-10 uppercase tracking-[0.3em] text-slate-400 italic">
              <Activity size={18} className="text-admin-accent animate-pulse" />
              {t('set_pulse_title')}
            </h2>

            <div className="space-y-8 relative z-10">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-[1.5rem] bg-white/5 border border-white/10 ${item.color} group-hover/item:scale-110 group-hover/item:bg-white/10 transition-all duration-300`}>
                      <item.icon size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.name}</p>
                      <p className="text-sm font-bold text-slate-100 tracking-tight">{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('set_pulse_latency')}</p>
                    <p className="text-xs font-mono font-black text-admin-accent">{item.latency}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-10 border-t border-white/5 relative z-10">
              <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                <AlertTriangle size={16} className="text-amber-500" /> {t('set_security_logs')}
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <p className="text-[10px] leading-relaxed text-slate-400 italic font-medium">
                  • {t('set_log_stable')}
                </p>
                <p className="text-[10px] leading-relaxed text-slate-400 italic font-medium">
                  • {t('set_log_no_penetration')}
                </p>
                <p className="text-[10px] leading-relaxed text-slate-500 italic mt-4 block">
                  {t('set_last_login')} {window.location.hostname}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-admin-accent rounded-[3rem] p-10 text-white shadow-xl shadow-blue-200/50 border border-white/10 group overflow-hidden relative">
            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <ShieldCheck size={200} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-4 opacity-70 italic">{t('set_infra_summary')}</p>
            <h3 className="text-2xl font-black uppercase italic mb-6 leading-tight">{t('set_infra_ready_title')}</h3>
            <p className="text-xs leading-relaxed font-medium opacity-90 mb-8 italic">
              {t('set_infra_ready_desc')}
            </p>
            <button
              onClick={downloadReport}
              disabled={isDownloading}
              className={`w-full backdrop-blur-md border border-white/20 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2
                ${isDownloading
                  ? 'bg-white/5 text-white/40 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white hover:text-admin-accent'}`}
            >
              {isDownloading
                ? <><Loader2 size={14} className="animate-spin" /> Generating Report...</>
                : <><Download size={14} /> {t('set_infra_report_btn')}</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;


