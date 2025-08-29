"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  presets?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  mode?: 'chips' | 'simple';
};

export default function TagsInput({ value, onChange, presets = [], placeholder = "Add tag", disabled, className, mode = 'chips' }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");

  const tags = useMemo(() => Array.from(new Set(value.map((t) => t.trim()).filter(Boolean))), [value]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = (presets || []).filter((t) => !tags.includes(t));
    if (!q) return base.slice(0, 8);
    const starts = base.filter((t) => t.toLowerCase().startsWith(q));
    const contains = base.filter((t) => !starts.includes(t) && t.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 8);
  }, [presets, tags, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(0);
        // commit free text on blur if present
        if (mode === 'chips') {
          const q = query.trim();
          if (q) addTag(q);
        } else if (mode === 'simple') {
          commitText(text);
        }
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [query, text, mode]);

  useEffect(() => {
    if (mode === 'simple') {
      setText(tags.join(', '));
    }
  }, [tags.join(','), mode]);

  function addTag(t: string) {
    const tag = t.trim();
    if (!tag) return;
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setQuery("");
    setOpen(false);
    setHighlight(0);
    inputRef.current?.focus();
  }

  function commitText(t: string) {
    const list = t
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    onChange(Array.from(new Set(list)));
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      const q = query.trim();
      if (q || (open && suggestions[highlight])) {
        e.preventDefault();
        if (open && suggestions[highlight]) addTag(suggestions[highlight]);
        else addTag(q);
      }
    } else if (e.key === "Backspace" && !query && tags.length > 0) {
      // remove last tag
      removeTag(tags[tags.length - 1]);
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
      {mode === 'chips' ? (
        <div
          className={cn(
            "min-h-10 w-full rounded-md border bg-background px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-ring",
            disabled && "opacity-60 pointer-events-none"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="flex items-center gap-1">
                {t}
                <button
                  type="button"
                  aria-label={`Remove ${t}`}
                  className="-mr-1 ml-1 rounded px-1 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(t);
                  }}
                >
                  ×
                </button>
              </Badge>
            ))}
            <Input
              ref={inputRef}
              className="h-7 flex-1 border-0 shadow-none focus-visible:ring-0 px-1"
              placeholder={tags.length === 0 ? placeholder : ""}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setHighlight(0);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <Input
          ref={inputRef}
          className="h-8 w-full"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            setOpen(true);
            setHighlight(0);
            commitText(next);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
        />
      )}

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
                addTag(s);
              }}
            >
              <span className="truncate">{s}</span>
              <span className="text-xs text-muted-foreground">Enter to add</span>
            </button>
          ))}
        </div>
      )}

      {/* Removed quick preset chips for a simpler UI */}
    </div>
  );
}
