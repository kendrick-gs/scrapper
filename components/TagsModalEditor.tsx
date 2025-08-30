"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TagsInput from '@/components/TagsInput';

type Props = {
  value: string[];
  presets?: string[];
  title?: string;
  onSave: (next: string[]) => Promise<void> | void;
};

export default function TagsModalEditor({ value, presets = [], title = 'Edit Tags', onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(value || []);
  const dirty = JSON.stringify([...value].sort()) !== JSON.stringify([...tags].sort());

  useEffect(() => { if (open) setTags(value || []); }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">Tags</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
            <TagsInput value={tags} onChange={setTags} presets={presets} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              <Button variant="outline" disabled={!dirty} onClick={async () => { await onSave(tags); setOpen(false); }}>Save</Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
