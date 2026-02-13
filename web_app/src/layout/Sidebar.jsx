import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// 1. Import the specific icons  
import { LayoutDashboard,  UserCheck,  Users,  Wrench,  Scale, BarChart3, Settings, LogOut, ClipboardList } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();   
  
  // 2. Assign the components to your menu items
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Manage Services', path: '/services', icon: Wrench },
    { name: 'Provider Verification', path: '/verification', icon: UserCheck },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Service Bookings', path: '/bookings', icon: ClipboardList },
    { name: 'Dispute Resolution', path: '/disputes', icon: Scale },
    { name: 'Payment Analytics', path: '/payments', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // ✅ THE LOGOUT HANDLER
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout from the Admin panel?")) {
      logout(); // This clears localStorage and state
      navigate('/login'); // This sends you back to the gate
    }
  };

  return (
    <div className="w-64 bg-admin-sidebar h-screen flex flex-col text-slate-400">
      <div className="p-6 text-xl font-bold text-white border-b border-slate-700 flex items-center gap-2">
        <span className="text-admin-accent font-black">HB_SFS</span>
      </div>

      <nav className="flex-1 mt-4">
        {menuItems.map((item) => {
          // 3. Create a dynamic Icon component
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 ${
                isActive 
                ? 'bg-admin-accent text-white shadow-lg border-r-4 border-white' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {/* 4. Use the Icon component with standard sizing */}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

         {/* ✅ ACTIVE LOGOUT BUTTON */}
      <div className="p-6 border-t border-slate-700">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-3 rounded-xl transition-all w-full font-black text-xs uppercase tracking-widest"
        >
          <LogOut size={18} />
          Logout System
        </button>
      </div>
    </div>
  );
};

export default Sidebar;