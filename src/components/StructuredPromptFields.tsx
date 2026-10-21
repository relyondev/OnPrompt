import React, { useMemo } from 'react';
import { Copy, Plus } from 'lucide-react';

interface StructuredPromptFieldsProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

interface StructuredSection {
  label: string;
  value: string;
}

const parseSections = (value: string): StructuredSection[] => {
  const lines = value.split(/\r?\n/);
  const sections: StructuredSection[] = [];
  let current: StructuredSection | null = null;

  lines.forEach(line => {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]{1,40}):\s*(.*)$/);
    if (match) {
      if (current) sections.push(current);
      current = { label: match[1].trim(), value: match[2].trim() };
    } else if (current) {
      current.value = `${current.value}${current.value ? '\n' : ''}${line}`.trimEnd();
    } else if (line.trim()) {
      current = { label: 'Structured Prompt', value: line.trim() };
    }
  });

  if (current) sections.push(current);
  return sections.length ? sections : [{ label: 'Structured Prompt', value: '' }];
};

const serializeSections = (sections: StructuredSection[]) => sections
  .filter(section => section.label.trim() || section.value.trim())
  .map(section => `${section.label.trim() || 'Section'}: ${section.value.trim()}`)
  .join('\n\n');

const StructuredPromptFields: React.FC<StructuredPromptFieldsProps> = ({ value, onChange, readOnly = false }) => {
  const sections = useMemo(() => parseSections(value), [value]);
  const editable = Boolean(onChange) && !readOnly;

  const updateSection = (index: number, patch: Partial<StructuredSection>) => {
    if (!onChange) return;
    const next = sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section);
    onChange(serializeSections(next));
  };

  const addSection = () => {
    if (!onChange) return;
    onChange(serializeSections([...sections, { label: 'New section', value: '' }]));
  };

  const copySection = async (section: StructuredSection) => {
    try { await navigator.clipboard.writeText(section.value); } catch { /* Clipboard access is optional. */ }
  };

  return (
    <div className="space-y-5">
      {sections.map((section, index) => (
        <article key={`${section.label}-${index}`} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            {editable ? (
              <input
                value={section.label}
                onChange={event => updateSection(index, { label: event.target.value })}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-semibold text-secondary-700 outline-none focus:ring-0 dark:text-slate-200 sm:text-xl"
                aria-label={`Structured section ${index + 1} label`}
              />
            ) : (
              <h3 className="text-lg font-semibold text-secondary-700 dark:text-slate-200 sm:text-xl">{section.label}</h3>
            )}
            <button type="button" onClick={() => copySection(section)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary-500 transition hover:bg-secondary-100 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-primary-300" title={`Copy ${section.label}`} aria-label={`Copy ${section.label}`}>
              <Copy className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {editable ? (
            <textarea
              value={section.value}
              onChange={event => updateSection(index, { value: event.target.value })}
              className="min-h-28 w-full resize-y rounded-lg border border-secondary-300 bg-transparent px-4 py-3 text-base leading-6 text-secondary-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-100 sm:text-lg"
              aria-label={section.label || `Structured section ${index + 1}`}
            />
          ) : (
            <div className="min-h-28 whitespace-pre-wrap rounded-lg border border-secondary-300 px-4 py-3 text-base leading-6 text-secondary-900 dark:border-slate-700 dark:text-slate-100 sm:text-lg">
              {section.value || <span className="text-secondary-400 dark:text-slate-500">No content added.</span>}
            </div>
          )}
        </article>
      ))}
      {editable && <button type="button" onClick={addSection} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-300 px-3 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/30"><Plus className="h-4 w-4" aria-hidden="true" />Add section</button>}
    </div>
  );
};

export default StructuredPromptFields;
