'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Copy, Check, RefreshCw, Key, User } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { copyToClipboard } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user, fetchUser } = useAuth();
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    password: '',
    confirm_password: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const regenerateSecretMutation = useMutation({
    mutationFn: () => authApi.regenerateWebhookSecret(),
    onSuccess: () => {
      fetchUser();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name?: string; password?: string }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      setProfileSuccess('Profile updated successfully');
      setProfileError('');
      setProfileForm({ ...profileForm, password: '', confirm_password: '' });
      fetchUser();
    },
    onError: (error: any) => {
      setProfileError(error.response?.data?.detail || 'Failed to update profile');
      setProfileSuccess('');
    },
  });

  const handleCopySecret = () => {
    if (user?.webhook_secret) {
      copyToClipboard(user.webhook_secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileForm.password && profileForm.password !== profileForm.confirm_password) {
      setProfileError("Passwords don't match");
      return;
    }

    const data: { full_name?: string; password?: string } = {};
    if (profileForm.full_name !== user?.full_name) {
      data.full_name = profileForm.full_name;
    }
    if (profileForm.password) {
      data.password = profileForm.password;
    }

    if (Object.keys(data).length > 0) {
      updateProfileMutation.mutate(data);
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

  useEffect(() => {
    if (user) {
      setProfileForm({
        ...profileForm,
        full_name: user.full_name || '',
      });
    }
  }, [user]);

  if (!isAuthenticated) {
    return null;
  }

  // Generate webhook URL
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://signals.myalgostack.com/api/v1'}/webhook/tradingview`;

  // Example TradingView alert message
  const exampleAlert = `{
    "secret": "${user?.webhook_secret || 'YOUR_SECRET'}",
    "symbol": "{{ticker}}",
    "action": "buy",
    "quantity": 0.1,
    "take_profit": {{close}} * 1.02,
    "stop_loss": {{close}} * 0.98,
    "comment": "Strategy_Name"
}`;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

          {/* Webhook Configuration */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure your TradingView alerts to send signals to this webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2 mt-1">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Use this URL in your TradingView alert webhook settings
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="text-sm font-medium">Webhook Secret</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={user?.webhook_secret || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={handleCopySecret}>
                    {copiedSecret ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure? This will invalidate all existing alerts using the current secret.'
                        )
                      ) {
                        regenerateSecretMutation.mutate();
                      }
                    }}
                    disabled={regenerateSecretMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Include this secret in your TradingView alert message to authenticate
                </p>
              </div>

              {/* Example Alert */}
              <div>
                <label className="text-sm font-medium">
                  Example TradingView Alert Message
                </label>
                <pre className="mt-1 p-4 bg-gray-900 text-gray-100 rounded-md overflow-x-auto text-sm">
                  {exampleAlert}
                </pre>
                <p className="text-sm text-gray-500 mt-1">
                  Copy this template and customize it for your trading strategy
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>Update your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                    {profileSuccess}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user?.email || ''} disabled className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, full_name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={profileForm.password}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    value={profileForm.confirm_password}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        confirm_password: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
