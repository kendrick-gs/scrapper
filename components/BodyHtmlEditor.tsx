"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CodeEditor from "@/components/CodeEditor";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  title?: string;
  onSave: (next: string) => Promise<void> | void;
};

export default function BodyHtmlEditor({ value, title = 'Edit Body HTML', onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>(value || "");
  const [wrapPreview, setWrapPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync when reopened
  useEffect(() => { if (open) { setText(value || ""); setDirty(false);} }, [open, value]);

  const save = useCallback(async () => {
    await onSave(text);
    setDirty(false);
    setOpen(false);
  }, [text, onSave]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7">Edit</Button>
      </DialogTrigger>
  <DialogContent className="w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-[1800px] max-h-[100vh] m-0 p-0 overflow-hidden flex flex-col bg-background rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between px-6 md:px-10 pt-4 pb-2 border-b sticky top-0 z-10 bg-background">
            <span className="text-lg font-semibold">{title}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{text.length} chars</span>
              {dirty && <span className="text-amber-600 dark:text-amber-500">Unsaved</span>}
              <Button variant="outline" size="sm" onClick={() => setWrapPreview(w => !w)}>{wrapPreview ? 'No Wrap Preview' : 'Wrap Preview'}</Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
              <Button variant="default" size="sm" disabled={!dirty} onClick={save}>Save</Button>
            </div>
          </DialogTitle>
        </DialogHeader>
  <div className="flex-1 flex flex-col overflow-hidden px-6 md:px-10 pb-6">
          <div className="flex-1 min-h-[40%] overflow-auto py-4">
            <CodeEditor
              value={text}
              onChange={(v) => { setText(v); setDirty(true); }}
              language="liquid"
              className="h-full"
            />
          </div>
          <div className="h-[45%] min-h-[240px] border-t bg-background overflow-auto py-4">
            <h3 className="text-base font-semibold mb-3">Preview</h3>
            <div className={cn("prose dark:prose-invert max-w-none", wrapPreview ? 'whitespace-pre-wrap break-words' : '')} dangerouslySetInnerHTML={{ __html: text }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
