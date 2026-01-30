import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// 1. Import the specific icons  
import { LayoutDashboard,  UserCheck,  Users,  Wrench,  Scale, BarChart3, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  // 2. Assign the components to your menu items
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Provider Verification', path: '/verification', icon: UserCheck },
    { name: 'User Management', path: '/users', icon: Users },
    { name: 'Manage Services', path: '/services', icon: Wrench },
    { name: 'Dispute Resolution', path: '/disputes', icon: Scale },
    { name: 'Payment Analytics', path: '/payments', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

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

      <div className="p-6 border-t border-slate-700">
        <button className="flex items-center gap-3 text-red-400 hover:text-red-300 text-sm font-bold w-full">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;