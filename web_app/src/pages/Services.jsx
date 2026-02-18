import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, CheckCircle, Loader2, Layers, Wrench, Edit2 } from 'lucide-react';
import api from '../api/axios'; // Using your axios instance

const ServiceCatalog = () => {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'services'
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    catagoryID: '' // Primary key for category / Foreign key for services
  });

  // FETCH DATA
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const catRes = await api.get('/catagories');
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

  // OPEN MODAL LOGIC
  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description,
        catagoryID: category.id
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', catagoryID: '' });
    }
    setIsModalOpen(true);
  };

  // SUBMIT LOGIC (Handles both Categories and Services)
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        // TODO: API call to update category (later)

        // EDIT Logic
        try {
          const response = await fetch(`http://127.0.0.1:8000/api/catagories/${editingCategory.id}`, {
            method: 'PUT', // use PUT for update
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData), // send updated name & description
          });

          const data = await response.json();

          if (data.success) {
            // Update frontend state
            setCategories(categories.map(cat =>
              cat.id === editingCategory.id
                ? {
                  id: data.data.catagoryID,
                  name: data.data.name,
                  description: data.data.description,
                  status: data.data.status,
                }
                : cat
            ));
            setIsModalOpen(false); // close modal
          } else {
            alert(data.message || 'Failed to update category');
          }
        } catch (err) {
          console.error(err);
          alert('Error connecting to server');
        }
      }

      else {
        // CREATE Logic → send form data to Laravel API
        const response = await fetch(`http://127.0.0.1:8000/api/catagories`, {
          method: 'POST',                     // Must match backend POST route
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();   // Parse JSON response


        if (data.success) {
          // Update local state with the category returned from backend
          setCategories([...categories, data.category]);
          setIsModalOpen(false);              // Close modal
        } else {
          alert(data.message || 'Something went wrong'); // Show error
        }

        // try {
        //   // if (activeTab === 'categories') {
        //   //   // Create Category
        //   //   await api.post('/categories', { 
        //   //   //     name: formData.name, 
        //   //   //     description: formData.description 
        //   //   //     });
        //   //   //   }
        // }
      }


    }
    catch (err) {
      console.error(err);
      alert('Error connecting to server');
    }
  };
  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return;

    try {

      const response = await fetch(`http://127.0.0.1:8000/api/catagories/${id}`, {
        method: 'DELETE',
      });

      if (response.data.success) {
        fetchData(); // Refresh list after delete
      }
      else {
        alert(response.data.message || 'Failed to delete item');
      }

    }
    catch (err) {
      console.error(err);
      alert('Error connecting to server');
    }
  };

  console.log('Catagories state:', categories)
  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Catalog</h1>
          <p className="text-slate-500 text-sm">Manage categories and their specific tasks.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-admin-accent hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">
          <Plus size={20} />
          Add {activeTab === 'categories' ? 'Category' : 'Service'}
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Category ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                    {cat.id}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-900">{cat.name}</td>
                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{cat.description}</td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-green-100 text-green-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                    {cat.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(cat)}
                      className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Edit2 size={14} /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {categories.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic">No categories created yet. Click "Add New" to start.</div>
        )}
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
                      <Trash2 size={18} />
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Name</label>
                <input
                  type="text" required
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all text-slate-700 font-medium"
                  placeholder="e.g. Home Cleaning"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Description</label>
                <textarea
                  required rows="3"
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 outline-none font-medium text-slate-600"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-admin-accent hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  {editingCategory ? 'Update' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}

export default ServiceCatalog;




