'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsAdmin } from '@/hooks/blockchain/use-admin';
import { TrendingUp, BarChart3, Wallet, Shield, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function MainNav() {
  const pathname = usePathname();
  const { authenticated, login, logout, user } = usePrivy();
  const { isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      href: '/trade',
      label: 'Trade',
      icon: TrendingUp,
    },
    {
      href: '/portfolio',
      label: 'Portfolio',
      icon: BarChart3,
    },
    {
      href: '/vault',
      label: 'Vault',
      icon: Wallet,
    },
  ];

  return (
    <nav className="border-b border-dark-700 bg-dark-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-dark-950" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-gold">
                ADI Commodities
              </h1>
              <p className="text-xs text-muted-foreground">Premium Trading</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-gold/10 text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-dark-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-dark-800'
                )}
              >
                <Shield className="h-4 w-4" />
                <span className="font-medium">Admin</span>
                <Badge variant="outline" className="text-xs">
                  Owner
                </Badge>
              </Link>
            )}
          </div>

          {/* Wallet Button */}
          <div className="flex items-center gap-3">
            {authenticated ? (
              <Button
                onClick={logout}
                variant="outline"
                className="hidden md:flex items-center gap-2"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-mono text-sm">
                  {user?.wallet?.address?.slice(0, 6)}...
                  {user?.wallet?.address?.slice(-4)}
                </span>
              </Button>
            ) : (
              <Button onClick={login} className="btn-gold hidden md:flex">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-700">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-gold/10 text-gold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-dark-800'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    pathname.startsWith('/admin')
                      ? 'bg-gold/10 text-gold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-dark-800'
                  )}
                >
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Admin</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    Owner
                  </Badge>
                </Link>
              )}

              <div className="mt-4 px-4">
                {authenticated ? (
                  <Button onClick={logout} variant="outline" className="w-full">
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={login} className="btn-gold w-full">
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
