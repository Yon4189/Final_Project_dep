import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, CheckCircle, Loader2, Layers, Wrench } from 'lucide-react';
import api from '../api/axios'; // Using your axios instance

const ServiceCatalog = () => {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'services'
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    catagoryID: '' // Primary key for category / Foreign key for services
  });

  // 🚀 FETCH DATA
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const catRes = await api.get('/categories');
      const svcRes = await api.get('/services');
      setCategories(catRes.data.data || []);
      setServices(svcRes.data.data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // 🚀 SUBMIT LOGIC (Handles both Categories and Services)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'categories') {
        // Create Category
        await api.post('/categories', { 
          name: formData.name, 
          description: formData.description 
        });
      } else {
        // Create Service under a Category
        await api.post('/services', formData);
      }
      
      setIsModalOpen(false);
      setFormData({ name: '', description: '', catagoryID: '' });
      fetchData(); // Refresh list
    } catch (err) {
      alert("Error saving to database. Check if the Category ID is selected.");
    }
  };

  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    try {
      const endpoint = type === 'categories' ? `/categories/${id}` : `/services/${id}`;
      const response = await api.delete(endpoint);

      if (response.data.success) {
        fetchData(); // Refresh list after delete
      } else {
        alert(response.data.message || 'Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Catalog</h1>
          <p className="text-slate-500 text-sm">Manage categories and their specific tasks.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#4a90e2] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus size={20} />
          Add {activeTab === 'categories' ? 'Category' : 'Service'}
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-slate-200/50 w-fit rounded-2xl border border-slate-200">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'categories' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Layers size={16} /> Categories
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'services' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
        >
          <Wrench size={16} /> Specific Services
        </button>
      </div>

      {isLoading ? (
        <div className="p-20 text-center flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updating Catalog...</span>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Name</th>
                {activeTab === 'services' && <th className="px-8 py-5">Parent Category</th>}
                <th className="px-8 py-5">Description</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeTab === 'categories' ? categories : services).map((item) => (
                <tr key={item.catagoryID || item.serviceID} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-black text-slate-800">{item.name}</td>
                  {activeTab === 'services' && (
                    <td className="px-8 py-5">
                       <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-blue-100">
                          {item.category?.name || 'Unassigned'}
                       </span>
                    </td>
                  )}
                  <td className="px-8 py-5 text-sm text-slate-500 truncate max-w-xs">{item.description}</td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(activeTab, item.catagoryID || item.serviceID, item.name)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800">
                {activeTab === 'categories' ? 'New Category' : 'New Specific Service'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {activeTab === 'services' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category</label>
                  <select 
                    required
                    className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 outline-none font-bold text-slate-700"
                    value={formData.catagoryID}
                    onChange={(e) => setFormData({...formData, catagoryID: e.target.value})}
                  >
                    <option value="">Select a category...</option>
                    {categories.map(c => <option key={c.catagoryID} value={c.catagoryID}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                <input 
                  type="text" required placeholder="e.g. Plumbing or Pipe Repair"
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 outline-none font-bold text-slate-700"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  required rows="3"
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 outline-none font-medium text-slate-600"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full bg-[#4a90e2] text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                <CheckCircle size={18} /> Confirm Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCatalog;