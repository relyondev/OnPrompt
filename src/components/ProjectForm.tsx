import React, { useEffect, useRef, useState } from 'react';
import { Project } from '../types';
import { X } from 'lucide-react';

interface ProjectFormProps {
  project?: Project;
  onSave: (project: Project) => void;
  onCancel: () => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#3b82f6',
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const updatedProject: Project = {
      id: project?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      color: formData.color,
      createdAt: project?.createdAt || new Date(),
    };

    onSave(updatedProject);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-md overflow-hidden rounded-2xl border border-secondary-200 bg-white shadow-xl outline-none dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-secondary-200 p-6 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-secondary-900">
              {project ? 'Edit Category' : 'Create New Category'}
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

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary-700 dark:text-slate-200">
              Color
            </label>
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg border-2 border-secondary-300 dark:border-slate-600"
                style={{ backgroundColor: formData.color }}
              />
              <div className="flex gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      formData.color === color 
                        ? 'border-secondary-900 scale-110 dark:border-white' 
                        : 'border-secondary-300 hover:border-secondary-400 dark:border-slate-600 dark:hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
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
              disabled={!formData.name.trim()}
            >
              {project ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectForm; 
