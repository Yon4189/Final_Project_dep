import React from 'react';

function App() {
  return (
    <div className="flex h-screen items-center justify-center bg-admin-bg">
      <div className="text-center p-8 bg-admin-card rounded-xl border border-slate-700 shadow-2xl">
        <h1 className="text-3xl font-bold text-admin-accent mb-4">
          Home-Based Service Finder
        </h1>
        <p className="text-slate-400 mb-6">Admin Dashboard Web-App initialized</p>
        
        <div className="flex gap-2 justify-center">
          <span className="px-3 py-1 bg-admin-bg rounded border border-slate-600 text-xs text-admin-accent">Tailwind Active</span>
          <span className="px-3 py-1 bg-admin-bg rounded border border-slate-600 text-xs text-admin-accent">React 19</span>
        </div>
      </div>
    </div>
  );
}

export default App;