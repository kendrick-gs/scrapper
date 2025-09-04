import { create } from 'zustand';
import { ShopifyProduct, ShopifyCollection } from '@/lib/types';

interface ScrapeState {
  step: number;
  shopUrl: string;
  isLoading: boolean;
  logs: string[];
  products: ShopifyProduct[];
  collections: ShopifyCollection[];
  vendors: { name: string; count: number }[];
  productTypes: string[];
  lastError?: string;
  // streaming progress metrics
  progress: { products?: number; collections?: number; message?: string };
  collectionCache: Record<string, ShopifyProduct[]>;
  setShopUrl: (url: string) => void;
  startScraping: () => void;
  addLog: (log: string) => void;
  setResults: (data: any) => void;
  setProgress: (patch: Partial<ScrapeState['progress']>) => void;
  setError: (err: string) => void;
  reset: () => void;
  addCollectionToCache: (handle: string, products: ShopifyProduct[]) => void;
}

export const useScrapeStore = create<ScrapeState>((set) => ({
  step: 1,
  shopUrl: '',
  isLoading: false,
  logs: [],
  products: [],
  collections: [],
  vendors: [],
  productTypes: [],

  // Initialize the cache as an empty object
  collectionCache: {},
  progress: {},
  
  setShopUrl: (url) => set({ shopUrl: url }),
  startScraping: () => set({ step: 2, isLoading: true, logs: [], progress: {}, lastError: undefined }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setResults: (data) => set({ 
    products: data.products,
    collections: data.collections,
    vendors: data.vendors,
    productTypes: data.productTypes,
    isLoading: false,
    progress: { message: 'Finished' }
  }),
  setProgress: (patch) => set((state) => ({ progress: { ...state.progress, ...patch } })),
  setError: (err) => set({ lastError: err, isLoading: false }),
  reset: () => set({
    step: 1,
    shopUrl: '',
    isLoading: false,
    logs: [],
    products: [],
    collectionCache: {}, // Also reset the cache
    progress: {},
    lastError: undefined,
  }),

  // Implement the function to update the cache
  addCollectionToCache: (handle, products) => set((state) => ({
    collectionCache: {
        ...state.collectionCache,
        [handle]: products,
    }
  })),
}));