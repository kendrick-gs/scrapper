// components/steps/step2.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
  ColumnSizingState,
} from '@tanstack/react-table';
import { useScrapeStore } from '@/store/useScrapeStore';
import { columns, ProductRowData, isVariant } from './columns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';

function LoadingView({ logs }: { logs: string[] }) {
  // ... (this component remains the same)
}

function ProductTableView({ allProducts, collections, shopUrl, collectionCache, addCollectionToCache }: { allProducts: ShopifyProduct[]; collections: ShopifyCollection[]; shopUrl: string; collectionCache: Record<string, ShopifyProduct[]>; addCollectionToCache: (handle: string, products: ShopifyProduct[]) => void; }) {
  // ... (this component remains the same)
}

export default function Step2Review() {
  const { 
    shopUrl, addLog, setResults, isLoading, logs,
    products, collections, collectionCache, addCollectionToCache, reset
  } = useScrapeStore();

  useEffect(() => {
    if (!isLoading) return;

    const streamScrape = async () => {
      try {
        const response = await fetch('/api/scrape-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopUrl }),
        });

        if (!response.body) {
          throw new Error("Response body is null");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep the last partial line in the buffer

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonString = line.substring(5);
              const data = JSON.parse(jsonString);

              if (data.finished) {
                setResults(data.data);
                return; // Exit the loop
              } else if (data.message) {
                addLog(data.message);
              } else if (data.error) {
                addLog(`ERROR: ${data.error}`);
                // Optionally reset to step 1 on error
                // reset();
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to stream scrape:", error);
        addLog(`A critical error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    streamScrape();

  }, [isLoading, shopUrl, addLog, setResults, reset]);

  if (isLoading) {
    return <LoadingView logs={logs} />;
  }

  if (!isLoading && products.length > 0) {
    return (
      <ProductTableView 
          allProducts={products}
          collections={collections}
          shopUrl={shopUrl}
          collectionCache={collectionCache}
          addCollectionToCache={addCollectionToCache}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Scraping Complete</CardTitle>
        </CardHeader>
        <CardContent>
            <p>No products were found for this store.</p>
            <Button onClick={reset} className="mt-4">Start Over</Button>
        </CardContent>
    </Card>
  );
}