'use client';

/**
 * Admin Sponsorship Panel
 * Monitor and manage ERC-4337 gas sponsorship (paymaster status, stats, config)
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { REFETCH_INTERVAL_MEDIUM } from '@/lib/constants';
import {
  Zap,
  Shield,
  Clock,
  Users,
  Settings,
  Fuel,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function SponsorshipPage() {
  // Fetch paymaster config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['sponsorship-config'],
    queryFn: () => apiClient.getSponsorshipConfig(),
    refetchInterval: REFETCH_INTERVAL_MEDIUM,
  });

  const enabled = config?.enabled ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display text-gold mb-1">
          Gas Sponsorship
        </h2>
        <p className="text-sm text-muted-foreground">
          ERC-4337 paymaster management for gasless transactions
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-xl p-4 border ${
          enabled
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-dark-800/50 border-dark-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold text-foreground">
                {enabled ? 'Paymaster Active' : 'Paymaster Disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Gas sponsorship is available for whitelisted users'
                  : 'Set PAYMASTER_ENABLED=true in middleware .env to activate'}
              </p>
            </div>
          </div>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Supported Modes"
          value={
            configLoading
              ? '...'
              : (config?.supportedModes || []).join(', ') || 'None'
          }
        />
        <StatCard
          icon={Clock}
          label="Validity Window"
          value={
            configLoading
              ? '...'
              : `${config?.validitySeconds ?? 0}s`
          }
        />
        <StatCard
          icon={Users}
          label="Hourly Limit"
          value={
            configLoading
              ? '...'
              : `${config?.hourlyLimit ?? 0} ops/account`
          }
        />
        <StatCard
          icon={Fuel}
          label="Chain ID"
          value={
            configLoading
              ? '...'
              : String(config?.chainId ?? '?')
          }
        />
      </div>

      {/* Configuration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paymaster Addresses */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-gold" />
              <h3 className="font-semibold text-foreground">
                Paymaster Contracts
              </h3>
            </div>
            <div className="space-y-3">
              <AddressRow
                label="Native Paymaster"
                address={config?.nativePaymaster}
                loading={configLoading}
              />
              <AddressRow
                label="ERC20 Paymaster"
                address={config?.erc20Paymaster}
                loading={configLoading}
              />
              <AddressRow
                label="EntryPoint"
                address={config?.entryPoint}
                loading={configLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-gold" />
              <h3 className="font-semibold text-foreground">
                Infrastructure
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-dark-700">
                <span className="text-sm text-muted-foreground">
                  Bundler URL
                </span>
                <span className="text-sm font-mono text-foreground">
                  {configLoading ? '...' : config?.bundlerUrl ?? 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-dark-700">
                <span className="text-sm text-muted-foreground">
                  Sponsorship Validity
                </span>
                <span className="text-sm font-mono text-foreground">
                  {configLoading ? '...' : `${config?.validitySeconds ?? 0} seconds`}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  Rate Limit
                </span>
                <span className="text-sm font-mono text-foreground">
                  {configLoading ? '...' : `${config?.hourlyLimit ?? 0} per hour per account`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-foreground mb-4">
            How Gas Sponsorship Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step={1}
              title="User Initiates Trade"
              description="Whitelisted user selects 'Sponsored' gas mode on the trade page and submits a transaction."
            />
            <StepCard
              step={2}
              title="Backend Signs Authorization"
              description="Middleware checks eligibility, rate limits, and signs a sponsorship authorization for the paymaster."
            />
            <StepCard
              step={3}
              title="Gas Sponsored"
              description="The paymaster contract covers the gas cost. For ERC20 mode, DDSC is charged instead of native ADI."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card className="premium-card">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function AddressRow({
  label,
  address,
  loading,
}: {
  label: string;
  address: string | null | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-700 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {loading ? (
        <span className="text-sm text-muted-foreground">...</span>
      ) : address ? (
        <span className="text-xs font-mono text-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      ) : (
        <Badge variant="secondary" className="text-xs">
          Not deployed
        </Badge>
      )}
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gold/15 flex items-center justify-center text-xs font-bold text-gold">
          {step}
        </div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
