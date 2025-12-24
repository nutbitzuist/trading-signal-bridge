'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, X, RefreshCw, Filter } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { signalsApi, accountsApi } from '@/lib/api';
import { formatDate, getStatusColor, getActionColor } from '@/lib/utils';

export default function SignalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, fetchUser } = useAuth();
  const [filters, setFilters] = useState({
    account_id: '',
    status: '',
    symbol: '',
    page: 1,
    per_page: 20,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: signalsData, isLoading, refetch } = useQuery({
    queryKey: ['signals', filters],
    queryFn: () =>
      signalsApi
        .list({
          ...filters,
          account_id: filters.account_id || undefined,
          status: filters.status || undefined,
          symbol: filters.symbol || undefined,
        })
        .then((res) => res.data),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((res) => res.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => signalsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
    },
  });

  const handleExport = async () => {
    try {
      const response = await signalsApi.export({
        account_id: filters.account_id || undefined,
        status: filters.status || undefined,
        symbol: filters.symbol || undefined,
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signals_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      if (!isAuthenticated) {
        router.push('/auth/login');
      }
    };
    checkAuth();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black text-black">Signals</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-bold mb-2 block">Account</label>
                    <select
                      value={filters.account_id}
                      onChange={(e) =>
                        setFilters({ ...filters, account_id: e.target.value, page: 1 })
                      }
                      className="w-full h-10 px-3 border-2 border-black bg-white font-medium"
                    >
                      <option value="">All Accounts</option>
                      {accountsData?.accounts?.map((account: any) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold mb-2 block">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value, page: 1 })
                      }
                      className="w-full h-10 px-3 border-2 border-black bg-white font-medium"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="executed">Executed</option>
                      <option value="failed">Failed</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold mb-2 block">Symbol</label>
                    <Input
                      value={filters.symbol}
                      onChange={(e) =>
                        setFilters({ ...filters, symbol: e.target.value, page: 1 })
                      }
                      placeholder="e.g., XAUUSD"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setFilters({
                          account_id: '',
                          status: '',
                          symbol: '',
                          page: 1,
                          per_page: 20,
                        })
                      }
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signals Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-3 border-black">
                    <tr className="text-left text-sm">
                      <th className="px-6 py-4 font-bold">Symbol</th>
                      <th className="px-6 py-4 font-bold">Action</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Quantity</th>
                      <th className="px-6 py-4 font-bold">TP / SL</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Created</th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500 font-medium">
                          Loading signals...
                        </td>
                      </tr>
                    ) : signalsData?.signals?.length > 0 ? (
                      signalsData.signals.map((signal: any) => (
                        <tr key={signal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold">{signal.symbol}</td>
                          <td
                            className={`px-6 py-4 font-black ${getActionColor(
                              signal.action
                            )}`}
                          >
                            {signal.action.toUpperCase()}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-600">{signal.order_type}</td>
                          <td className="px-6 py-4 font-medium text-gray-600">
                            {signal.quantity || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">
                            <div className="font-medium">TP: {signal.take_profit || '-'}</div>
                            <div className="font-medium">SL: {signal.stop_loss || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={signal.status === 'executed' ? 'success' : signal.status === 'failed' ? 'destructive' : 'secondary'}>
                              {signal.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                            {formatDate(signal.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            {signal.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (
                                    confirm('Cancel this signal?')
                                  ) {
                                    cancelMutation.mutate(signal.id);
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500 font-medium">
                          No signals found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {signalsData?.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t-3 border-black">
                  <div className="text-sm font-medium text-gray-500">
                    Page {signalsData.page} of {signalsData.pages} ({signalsData.total}{' '}
                    total)
                  </div>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={filters.page >= signalsData.pages}
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
