import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingOverlay({
  children,
  loading,
  title,
  description,
  progress
}: {
  children: React.ReactNode;
  loading: boolean;
  title?: string;
  description?: string;
  progress?: { current: number; total: number };
}) {
  if (!loading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">{title || 'Loading...'}</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground text-center mb-4">{description}</p>
        )}
        {progress && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{progress.current}</span>
              <span>{progress.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`animate-spin text-muted-foreground ${sizeClasses[size]}`} />
    </div>
  );
}

export function LoadingTableRow({ columns = 4, colSpan, text }: { columns?: number; colSpan?: number; text?: string }) {
  const actualColumns = colSpan || columns;

  return (
    <tr>
      <td colSpan={actualColumns} className="py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{text || 'Loading...'}</span>
        </div>
      </td>
    </tr>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      {action}
    </div>
  );
}
