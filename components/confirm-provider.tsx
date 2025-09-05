"use client";
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  /** Optional detail / meta shown in faint text */
  meta?: React.ReactNode;
  /** Optional async handler; dialog stays open & shows loading until it resolves */
  onConfirm?: () => Promise<any> | any;
  /** Custom button text while processing */
  processingText?: string;
}

interface InternalState {
  open: boolean;
  options: ConfirmOptions;
  processing: boolean;
  error?: string | null;
  resolve?: (v: boolean) => void;
}

const ConfirmContext = createContext<null | ((opts: ConfirmOptions) => Promise<boolean>)>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState>({ open: false, options: { title: 'Are you sure?' }, processing: false });
  const pendingRef = useRef(false);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options: opts, processing: false, error: null, resolve });
      pendingRef.current = false;
    });
  }, []);

  const close = () => setState(s => ({ ...s, open: false }));

  const handle = async (val: boolean) => {
    if (pendingRef.current) return; // prevent double resolve
    if (!val) {
      pendingRef.current = true;
      const r = state.resolve; r?.(false); close();
      setState(s => ({ ...s, processing: false, resolve: undefined }));
      return;
    }
    const { onConfirm } = state.options;
    if (!onConfirm) {
      pendingRef.current = true;
      const r = state.resolve; r?.(true); close();
      setState(s => ({ ...s, processing: false, resolve: undefined }));
      return;
    }
    // Async path
    pendingRef.current = true; // block further presses
    setState(s => ({ ...s, processing: true, error: null }));
    try {
      await Promise.resolve(onConfirm());
      const r = state.resolve; r?.(true); close();
      setState(s => ({ ...s, processing: false, resolve: undefined }));
    } catch (e:any) {
      // allow retry; keep dialog open
      pendingRef.current = false; // re-enable button for retry
      setState(s => ({ ...s, processing: false, error: e?.message || 'Action failed' }));
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => { if (!o) handle(false); }}>
        <DialogContent size="confirm">
          <DialogHeader>
            <DialogTitle className="text-base">{state.options.title || 'Confirm'}</DialogTitle>
            {state.options.description && (
              <DialogDescription className="pt-1 text-xs leading-relaxed">
                {state.options.description}
              </DialogDescription>
            )}
            {state.options.meta && <div className="mt-2 text-[11px] text-muted-foreground/80 leading-snug">{state.options.meta}</div>}
            {state.error && <div className="mt-3 text-[11px] text-red-600 font-medium">{state.error}</div>}
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => handle(false)} disabled={state.processing}>{state.options.cancelText || 'Cancel'}</Button>
            <Button size="sm" variant={state.options.variant === 'destructive' ? 'destructive' : 'default'} onClick={() => handle(true)} disabled={state.processing} className={state.options.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {state.processing ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {state.options.processingText || 'Processing…'}
                </span>
              ) : (state.options.confirmText || 'Confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
