'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0,
  });

  useEffect(() => {
    // Simple performance monitoring
    const updateMetrics = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const memory = (performance as any).memory;
        if (memory) {
          setMetrics(prev => ({
            ...prev,
            memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          }));
        }
      }
    };

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Performance Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Memory Usage:</span>
            <span>{metrics.memoryUsage} MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>CPU Usage:</span>
            <span>{metrics.cpuUsage}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Network Requests:</span>
            <span>{metrics.networkRequests}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
