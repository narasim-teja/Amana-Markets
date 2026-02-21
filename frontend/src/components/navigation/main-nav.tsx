'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/blockchain/use-admin';
import { useAdiBalance } from '@/hooks/blockchain/use-adi-balance';
import { useSmartAccount } from '@/hooks/blockchain/use-smart-account';
import {
  TrendingUp,
  BarChart3,
  Wallet,
  Shield,
  Menu,
  Copy,
  ExternalLink,
  LogOut,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

export function MainNav() {
  const pathname = usePathname();
  const { authenticated, login, logout, user } = usePrivy();
  const { isAdmin } = useIsAdmin();
  const { balance, isLoading: balanceLoading } = useAdiBalance();
  const { displayAddress } = useSmartAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletAddress = displayAddress ?? '';
  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = () => {
    if (!walletAddress) return;
    const explorerUrl =
      process.env.NEXT_PUBLIC_EXPLORER_URL ||
      'https://explorer.ab.testnet.adifoundation.ai';
    window.open(`${explorerUrl}/address/${walletAddress}`, '_blank');
  };

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="hidden md:flex items-center gap-2.5 pr-3 pl-3 h-10 border-dark-600 hover:border-gold/40 hover:bg-dark-800 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-sm text-foreground">
                        {truncatedAddress}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-dark-600" />
                    <span className="text-sm font-medium text-gold">
                      {balanceLoading ? '...' : balance} ADI
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px]">
                  <DropdownMenuLabel>Connected Account</DropdownMenuLabel>
                  <div className="px-3 py-2">
                    <div className="font-mono text-xs text-muted-foreground break-all leading-relaxed">
                      {walletAddress}
                    </div>
                  </div>
                  <div className="px-3 pb-2">
                    <div className="flex items-center justify-between bg-dark-900/60 rounded-lg px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        Balance
                      </span>
                      <span className="text-sm font-semibold text-gold">
                        {balanceLoading ? '...' : balance} ADI
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={copyAddress}>
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openExplorer}>
                    <ExternalLink className="h-4 w-4" />
                    View on Explorer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-red-400 focus:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={login} className="btn-gold hidden md:flex">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Account
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

              {/* Mobile Wallet Section */}
              <div className="mt-4 px-4">
                {authenticated ? (
                  <div className="space-y-3">
                    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-muted-foreground">
                          Connected
                        </span>
                      </div>
                      <div className="font-mono text-sm text-foreground mb-1">
                        {truncatedAddress}
                      </div>
                      <div className="text-sm font-semibold text-gold">
                        {balanceLoading ? '...' : balance} ADI
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        onClick={copyAddress}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1.5" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-sm"
                        onClick={openExplorer}
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Explorer
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-red-400 hover:text-red-300 hover:border-red-400/30"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4 mr-1.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button onClick={login} className="btn-gold w-full">
                    Connect Account
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
