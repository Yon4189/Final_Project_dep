import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2, Smile, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

const COMMON_ICONS = [
  '🔧', '🧹', '⚡', '📡', '🎨', '🪚', '❄️', '🏠', '🌱', '📦', '💄', '📚',
  '🚿', '🚗', '🐶', '🍕', '💻', '🔒', '🔑', '👗', '🧺', '🪴', '🔨', '🔌'
];

const CategoryModal = ({ isOpen, category, onClose, onSubmit, isSubmitting }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [iconMode, setIconMode] = useState('emoji'); // 'emoji', 'url', 'upload'
  const [formData, setFormData] = useState({
    name: '',
    icon: '🛠️',
    description: '',
    icon_file: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        icon: category.icon || '🛠️',
        description: category.description || '',
        icon_file: null
      });
      // Determine mode based on icon content
      if (category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/storage'))) {
        setIconMode('url');
        setPreviewUrl(category.icon);
      } else {
        setIconMode('emoji');
        setPreviewUrl(null);
      }
    } else {
      setFormData({ name: '', icon: '🛠️', description: '', icon_file: null });
      setIconMode('emoji');
      setPreviewUrl(null);
    }
  }, [category, isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, icon_file: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create FormData for file upload support
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    
    if (iconMode === 'upload' && formData.icon_file) {
      data.append('icon_file', formData.icon_file);
    } else {
      data.append('icon', formData.icon);
    }

    // If editing, Laravel PUT might need _method trick if sending files
    if (category && (iconMode === 'upload' && formData.icon_file)) {
      data.append('_method', 'PUT');
      onSubmit(data, true); // true indicates it's a multipart request
    } else {
      onSubmit(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-admin-card rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-admin-border">
        <div className="p-6 border-b border-admin-border flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-xl font-bold text-admin-text uppercase tracking-tight">
            {category ? t('serv_modal_update_cat') : t('serv_modal_new_cat')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full"
            aria-label={t('modal_close')}
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-1 block">
              {t('serv_modal_cat_name')}
            </label>
            <input
              type="text"
              required
              className="w-full border border-admin-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-admin-card text-admin-text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-2 block">
              Category Icon
            </label>
            
            {/* Mode Switcher */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIconMode('emoji')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${iconMode === 'emoji' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <Smile size={14} /> Emoji
              </button>
              <button
                type="button"
                onClick={() => setIconMode('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${iconMode === 'url' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <LinkIcon size={14} /> URL
              </button>
              <button
                type="button"
                onClick={() => setIconMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${iconMode === 'upload' ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <Upload size={14} /> Upload
              </button>
            </div>

            {iconMode === 'emoji' && (
              <div className="flex flex-wrap gap-2 p-3 border border-admin-border rounded-xl bg-slate-50/50 dark:bg-slate-800/20 max-h-32 overflow-y-auto">
                {COMMON_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                      formData.icon === icon && iconMode === 'emoji'
                        ? 'bg-blue-500 scale-110 shadow-md' 
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {iconMode === 'url' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Paste image URL from Google..."
                  className="w-full border border-admin-border rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-admin-card text-admin-text"
                  value={formData.icon}
                  onChange={(e) => {
                    setFormData({ ...formData, icon: e.target.value });
                    setPreviewUrl(e.target.value);
                  }}
                />
              </div>
            )}

            {iconMode === 'upload' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-admin-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <ImageIcon size={32} className="text-slate-400" />
                <p className="text-xs text-admin-text-muted font-medium text-center">
                  {formData.icon_file ? formData.icon_file.name : 'Click to upload from local computer'}
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-admin-border">
              <span className="text-[10px] font-black uppercase tracking-widest text-admin-text-muted italic">Preview</span>
              <div className="w-12 h-12 flex items-center justify-center bg-admin-card rounded-lg text-3xl border border-admin-border shadow-sm overflow-hidden">
                {iconMode === 'emoji' ? (
                  formData.icon
                ) : (
                  previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="icon" /> : <Smile className="text-slate-300" />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-admin-text-muted uppercase tracking-wider mb-1 block">
              {t('serv_modal_desc_optional')}
            </label>
            <textarea
              rows="3"
              className="w-full border border-admin-border rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition bg-admin-card text-admin-text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSubmitting ? t('serv_modal_saving') : t('serv_modal_save_cat')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;