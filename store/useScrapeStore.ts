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
  
  // New state for caching collection products
  collectionCache: Record<string, ShopifyProduct[]>;
  
  setShopUrl: (url: string) => void;
  startScraping: () => void;
  addLog: (log: string) => void;
  setResults: (data: any) => void;
  reset: () => void;
  
  // New function to add fetched collections to the cache
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
  
  setShopUrl: (url) => set({ shopUrl: url }),
  startScraping: () => set({ step: 2, isLoading: true, logs: [] }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setResults: (data) => set({ 
    products: data.products,
    collections: data.collections,
    vendors: data.vendors,
    productTypes: data.productTypes,
    isLoading: false 
  }),
  reset: () => set({
    step: 1,
    shopUrl: '',
    isLoading: false,
    logs: [],
    products: [],
    collectionCache: {}, // Also reset the cache
  }),

  // Implement the function to update the cache
  addCollectionToCache: (handle, products) => set((state) => ({
    collectionCache: {
        ...state.collectionCache,
        [handle]: products,
    }
  })),
}));