"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  presets?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function ComboInput({ label, value, onChange, presets = [], placeholder, disabled, className }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const current = value?.trim() || "";

  const suggestions = useMemo(() => {
    const base = (presets || []).filter((p) => p !== current);
    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 8);
    const starts = base.filter((t) => t.toLowerCase().startsWith(q));
    const contains = base.filter((t) => !starts.includes(t) && t.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 8);
  }, [presets, current, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(0);
        const q = query.trim();
        if (q && q !== current) onChange(q);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [query, current, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === "Tab") {
      const q = query.trim();
      if (q || (open && suggestions[highlight])) {
        e.preventDefault();
        if (open && suggestions[highlight]) onChange(suggestions[highlight]);
        else onChange(q);
        setQuery("");
        setOpen(false);
      }
    } else if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setHighlight((h) => (h + 1) % suggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setOpen(true);
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <Input
        ref={inputRef}
        className="h-8 w-full"
        placeholder={placeholder || label}
        value={query || current}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {open && suggestions.length > 0 && (
        <div className="mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestions.map((s, idx) => (
            <button
              key={s}
              type="button"
              className={cn(
                "flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-accent",
                idx === highlight && "bg-accent"
              )}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="truncate">{s}</span>
              <span className="text-xs text-muted-foreground">Enter to choose</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
