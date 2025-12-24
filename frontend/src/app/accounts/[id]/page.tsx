'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Key, Copy, Check } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { accountsApi } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, fetchUser } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    broker: '',
    account_number: '',
    is_active: true,
  });

  const accountId = params.id as string;

  const { data: account, isLoading } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => accountsApi.get(accountId).then((res) => res.data),
    enabled: !!accountId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => accountsApi.update(accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: () => accountsApi.regenerateKey(accountId),
    onSuccess: (response) => {
      setNewApiKey(response.data.api_key);
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
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

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        broker: account.broker || '',
        account_number: account.account_number || '',
        is_active: account.is_active,
      });
    }
  }, [account]);

  const handleCopyKey = (key: string) => {
    copyToClipboard(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/accounts')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>

          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Loading account...
              </CardContent>
            </Card>
          ) : account ? (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Account Settings</CardTitle>
                    <Badge variant={account.is_active ? 'success' : 'secondary'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Account Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Platform</label>
                      <Input
                        value={account.platform?.toUpperCase() || 'MT4'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Broker</label>
                      <Input
                        value={formData.broker}
                        onChange={(e) =>
                          setFormData({ ...formData, broker: e.target.value })
                        }
                        placeholder="Broker Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Account Number</label>
                      <Input
                        value={formData.account_number}
                        onChange={(e) =>
                          setFormData({ ...formData, account_number: e.target.value })
                        }
                        placeholder="123456789"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor="is_active" className="text-sm font-medium">
                        Account Active
                      </label>
                    </div>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    {updateMutation.isSuccess && (
                      <span className="text-green-600 text-sm ml-2">Saved!</span>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* API Key Section */}
              <Card>
                <CardHeader>
                  <CardTitle>API Key</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Use this API key in your Expert Advisor to authenticate with the server.
                    The full key is only shown when generated.
                  </p>

                  {newApiKey ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                      <p className="font-medium text-green-800 mb-2">
                        New API Key Generated
                      </p>
                      <p className="text-sm text-green-600 mb-2">
                        Copy this key now. It won&apos;t be shown again.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-white rounded border text-sm font-mono break-all">
                          {newApiKey}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyKey(newApiKey)}
                        >
                          {copiedKey ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-600">
                        API Key: <code className="font-mono">****...{account.api_key_hint || '****'}</code>
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure? This will invalidate the current API key.')) {
                        regenerateKeyMutation.mutate();
                      }
                    }}
                    disabled={regenerateKeyMutation.isPending}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {regenerateKeyMutation.isPending ? 'Generating...' : 'Regenerate API Key'}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Account not found
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
