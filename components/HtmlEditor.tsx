'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Code } from 'lucide-react';

interface HtmlEditorProps {
  title: string;
  initialHtml: string;
  onSave: (html: string) => void;
  trigger: React.ReactNode;
}

export function HtmlEditor({ title, initialHtml, onSave, trigger }: HtmlEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    setHtml(initialHtml);
  }, [initialHtml]);

  const handleSave = () => {
    onSave(html);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title} - HTML Editor</DialogTitle>
        </DialogHeader>

        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'edit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="h-4 w-4" />
            Edit HTML
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-4 w-4" />
            Live Preview
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'edit' ? (
            <textarea
              value={html}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHtml(e.target.value)}
              className="w-full h-[400px] p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your HTML/Liquid code here..."
            />
          ) : (
            <div className="border rounded-md p-4 h-[400px] overflow-y-auto">
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html || '<p class="text-muted-foreground">No content to preview</p>' }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
