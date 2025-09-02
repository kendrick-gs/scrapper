'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StreamImportDialog } from '@/components/StreamImportDialog';
import {
  Plus,
  Search,
  Store,
  Clock,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Globe
} from 'lucide-react';

type StoreMeta = { shopUrl: string; lastUpdated?: string; productCount?: number; collectionCount?: number };

export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamForce, setStreamForce] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Fetch stores with React Query
  const { data: storesData, isLoading, error, refetch } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const res = await fetch('/api/stores');
      if (!res.ok) throw new Error('Failed to fetch stores');
      return res.json();
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const stores = storesData?.stores || [];

  // Filtered stores based on search
  const filteredStores = useMemo(() =>
    stores.filter((store: StoreMeta) =>
      store.shopUrl.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [stores, searchTerm]
  );

  // Add store mutation
  const addStoreMutation = useMutation({
    mutationFn: async (shopUrl: string) => {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add store');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setNewStoreUrl('');
      setIsCreateDialogOpen(false);
      console.log("Store added successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to add store:', error.message);
    },
  });

  // Delete store mutation
  const deleteStoreMutation = useMutation({
    mutationFn: async (shopUrl: string) => {
      const res = await fetch('/api/stores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete store');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      console.log("Store deleted successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to delete store:', error.message);
    },
  });

  // Refresh store mutation
  const refreshStoreMutation = useMutation({
    mutationFn: async (shopUrl: string) => {
      const res = await fetch('/api/stores/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopUrl }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to refresh store');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      console.log("Store refreshed successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to refresh store:', error.message);
    },
  });

  // Refresh all stores mutation
  const refreshAllStoresMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const store of stores) {
        try {
          const res = await fetch('/api/stores/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shopUrl: store.shopUrl }),
          });
          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            results.push({ shopUrl: store.shopUrl, error: error.error || 'Failed to refresh' });
          } else {
            results.push({ shopUrl: store.shopUrl, success: true });
          }
        } catch (error) {
          results.push({ shopUrl: store.shopUrl, error: 'Network error' });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      const failedCount = results.filter(r => r.error).length;
      if (failedCount > 0) {
        console.warn(`${failedCount} store(s) failed to refresh`);
      } else {
        console.log("All stores refreshed successfully!");
      }
    },
    onError: (error: Error) => {
      console.error('Failed to refresh stores:', error.message);
    },
  });

  const handleAddStore = () => {
    if (!newStoreUrl.trim()) {
      console.warn("Please enter a store URL");
      return;
    }
    addStoreMutation.mutate(newStoreUrl.trim());
  };

  const handleDeleteStore = (shopUrl: string) => {
    if (!confirm('Remove this store and its cached data? This action cannot be undone.')) return;
    deleteStoreMutation.mutate(shopUrl);
  };

  const handleRefreshStore = (shopUrl: string) => {
    setStreamForce(true);
    setStreamUrl(shopUrl);
  };

  const handleRefreshAllStores = () => {
    if (stores.length === 0) return;
    refreshAllStoresMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  const getStoreDomain = (shopUrl: string) => {
    try {
      return new URL(shopUrl).hostname;
    } catch {
      return shopUrl;
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Stores</h1>
        <p className="text-muted-foreground">Manage your imported Shopify stores and their data</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add New Store</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center gap-2">
            <Input
              type="url"
              placeholder="https://your-store.myshopify.com"
              value={newStoreUrl}
              onChange={(e) => setNewStoreUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddStore();
                }
              }}
            />
            <Button
              onClick={handleAddStore}
              disabled={addStoreMutation.isPending || !newStoreUrl.trim()}
              className="bg-brand-green hover:bg-brand-green-light text-white"
            >
              {addStoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Store
            </Button>
          </div>
          {addStoreMutation.isError && (
            <div className="text-red-500 text-sm mt-2">
              {addStoreMutation.error?.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Stores</span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span>{filteredStores.length} stores</span>
              </div>
              {searchTerm && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Filtered from {stores.length} total
                </span>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            <Button
              size="sm"
              onClick={handleRefreshAllStores}
              disabled={refreshAllStoresMutation.isPending || stores.length === 0}
            >
              {refreshAllStoresMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading stores...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Failed to Load Stores
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {error.message}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Store className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? 'No stores found' : 'No stores yet'}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {searchTerm
                  ? `No stores match "${searchTerm}". Try a different search term.`
                  : 'Add your first store to start scraping Shopify data.'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-brand-green hover:bg-brand-green-light text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Store
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store: StoreMeta, idx: number) => (
                    <TableRow key={`${store.shopUrl}-${idx}`}>
                      <TableCell className="max-w-[320px]">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate" title={store.shopUrl}>
                              {getStoreDomain(store.shopUrl)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate" title={store.shopUrl}>
                              {store.shopUrl}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {store.lastUpdated ? getRelativeTime(store.lastUpdated) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {store.productCount?.toLocaleString() ?? '-'} products
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {store.collectionCount?.toLocaleString() ?? '-'} collections
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => handleRefreshStore(store.shopUrl)}
                            disabled={refreshStoreMutation.isPending}
                            title="Refresh store"
                          >
                            <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                            onClick={() => handleDeleteStore(store.shopUrl)}
                            disabled={deleteStoreMutation.isPending}
                            title="Delete store"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 hover:bg-muted"
                            title="Open console"
                          >
                            <a href="/app/console">
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Import Dialog */}
      <StreamImportDialog
        shopUrl={streamUrl || ''}
        open={!!streamUrl}
        title="Refreshing Store..."
        force={streamForce}
        onFinished={() => {
          setStreamUrl(null);
          setStreamForce(false);
          queryClient.invalidateQueries({ queryKey: ['stores'] });
        }}
        onOpenChange={(o) => {
          if (!o) {
            setStreamUrl(null);
            setStreamForce(false);
          }
        }}
      />

      {/* Hidden dialog for future use */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Store
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="store-url" className="text-sm font-medium text-foreground">
                Store URL
              </label>
              <Input
                id="store-url"
                type="url"
                placeholder="https://your-store.myshopify.com"
                value={newStoreUrl}
                onChange={(e) => setNewStoreUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddStore();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddStore}
                disabled={addStoreMutation.isPending || !newStoreUrl.trim()}
                className="bg-brand-green hover:bg-brand-green-light text-white"
              >
                {addStoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Store
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
