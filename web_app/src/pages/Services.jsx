import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

const Services = () => {
  // 1. Initial Mock Data (Using realistic IDs)
  const [categories, setCategories] = useState([
    // { id: "CAT-001", name: "Plumbing", description: "Water pipe repairs and installations", status: "Active" },
    // { id: "CAT-002", name: "Cleaning", description: "Deep house cleaning and laundry services", status: "Active" },
    // { id: "CAT-003", name: "Electrical", description: "Wiring, socket fixing and appliance repair", status: "Active" },
  ]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const mapped = data.data.map(cat => ({
            id: cat.catagoryID,
            name: cat.name,
            description: cat.description,
            status: cat.status
          }));
          setCategories(mapped);
        }
      });
  }, []);

  // 2. States for Modal and Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  // 3. Handlers
  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    try {
      if (editingCategory) {
        // TODO: API call to update category (later)

        
        // EDIT Logic
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/categories/${editingCategory.id}`, {
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
      } else {
        // CREATE Logic → send form data to Laravel API
        const response = await fetch(`http://127.0.0.1:8000/api/categories`, {
          method: 'POST',                     // Must match backend POST route
          headers: {
            'Content-Type': 'application/json',  
          },
          body: JSON.stringify(formData)      
        });

        const data = await response.json();   // Parse JSON response

        if (data.success) {
          const newCat = {
            
            id: data.data.catagoryID,  // map catagoryID → id
            name: data.data.name,
            description: data.data.description,
            status: data.data.status
          };
          setCategories([...categories, newCat]);
          setIsModalOpen(false);
        }


        if (data.success) {
          // Update local state with the category returned from backend
          setCategories([...categories, data.category]);
          setIsModalOpen(false);              // Close modal
        } else {
          alert(data.message || 'Something went wrong'); // Show error
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server');     // Handle network errors
    }
  };

  const handleDelete = async (id, name) => {

    if (!id) {
      console.error("Category ID is undefined");
      return;
    }

    if (!window.confirm(`Delete "${name}" category? Providers in this category will be affected.`)) {
      return;
    }

    try {
      if(!id){ console.error('Catedoru ID is undefinedddd'); return;}
      const response = await fetch(`http://127.0.0.1:8000/api/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setCategories(prev => prev.filter(cat => cat.id !== id));
      } else {
        alert(data.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server');
    }
  };
    console.log('Catagories state:', categories)
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manage Service Categories</h1>
          <p className="text-slate-500 text-sm">Configure the types of services available on the platform.</p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-admin-accent hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95">
          <Plus size={20} />
          Add New Category
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
                      type = "button"
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

      {/* --- CRUD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">
                {editingCategory ? 'Update Service' : 'New Service'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Name</label>
                <input 
                  type="text" required
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all text-slate-700 font-medium"
                  placeholder="e.g. Home Cleaning"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Description</label>
                <textarea 
                  required rows="3"
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all text-slate-700 font-medium"
                  placeholder="Briefly describe what this service covers..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
};

export default Services;