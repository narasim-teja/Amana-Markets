'use client';

import { cn } from '@/lib/utils';

const TIMEFRAMES = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
] as const;

export type TimeRange = '1h' | '24h' | '7d' | '30d';

interface TimeframeSelectorProps {
  selected: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-dark-900 p-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
            selected === tf.value
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
