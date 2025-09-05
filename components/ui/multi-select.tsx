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
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: Event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick as EventListener);
    window.addEventListener('touchstart', onClick as EventListener);
    return () => { window.removeEventListener('mousedown', onClick as EventListener); window.removeEventListener('touchstart', onClick as EventListener); };
  }, [open]);
  const toggle = (val: string) => {
    if (values.includes(val)) onChange(values.filter(v => v !== val));
    else onChange([...values, val]);
    // Keep menu open for multi-selection; user will press Done or click outside to close.
  };
  const clearAll = (e: React.MouseEvent) => { e.stopPropagation(); onChange([]); };
  const applied = values.length;
  const selectedLabels = options.filter(o => values.includes(o.value)).map(o => o.label);
  let triggerLabel: string = placeholder;
  if (applied === 1) triggerLabel = selectedLabels[0];
  else if (applied > 1) triggerLabel = `${applied} Selected`;
  return (
    <div ref={containerRef} className={cn('relative text-sm', className)}>
      {label && <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>}
      <button type="button" onClick={() => setOpen(o=>!o)} className={cn('h-10 px-3 w-full border rounded-md flex items-center justify-between text-left bg-background hover:bg-accent/30 transition', applied>0 && 'border-2 border-brand-green')}>
  <span className="truncate flex items-center gap-1 text-sm">{triggerLabel}</span>
        <div className="flex items-center gap-2">
          {applied>0 && <span onClick={clearAll} className="text-[11px] underline cursor-pointer" aria-label="Clear selection">Clear</span>}
          <ChevronDownIcon className="size-4 opacity-60" />
        </div>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-md p-1 animate-in fade-in">
          <div className="sticky top-0 bg-popover px-1 py-1 border-b grid grid-cols-3 items-center gap-1">
            <span className="text-[11px] text-muted-foreground">{options.length} options</span>
            <button type="button" onClick={() => setOpen(false)} className="mx-auto text-[11px] font-medium bg-accent/40 hover:bg-accent/60 rounded px-2 py-0.5 transition">Done</button>
            {values.length>0 ? (
              <button type="button" className="text-[11px] underline justify-self-end" onClick={clearAll}>Reset</button>
            ) : <span />}
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
