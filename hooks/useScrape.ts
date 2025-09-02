'use client';

import { useState, useCallback } from 'react';

interface ScrapeState {
  isScraping: boolean;
  progress: number;
  currentUrl: string;
  totalUrls: number;
  scrapedData: any[];
  error: string | null;
  shopUrl: string;
}

export function useScrapeState() {
  const [state, setState] = useState<ScrapeState>({
    isScraping: false,
    progress: 0,
    currentUrl: '',
    totalUrls: 0,
    scrapedData: [],
    error: null,
    shopUrl: '',
  });

  const startScrape = useCallback(async (urls: string[]) => {
    setState(prev => ({
      ...prev,
      isScraping: true,
      progress: 0,
      totalUrls: urls.length,
      error: null,
    }));

    try {
      const response = await fetch('/api/scrape-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        throw new Error('Failed to start scraping');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setState(prev => ({
                ...prev,
                progress: data.progress || prev.progress,
                currentUrl: data.currentUrl || prev.currentUrl,
                scrapedData: data.data ? [...prev.scrapedData, data.data] : prev.scrapedData,
              }));
            } catch (e) {
              console.error('Failed to parse streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setState(prev => ({
        ...prev,
        isScraping: false,
      }));
    }
  }, []);

  const stopScrape = useCallback(() => {
    setState(prev => ({
      ...prev,
      isScraping: false,
    }));
  }, []);

  const resetScrape = useCallback(() => {
    setState({
      isScraping: false,
      progress: 0,
      currentUrl: '',
      totalUrls: 0,
      scrapedData: [],
      error: null,
      shopUrl: '',
    });
  }, []);

  const setShopUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      shopUrl: url,
    }));
  }, []);

  const startScraping = useCallback(async () => {
    if (!state.shopUrl) return;

    await startScrape([state.shopUrl]);
  }, [state.shopUrl, startScrape]);

  return {
    ...state,
    startScrape,
    stopScrape,
    resetScrape,
    setShopUrl,
    startScraping,
  };
}

export function useScrapeProducts(shopUrl?: string, isLoading?: boolean) {
  return {
    data: {
      products: [],
      collections: [],
      vendors: [],
      productTypes: []
    },
    isLoading: false
  };
}

export function useScrapeMutation() {
  return {
    mutate: () => {},
    mutateAsync: async (url: string) => {
      // Simulate scraping
      console.log('Scraping:', url);
    },
    isPending: false
  };
}
