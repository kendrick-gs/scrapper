"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/CodeEditor";

type Props = {
  value: string;
  title?: string;
  onSave: (next: string) => Promise<void> | void;
};

export default function BodyHtmlEditor({ value, title = 'Edit Body HTML', onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>(value || "");
  const [tab, setTab] = useState<'edit'|'preview'>('edit');
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(value || ""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant={tab==='edit'?'default':'outline'} size="sm" onClick={()=>setTab('edit')}>Edit</Button>
            <Button variant={tab==='preview'?'default':'outline'} size="sm" onClick={()=>setTab('preview')}>Preview</Button>
          </div>
          {tab === 'edit' ? (
            <CodeEditor value={text} onChange={setText} language="liquid" />
          ) : (
            <div className="rounded-md border p-3 max-h-[65vh] overflow-auto">
              <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: text }} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await onSave(text); setOpen(false); }}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
