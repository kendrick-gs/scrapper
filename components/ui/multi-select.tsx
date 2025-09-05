"use client";
import React from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MultiSelectOption = { value: string; label: string; count?: number };

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  values: string[];
  onChange: (vals: string[]) => void;
  options: MultiSelectOption[];
  className?: string;
  maxVisibleBadges?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, placeholder='All', values, onChange, options, className, maxVisibleBadges=2 }) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // Close on outside click / touch or Escape key
  React.useEffect(() => {
    if (!open) return;
    const handlePointer = (e: Event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', handlePointer, true);
    window.addEventListener('touchstart', handlePointer, true);
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('mousedown', handlePointer, true);
      window.removeEventListener('touchstart', handlePointer, true);
      window.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);
  const toggle = (val: string) => {
    if (values.includes(val)) onChange(values.filter(v => v !== val));
    else onChange([...values, val]);
  };
  const clearAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange([]); };
  const applied = values.length;
  const display = applied === 0 ? placeholder : `${applied} selected`;
  const selectedLabels = options.filter(o => values.includes(o.value)).map(o => o.label);
  const visibleBadges = selectedLabels.slice(0, maxVisibleBadges);
  const overflow = selectedLabels.length - visibleBadges.length;
  return (
    <div ref={containerRef} className={cn('relative text-sm', className)}>
      {label && <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>}
      <button type="button" onClick={() => setOpen(o=>!o)} className={cn('h-10 px-3 w-full border rounded-md flex items-center justify-between text-left bg-background hover:bg-accent/30 transition', applied>0 && 'border-2 border-brand-green')}>
        <span className="truncate flex items-center gap-1">
          {visibleBadges.map(b => <span key={b} className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">{b}</span>)}
          {overflow>0 && <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">+{overflow}</span>}
          {visibleBadges.length===0 && placeholder}
        </span>
        <div className="flex items-center gap-2">
          {applied>0 && <span onClick={clearAll} className="text-[11px] underline cursor-pointer" aria-label="Clear selection">Clear</span>}
          <ChevronDownIcon className="size-4 opacity-60" />
        </div>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-md p-1 animate-in fade-in">
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs text-muted-foreground">{options.length} options</span>
            {values.length>0 && <button className="text-xs underline" onClick={clearAll}>Reset</button>}
          </div>
          {options.map(o => {
            const active = values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn('w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-accent/40', active && 'bg-accent/60 font-medium')}
              >
                <span className="truncate flex-1">{o.label}{typeof o.count==='number' && <span className="ml-1 text-xs text-muted-foreground">({o.count})</span>}</span>
                {active && <CheckIcon className="size-4" />}
              </button>
            );
          })}
          {options.length===0 && <div className="text-xs text-center py-4 text-muted-foreground">No options</div>}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
