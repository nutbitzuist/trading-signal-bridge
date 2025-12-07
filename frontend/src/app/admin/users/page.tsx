'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Check,
  X,
  Shield,
  ShieldOff,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name?: string;
  tier: string;
  is_active: boolean;
  is_admin: boolean;
  is_approved: boolean;
  max_accounts: number;
  max_signals_per_day: number;
  accounts_count: number;
  signals_count: number;
  created_at: string;
  admin_notes?: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  pending_approval: number;
  users_by_tier: Record<string, number>;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

const TIERS = ['free', 'basic', 'pro', 'enterprise'];

const tierColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  basic: 'bg-blue-100 text-blue-800',
  pro: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-amber-100 text-amber-800',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, fetchUser, user: currentUser } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    tier: 'free',
    is_admin: false,
    is_active: true,
    is_approved: true,
    max_accounts: 2,
    max_signals_per_day: 50,
    admin_notes: '',
  });

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then((res) => res.data),
    enabled: isAuthenticated && currentUser?.is_admin,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, tierFilter],
    queryFn: () =>
      adminApi.listUsers({
        page,
        per_page: 10,
        search: search || undefined,
        tier: tierFilter || undefined,
      }).then((res) => res.data),
    enabled: isAuthenticated && currentUser?.is_admin,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof formData) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const approveUserMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      adminApi.approveUser(id, { is_approved: approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const upgradeTierMutation = useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: string }) =>
      adminApi.upgradeTier(id, { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      setAuthChecked(true);
    };
    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    if (authChecked && !authLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
      } else if (currentUser && !currentUser.is_admin) {
        router.push('/dashboard');
      }
    }
  }, [authChecked, authLoading, isAuthenticated, currentUser, router]);

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      tier: 'free',
      is_admin: false,
      is_active: true,
      is_approved: true,
      max_accounts: 2,
      max_signals_per_day: 50,
      admin_notes: '',
    });
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      tier: user.tier,
      is_admin: user.is_admin,
      is_active: user.is_active,
      is_approved: user.is_approved,
      max_accounts: user.max_accounts,
      max_signals_per_day: user.max_signals_per_day,
      admin_notes: user.admin_notes || '',
    });
    setShowEditModal(true);
    setActionMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id);
    }
    setActionMenu(null);
  };

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser?.is_admin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.active_users || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats?.pending_approval || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  New This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.new_users_this_month || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by email or name..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  <option value="">All Tiers</option>
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Tier</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Usage</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : usersData?.users?.length > 0 ? (
                      usersData.users.map((user: User) => (
                        <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {user.email}
                                {user.is_admin && (
                                  <Shield className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              {user.full_name && (
                                <div className="text-sm text-gray-500">{user.full_name}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={user.tier}
                              onChange={(e) =>
                                upgradeTierMutation.mutate({
                                  id: user.id,
                                  tier: e.target.value,
                                })
                              }
                              className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${tierColors[user.tier] || tierColors.free}`}
                            >
                              {TIERS.map((tier) => (
                                <option key={tier} value={tier}>
                                  {tier.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={user.is_active ? 'default' : 'secondary'}
                                className={user.is_active ? 'bg-green-100 text-green-800' : ''}
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {!user.is_approved && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div>{user.accounts_count} / {user.max_accounts} accounts</div>
                              <div className="text-gray-500">
                                {user.signals_count} signals
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActionMenu(actionMenu === user.id ? null : user.id)
                                }
                                className="p-2 hover:bg-gray-100 rounded-md"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {actionMenu === user.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleEdit(user)}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <Edit className="h-4 w-4" />
                                      Edit User
                                    </button>
                                    {!user.is_approved && (
                                      <button
                                        onClick={() => {
                                          approveUserMutation.mutate({
                                            id: user.id,
                                            approved: true,
                                          });
                                          setActionMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                                      >
                                        <Check className="h-4 w-4" />
                                        Approve User
                                      </button>
                                    )}
                                    {user.is_approved && (
                                      <button
                                        onClick={() => {
                                          approveUserMutation.mutate({
                                            id: user.id,
                                            approved: false,
                                          });
                                          setActionMenu(null);
                                        }}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100"
                                      >
                                        <X className="h-4 w-4" />
                                        Revoke Approval
                                      </button>
                                    )}
                                    {user.id !== currentUser?.id && (
                                      <>
                                        <button
                                          onClick={() => {
                                            toggleAdminMutation.mutate(user.id);
                                            setActionMenu(null);
                                          }}
                                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                                        >
                                          {user.is_admin ? (
                                            <>
                                              <ShieldOff className="h-4 w-4" />
                                              Remove Admin
                                            </>
                                          ) : (
                                            <>
                                              <Shield className="h-4 w-4" />
                                              Make Admin
                                            </>
                                          )}
                                        </button>
                                        <button
                                          onClick={() => handleDelete(user.id)}
                                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete User
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersData && usersData.total_pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Page {usersData.page} of {usersData.total_pages} ({usersData.total} users)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= usersData.total_pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
              <h2 className="text-xl font-bold mb-4">Create New User</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createUserMutation.mutate(formData);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password *</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Accounts</label>
                    <Input
                      type="number"
                      value={formData.max_accounts}
                      onChange={(e) =>
                        setFormData({ ...formData, max_accounts: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Signals/Day</label>
                    <Input
                      type="number"
                      value={formData.max_signals_per_day}
                      onChange={(e) =>
                        setFormData({ ...formData, max_signals_per_day: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    />
                    Admin
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_approved}
                      onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                    />
                    Approved
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Notes</label>
                  <textarea
                    value={formData.admin_notes}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto">
              <h2 className="text-xl font-bold mb-4">Edit User</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const updateData: Partial<typeof formData> = {
                    full_name: formData.full_name,
                    tier: formData.tier,
                    is_admin: formData.is_admin,
                    is_active: formData.is_active,
                    is_approved: formData.is_approved,
                    max_accounts: formData.max_accounts,
                    max_signals_per_day: formData.max_signals_per_day,
                    admin_notes: formData.admin_notes,
                  };
                  if (formData.email !== selectedUser.email) {
                    updateData.email = formData.email;
                  }
                  if (formData.password) {
                    updateData.password = formData.password;
                  }
                  updateUserMutation.mutate({ id: selectedUser.id, data: updateData });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password (leave blank to keep current)
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tier</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Accounts</label>
                    <Input
                      type="number"
                      value={formData.max_accounts}
                      onChange={(e) =>
                        setFormData({ ...formData, max_accounts: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Signals/Day</label>
                    <Input
                      type="number"
                      value={formData.max_signals_per_day}
                      onChange={(e) =>
                        setFormData({ ...formData, max_signals_per_day: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                      disabled={selectedUser.id === currentUser?.id}
                    />
                    Admin
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_approved}
                      onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                    />
                    Approved
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admin Notes</label>
                  <textarea
                    value={formData.admin_notes}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Click outside to close action menu */}
      {actionMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setActionMenu(null)} />
      )}
    </div>
  );
}
