"use client";
import React from 'react';
import { Progress } from '@/components/ui/progress';

export interface LogPanelProps {
  title?: string;
  logs: string[];
  progress?: number; // 0-100 optional override
  heightClass?: string;
}

export const LogPanel: React.FC<LogPanelProps> = ({ title, logs, progress, heightClass = 'h-64' }) => {
  const pct = typeof progress === 'number' ? progress : Math.min(100, logs.length * 2);
  return (
    <div className="w-full">
      {title && <div className="font-medium mb-2 text-sm text-muted-foreground">{title}</div>}
      <Progress value={pct} className="w-full mb-3" />
      <div className={`w-full ${heightClass} bg-gray-900 text-white font-mono text-xs p-3 overflow-y-auto rounded-md`}> 
        {logs.length === 0 && <p className="opacity-50">&gt; Waiting for events...</p>}
        {logs.map((log, index) => (<p key={index} className="whitespace-pre-wrap">{`> ${log}`}</p>))}
      </div>
    </div>
  );
};
