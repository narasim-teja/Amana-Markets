'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSponsoredWrite } from '@/hooks/blockchain/use-sponsored-write';
import { useSmartAccount } from '@/hooks/blockchain/use-smart-account';
import { CONTRACTS } from '@/lib/contracts';
import { parseUnits } from 'viem';
import { Coins, ArrowRightLeft, Sparkles, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const PRESET_AMOUNTS = [
  { label: '100', value: '100', description: 'Starter' },
  { label: '500', value: '500', description: 'Basic' },
  { label: '1,000', value: '1000', description: 'Standard' },
  { label: '5,000', value: '5000', description: 'Premium' },
  { label: '10,000', value: '10000', description: 'Pro' },
  { label: '50,000', value: '50000', description: 'Whale' },
];

interface BuyDDSCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyDDSCDialog({ open, onOpenChange }: BuyDDSCDialogProps) {
  const { writeContract, isLoading } = useSponsoredWrite('native');
  const { displayAddress } = useSmartAccount();
  const queryClient = useQueryClient();

  const [selectedPreset, setSelectedPreset] = useState<string | null>('1000');
  const [customAmount, setCustomAmount] = useState('');

  const activeAmount = customAmount || selectedPreset || '';

  const handlePresetClick = (value: string) => {
    setSelectedPreset(value);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    if (value) {
      setSelectedPreset(null);
    }
  };

  const handleBuy = async () => {
    if (!displayAddress || !activeAmount || parseFloat(activeAmount) <= 0) return;

    try {
      const amountWei = parseUnits(activeAmount, 6); // DDSC has 6 decimals

      await writeContract({
        address: CONTRACTS.MockDirham.address,
        abi: CONTRACTS.MockDirham.abi,
        functionName: 'mint',
        args: [displayAddress, amountWei],
      });

      // Refetch balances
      queryClient.invalidateQueries({ queryKey: ['maed-balance'] });

      onOpenChange(false);
      setCustomAmount('');
      setSelectedPreset('1000');
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-dark-900 border-dark-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 font-display text-xl">
            <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
              <Banknote className="h-4.5 w-4.5 text-gold" />
            </div>
            Buy DDSC
          </DialogTitle>
          <DialogDescription>
            Purchase DDSC (Dubai Digital Stablecoin) to trade tokenized
            commodities on the ADI marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Preset Amounts */}
          <div>
            <label className="text-sm text-muted-foreground mb-2.5 block">
              Select amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center py-3 px-3 rounded-xl border transition-all',
                    selectedPreset === preset.value && !customAmount
                      ? 'border-gold/50 bg-gold/10 shadow-[0_0_12px_rgba(201,169,110,0.15)]'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600 hover:bg-dark-800/80'
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold',
                      selectedPreset === preset.value && !customAmount
                        ? 'text-gold'
                        : 'text-foreground'
                    )}
                  >
                    {preset.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-2.5 block">
              Or enter custom amount
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                disabled={isLoading}
                min="0"
                step="100"
                className="text-lg font-mono h-12 pr-20 bg-dark-800 border-dark-700 focus:border-gold/50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-gold" />
                <span className="text-sm font-medium text-muted-foreground">
                  DDSC
                </span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          {activeAmount && parseFloat(activeAmount) > 0 && (
            <div className="bg-dark-800/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-medium text-foreground">
                  {parseFloat(activeAmount).toLocaleString()} DDSC
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-mono text-muted-foreground">
                  1 DDSC = 1 AED
                </span>
              </div>
              <div className="h-px bg-dark-700" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span className="text-sm font-medium text-foreground">
                    You receive
                  </span>
                </div>
                <span className="font-mono text-lg font-bold text-gold">
                  {parseFloat(activeAmount).toLocaleString()} DDSC
                </span>
              </div>
            </div>
          )}

          {/* Buy Button */}
          <Button
            onClick={handleBuy}
            disabled={
              !activeAmount || parseFloat(activeAmount) <= 0 || isLoading
            }
            className="w-full h-12 text-base font-semibold rounded-xl btn-gold"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Buy{' '}
                {activeAmount
                  ? `${parseFloat(activeAmount).toLocaleString()} `
                  : ''}
                DDSC
              </div>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground/60">
            Gas sponsored
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
