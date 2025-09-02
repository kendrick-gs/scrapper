import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingOverlay({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  if (!loading) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
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

export function LoadingTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-muted animate-pulse rounded"></div>
        </td>
      ))}
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
