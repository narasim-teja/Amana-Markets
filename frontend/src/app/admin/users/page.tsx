'use client';

/**
 * User Management Page
 * Admin can whitelist/blacklist addresses, view user stats
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useContractWrite } from '@/hooks/blockchain/use-contract-write';
import { CONTRACTS } from '@/lib/contracts';
import { shortenAddress } from '@/lib/format';
import { REFETCH_INTERVAL_SLOW } from '@/lib/constants';
import { UserPlus, UserX, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { isAddress } from 'viem';
import { Trade } from '@/types/api';

type UserStatus = 'all' | 'whitelisted' | 'blacklisted';

export default function UsersManagementPage() {
  const [batchAddresses, setBatchAddresses] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch trades to build user list
  const { data: tradesData, refetch: refetchTrades } = useQuery({
    queryKey: ['trades', 'all'],
    queryFn: () => apiClient.getTrades({ limit: 1000 }),
    refetchInterval: REFETCH_INTERVAL_SLOW,
  });

  const { writeContract: executeWhitelist, isLoading: isWhitelisting } = useContractWrite();
  const { writeContract: executeBlacklist, isLoading: isBlacklisting } = useContractWrite();

  // Extract unique traders from trades
  const users = tradesData?.trades
    ? Array.from(new Set(tradesData.trades.map((t: Trade) => t.trader)))
        .map((address) => {
          const userTrades = tradesData.trades.filter((t: Trade) => t.trader === address);
          return {
            address,
            tradeCount: userTrades.length,
            totalVolume: userTrades.reduce(
              (sum: number, t: Trade) => sum + parseFloat(t.stablecoin_amount),
              0
            ),
            // Status will be fetched on-chain or from API if available
            isWhitelisted: true, // Default assumption
            isBlacklisted: false,
          };
        })
    : [];

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'whitelisted' && user.isWhitelisted) ||
      (statusFilter === 'blacklisted' && user.isBlacklisted);

    return matchesSearch && matchesStatus;
  });

  const handleBatchWhitelist = async () => {
    const addresses = batchAddresses
      .split('\n')
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    // Validate all addresses
    const invalidAddresses = addresses.filter((addr) => !isAddress(addr));
    if (invalidAddresses.length > 0) {
      toast.error(`Invalid addresses: ${invalidAddresses.join(', ')}`);
      return;
    }

    if (addresses.length === 0) {
      toast.error('Please enter at least one address');
      return;
    }

    try {
      await executeWhitelist({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'whitelistUsers',
        args: [addresses],
      });

      setBatchAddresses('');
      refetchTrades();
    } catch (error) {
      console.error('Batch whitelist failed:', error);
    }
  };

  const handleWhitelistUser = async (address: string) => {
    try {
      await executeWhitelist({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'whitelistUsers',
        args: [[address]],
      });

      refetchTrades();
    } catch (error) {
      console.error('Whitelist failed:', error);
    }
  };

  const handleBlacklistUser = async (address: string) => {
    try {
      await executeBlacklist({
        address: CONTRACTS.UserRegistry.address,
        abi: CONTRACTS.UserRegistry.abi,
        functionName: 'blacklistUser',
        args: [address],
      });

      refetchTrades();
    } catch (error) {
      console.error('Blacklist failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display text-gold mb-2">User Management</h2>
        <p className="text-muted-foreground">
          Whitelist or blacklist addresses for KYC compliance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="number-display">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Whitelisted
            </CardTitle>
            <UserPlus className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="number-display">
              {users.filter((u) => u.isWhitelisted).length}
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blacklisted
            </CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="number-display">
              {users.filter((u) => u.isBlacklisted).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Whitelist Form */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">Batch Whitelist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Enter addresses (one per line)
            </label>
            <Textarea
              placeholder="0x1234...&#10;0x5678...&#10;0xabcd..."
              value={batchAddresses}
              onChange={(e) => setBatchAddresses(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleBatchWhitelist}
            disabled={isWhitelisting || !batchAddresses.trim()}
            className="btn-gold"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isWhitelisting ? 'Whitelisting...' : 'Whitelist Addresses'}
          </Button>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-xl font-display">User Directory</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="whitelisted">Whitelisted</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Trade Count</TableHead>
                  <TableHead className="text-right">Total Volume (mAED)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.address}>
                    <TableCell className="font-mono text-sm">
                      {shortenAddress(user.address)}
                    </TableCell>
                    <TableCell>
                      {user.isBlacklisted ? (
                        <Badge variant="destructive">Blacklisted</Badge>
                      ) : user.isWhitelisted ? (
                        <Badge variant="default" className="bg-success">
                          Whitelisted
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {user.tradeCount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(user.totalVolume / 1e6).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!user.isWhitelisted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhitelistUser(user.address)}
                            disabled={isWhitelisting}
                            className="text-success hover:text-success"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                        {!user.isBlacklisted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBlacklistUser(user.address)}
                            disabled={isBlacklisting}
                            className="text-destructive hover:text-destructive"
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
