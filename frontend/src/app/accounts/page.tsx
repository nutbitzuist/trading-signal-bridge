'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Key, Trash2, Settings, Copy, Check } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { accountsApi } from '@/lib/api';
import { formatDate, copyToClipboard } from '@/lib/utils';

export default function AccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, fetchUser } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    broker: '',
    account_number: '',
    platform: 'mt4' as 'mt4' | 'mt5',
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newAccount) => accountsApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setNewApiKey(response.data.api_key);
      setShowCreateForm(false);
      setNewAccount({ name: '', broker: '', account_number: '', platform: 'mt4' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: (id: string) => accountsApi.regenerateKey(id),
    onSuccess: (response) => {
      setNewApiKey(response.data.api_key);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      accountsApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      if (!isAuthenticated) {
        router.push('/auth/login');
      }
    };
    checkAuth();
  }, []);

  const handleCopyKey = (key: string) => {
    copyToClipboard(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">MT Accounts</h1>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>

          {/* New API Key Alert */}
          {newApiKey && (
            <Card className="mb-6 border-green-500 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800">
                      API Key Generated Successfully
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Copy this key now. It won&apos;t be shown again.
                    </p>
                    <code className="block mt-2 p-2 bg-white rounded border text-sm font-mono">
                      {newApiKey}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyKey(newApiKey)}
                    >
                      {copiedKey === newApiKey ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNewApiKey(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Account Form */}
          {showCreateForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create New Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate(newAccount);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={newAccount.name}
                        onChange={(e) =>
                          setNewAccount({ ...newAccount, name: e.target.value })
                        }
                        placeholder="My Trading Account"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Platform *</label>
                      <select
                        value={newAccount.platform}
                        onChange={(e) =>
                          setNewAccount({
                            ...newAccount,
                            platform: e.target.value as 'mt4' | 'mt5',
                          })
                        }
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="mt4">MetaTrader 4</option>
                        <option value="mt5">MetaTrader 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Broker</label>
                      <Input
                        value={newAccount.broker}
                        onChange={(e) =>
                          setNewAccount({ ...newAccount, broker: e.target.value })
                        }
                        placeholder="Broker Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Account Number</label>
                      <Input
                        value={newAccount.account_number}
                        onChange={(e) =>
                          setNewAccount({
                            ...newAccount,
                            account_number: e.target.value,
                          })
                        }
                        placeholder="123456789"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Account'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Accounts List */}
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Loading accounts...
                </CardContent>
              </Card>
            ) : accountsData?.accounts?.length > 0 ? (
              accountsData.accounts.map((account: any) => (
                <Card key={account.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{account.name}</h3>
                            <Badge
                              variant={account.is_active ? 'success' : 'secondary'}
                            >
                              {account.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">
                              {account.platform.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {account.broker && <span>{account.broker}</span>}
                            {account.account_number && (
                              <span> • #{account.account_number}</span>
                            )}
                            {account.last_connected_at && (
                              <span>
                                {' '}
                                • Last connected: {formatDate(account.last_connected_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: account.id,
                              is_active: !account.is_active,
                            })
                          }
                        >
                          {account.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateKeyMutation.mutate(account.id)}
                          disabled={regenerateKeyMutation.isPending}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          New Key
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/accounts/${account.id}`)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (
                              confirm('Are you sure you want to delete this account?')
                            ) {
                              deleteMutation.mutate(account.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-4">No accounts yet</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first account
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
