'use client';

/**
 * Admin Layout with Route Guard
 * Protects admin routes - only allows contract owner access
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useIsAdmin } from '@/hooks/blockchain/use-admin';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  Landmark,
  Activity,
  LogOut,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { ready, authenticated, logout } = usePrivy();
  const { isAdmin, isLoading, walletAddress, owner } = useIsAdmin();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/trade');
    }

    if (ready && authenticated && !isLoading && !isAdmin) {
      router.push('/trade');
    }
  }, [ready, authenticated, isAdmin, isLoading, router]);

  // Show loading state
  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="text-center premium-card max-w-md">
          <h1 className="text-2xl font-display text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You do not have administrator privileges to access this area.
          </p>
          <div className="text-sm text-muted-foreground mb-6">
            <p>Your wallet: {walletAddress}</p>
            <p>Owner: {owner}</p>
          </div>
          <Link
            href="/trade"
            className="inline-block px-6 py-2 btn-gold rounded-lg"
          >
            Go to Trading
          </Link>
        </div>
      </div>
    );
  }

  // Admin layout with sidebar navigation
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Top Navigation Bar */}
      <nav className="border-b border-dark-700 bg-dark-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-display text-gold">
                ADI Commodities · Admin
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Admin</p>
                <p className="font-mono text-xs">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 min-h-[calc(100vh-73px)] border-r border-dark-700 bg-dark-900/30 p-4">
          <nav className="space-y-2">
            <NavLink href="/admin" icon={LayoutDashboard}>
              Overview
            </NavLink>
            <NavLink href="/admin/users" icon={Users}>
              User Management
            </NavLink>
            <NavLink href="/admin/assets" icon={Package}>
              Asset Controls
            </NavLink>
            <NavLink href="/admin/analytics" icon={TrendingUp}>
              Analytics
            </NavLink>
            <NavLink href="/admin/treasury" icon={Landmark}>
              Treasury
            </NavLink>
            <NavLink href="/admin/oracle" icon={Activity}>
              Price Feeds
            </NavLink>

            <div className="pt-4 mt-4 border-t border-dark-700">
              <Link
                href="/trade"
                className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Trading
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function NavLink({ href, icon: Icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm hover:bg-dark-800 transition-colors group"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
      <span className="group-hover:text-gold transition-colors">{children}</span>
    </Link>
  );
}
