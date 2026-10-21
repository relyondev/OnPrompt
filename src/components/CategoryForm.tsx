import React, { useEffect, useRef, useState } from 'react';
import { Category, Project } from '../types';
import { X } from 'lucide-react';

interface CategoryFormProps {
  category?: Category;
  projects: Project[];
  onSave: (category: Category) => void;
  onCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  projects,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    projectId: category?.projectId || '',
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.projectId) {
      return;
    }

    const updatedCategory: Category = {
      id: category?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      projectId: formData.projectId,
    };

    onSave(updatedCategory);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-md overflow-hidden rounded-2xl border border-secondary-200 bg-white shadow-xl outline-none dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-secondary-200 p-6 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-secondary-900">
              {category ? 'Edit Category' : 'Create New Category'}
            </h2>
            <button
              onClick={onCancel}
              className="rounded-xl p-2 text-secondary-500 transition-colors hover:bg-secondary-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Close category form"
            >
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input-field"
              placeholder="Enter category name..."
              required
            />
          </div>

          {/* Project */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select a category</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="textarea-field"
              placeholder="Enter category description..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-secondary-200 pt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!formData.name.trim() || !formData.projectId}
            >
              {category ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm; 
