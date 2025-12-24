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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 bg-emerald-500 border-3 border-black flex items-center justify-center animate-pulse">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black text-black mb-8">Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-600">
                  Active Accounts
                </CardTitle>
                <div className="w-10 h-10 bg-emerald-100 border-2 border-black flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">
                  {stats?.accounts?.active || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  of {stats?.accounts?.total || 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-600">
                  Signals Today
                </CardTitle>
                <div className="w-10 h-10 bg-emerald-100 border-2 border-black flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">
                  {stats?.signals?.today || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {stats?.signals?.week || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-600">
                  Success Rate
                </CardTitle>
                <div className="w-10 h-10 bg-emerald-100 border-2 border-black flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">
                  {stats?.signals?.success_rate || 0}%
                </div>
                <p className="text-sm text-gray-500 mt-1 font-medium">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-gray-600">
                  Monthly Signals
                </CardTitle>
                <div className="w-10 h-10 bg-emerald-100 border-2 border-black flex items-center justify-center">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black">
                  {stats?.signals?.month || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1 font-medium">
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
                    { key: 'executed', label: 'Executed', icon: CheckCircle, bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
                    { key: 'pending', label: 'Pending', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
                    { key: 'failed', label: 'Failed', icon: AlertCircle, bgColor: 'bg-red-100', textColor: 'text-red-600' },
                    { key: 'expired', label: 'Expired', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 border-2 border-black bg-white">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${item.bgColor} border-2 border-black flex items-center justify-center`}>
                          <item.icon className={`h-4 w-4 ${item.textColor}`} />
                        </div>
                        <span className="font-bold text-gray-700">{item.label}</span>
                      </div>
                      <span className="font-black text-xl">
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
                <div className="space-y-3">
                  {stats?.top_symbols?.length > 0 ? (
                    stats.top_symbols.map((item: any, index: number) => (
                      <div key={item.symbol} className="flex items-center justify-between p-3 border-2 border-black bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-500 border-2 border-black flex items-center justify-center">
                            <span className="text-white font-black text-sm">
                              #{index + 1}
                            </span>
                          </div>
                          <span className="font-bold">{item.symbol}</span>
                        </div>
                        <Badge variant="secondary">{item.count} signals</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8 font-medium">
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
                <table className="w-full border-2 border-black">
                  <thead>
                    <tr className="text-left text-sm border-b-3 border-black bg-gray-100">
                      <th className="p-4 font-bold">Symbol</th>
                      <th className="p-4 font-bold">Action</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recent_signals?.length > 0 ? (
                      stats.recent_signals.map((signal: any) => (
                        <tr key={signal.id} className="border-b-2 border-black last:border-0">
                          <td className="p-4 font-bold">{signal.symbol}</td>
                          <td className={`p-4 font-black ${getActionColor(signal.action)}`}>
                            {signal.action.toUpperCase()}
                          </td>
                          <td className="p-4">
                            <Badge variant={signal.status === 'executed' ? 'success' : signal.status === 'failed' ? 'destructive' : 'secondary'}>
                              {signal.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-600 font-medium">
                            {formatRelativeTime(signal.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 font-medium">
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
