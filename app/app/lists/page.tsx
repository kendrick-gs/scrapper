'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus,
  Search,
  List,
  Clock,
  ExternalLink,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type ListMeta = {
  id: string;
  name: string;
  createdAt: string;
  itemCount?: number;
  lastModified?: string;
  items?: any[];
};

export default function ListsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ListMeta | null>(null);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  // Fetch lists with React Query
  const { data: listsData, isLoading, error, refetch } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const res = await fetch('/api/lists');
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const lists = listsData?.lists || [];

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create list');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setNewListName('');
      setIsCreateDialogOpen(false);
      console.log("List created successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to create list:', error.message);
    },
  });

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const res = await fetch('/api/lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete list');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      console.log("List deleted successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to delete list:', error.message);
    },
  });

  // Update list mutation
  const updateListMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch('/api/lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update list');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setEditingList(null);
      setEditName('');
      console.log("List updated successfully!");
    },
    onError: (error: Error) => {
      console.error('Failed to update list:', error.message);
    },
  });

  // Filter lists based on search term
  const filteredLists = useMemo(() => {
    return lists.filter((list: ListMeta) =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lists, searchTerm]);

  const handleCreateList = () => {
    if (!newListName.trim()) {
      console.warn("Please enter a list name");
      return;
    }
    createListMutation.mutate(newListName.trim());
  };

  const handleDeleteList = (listId: string) => {
    if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      deleteListMutation.mutate(listId);
    }
  };

  const handleEditList = (list: ListMeta) => {
    setEditingList(list);
    setEditName(list.name);
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingList) return;
    updateListMutation.mutate({ id: editingList.id, name: editName.trim() });
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setEditName('');
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

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Lists</h1>
        <p className="text-muted-foreground">Manage and organize your scraped Shopify product lists</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Create New List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex w-full items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Enter list name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateList();
                }
              }}
            />
            <Button
              onClick={handleCreateList}
              disabled={createListMutation.isPending || !newListName.trim()}
              className="bg-brand-green hover:bg-brand-green-light text-white"
            >
              {createListMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Lists</span>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{filteredLists.length} lists</span>
              </div>
              {searchTerm && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  Filtered from {lists.length} total
                </span>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading lists...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Failed to Load Lists
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {error.message}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <List className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchTerm ? 'No lists found' : 'No lists yet'}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {searchTerm
                  ? `No lists match "${searchTerm}". Try a different search term.`
                  : 'Create your first list to start organizing your scraped products.'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-brand-green hover:bg-brand-green-light text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First List
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-medium text-foreground">Name</TableHead>
                    <TableHead className="font-medium text-foreground">Created</TableHead>
                    <TableHead className="font-medium text-foreground">Items</TableHead>
                    <TableHead className="font-medium text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLists.map((list: ListMeta) => (
                    <TableRow key={list.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                            <List className="h-4 w-4 text-brand-green" />
                          </div>
                          <span className="truncate max-w-[200px]" title={list.name}>
                            {list.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {getRelativeTime(list.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {list.items?.length || 0} items
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 hover:bg-muted"
                          >
                            <a href={`/app/lists/${list.id}`} title="Open list">
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted"
                            onClick={() => handleEditList(list)}
                            title="Edit list"
                          >
                            <Edit3 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                            onClick={() => handleDeleteList(list.id)}
                            disabled={deleteListMutation.isPending}
                            title="Delete list"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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

      {/* Hidden dialog for future use */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="list-name" className="text-sm font-medium text-foreground">
                List Name
              </label>
              <Input
                id="list-name"
                placeholder="Enter list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateList();
                  }
                }}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateList}
                disabled={createListMutation.isPending || !newListName.trim()}
                className="bg-brand-green hover:bg-brand-green-light"
              >
                {createListMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Create List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={!!editingList} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-list-name" className="text-sm font-medium text-foreground">
                List Name
              </label>
              <Input
                id="edit-list-name"
                placeholder="Enter list name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  }
                }}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateListMutation.isPending || !editName.trim() || editName === editingList?.name}
                className="bg-brand-green hover:bg-brand-green-light"
              >
                {updateListMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
