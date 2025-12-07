'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi } from '@/lib/api';
import { formatRelativeTime, getStatusColor, getActionColor } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, fetchUser } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((res) => res.data),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      setAuthChecked(true);
    };
    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    if (authChecked && !authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authChecked, authLoading, isAuthenticated, router]);

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Accounts
                </CardTitle>
                <Wallet className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.accounts?.active || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  of {stats?.accounts?.total || 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Signals Today
                </CardTitle>
                <Activity className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.signals?.today || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.signals?.week || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Success Rate
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.signals?.success_rate || 0}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Monthly Signals
                </CardTitle>
                <Clock className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.signals?.month || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.signals?.status_breakdown?.executed || 0} executed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Signal Status (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: 'executed', label: 'Executed', icon: CheckCircle, color: 'text-green-600' },
                    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600' },
                    { key: 'failed', label: 'Failed', icon: AlertCircle, color: 'text-red-600' },
                    { key: 'expired', label: 'Expired', icon: Clock, color: 'text-gray-600' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <span className="text-sm text-gray-600">{item.label}</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.signals?.status_breakdown?.[item.key] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Symbols */}
            <Card>
              <CardHeader>
                <CardTitle>Top Symbols (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.top_symbols?.length > 0 ? (
                    stats.top_symbols.map((item: any, index: number) => (
                      <div key={item.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{item.symbol}</span>
                        </div>
                        <Badge variant="secondary">{item.count} signals</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No signals yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Signals */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Signals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Symbol</th>
                      <th className="pb-3 font-medium">Action</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recent_signals?.length > 0 ? (
                      stats.recent_signals.map((signal: any) => (
                        <tr key={signal.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{signal.symbol}</td>
                          <td className={`py-3 font-medium ${getActionColor(signal.action)}`}>
                            {signal.action.toUpperCase()}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(signal.status)}`}>
                              {signal.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500 text-sm">
                            {formatRelativeTime(signal.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          No signals yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
