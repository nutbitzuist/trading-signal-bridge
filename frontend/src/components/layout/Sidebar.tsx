'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Signal,
  Wallet,
  Settings,
  LogOut,
  Users,
  Download,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Signals', href: '/signals', icon: Signal },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'EA Download', href: '/download', icon: Download },
  { name: 'Use Cases', href: '/use-cases', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <div className="flex flex-col h-full w-64 bg-black border-r-3 border-black">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b-3 border-gray-800">
        <div className="w-8 h-8 bg-emerald-500 border-2 border-white flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <span className="ml-2 text-xl font-bold text-white">SignalBridge</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-bold transition-all',
                isActive
                  ? 'bg-emerald-500 text-white border-2 border-white shadow-[2px_2px_0_0_#fff]'
                  : 'text-gray-300 hover:bg-gray-900 hover:text-emerald-400 border-2 border-transparent'
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin Section */}
        {user?.is_admin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-bold transition-all',
                    isActive
                      ? 'bg-emerald-500 text-white border-2 border-white shadow-[2px_2px_0_0_#fff]'
                      : 'text-gray-300 hover:bg-gray-900 hover:text-emerald-400 border-2 border-transparent'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-4 border-t-3 border-gray-800">
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-900 border-2 border-transparent hover:border-gray-700 transition-all"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
