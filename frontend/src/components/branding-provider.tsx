'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface BrandingConfig {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  fontPreset: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'Amanah',
  logoUrl: '/logo.png',
  primaryColor: '#C9A96E',
  fontPreset: 'dm-sans',
};

const FONT_PRESETS: Record<string, { importUrl: string; family: string }> = {
  'dm-sans': { importUrl: '', family: '' },
  'inter': {
    importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    family: "'Inter', system-ui, sans-serif",
  },
  'space-grotesk': {
    importUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    family: "'Space Grotesk', system-ui, sans-serif",
  },
  'plus-jakarta': {
    importUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  'sora': {
    importUrl: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap',
    family: "'Sora', system-ui, sans-serif",
  },
};

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * percent / 100)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: () => apiClient.getBranding(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const config = useMemo(() => branding ?? DEFAULT_BRANDING, [branding]);

  // Apply primary color CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const color = config.primaryColor;
    root.style.setProperty('--primary', color);
    root.style.setProperty('--gold', color);
    root.style.setProperty('--ring', color);
    root.style.setProperty('--gold-light', adjustBrightness(color, 20));
    root.style.setProperty('--gold-dark', adjustBrightness(color, -15));
  }, [config.primaryColor]);

  // Load custom font
  useEffect(() => {
    const preset = FONT_PRESETS[config.fontPreset];
    if (!preset || !preset.importUrl) {
      // Default font — remove any custom font link and reset
      const existing = document.querySelector('link[data-branding-font]');
      if (existing) existing.remove();
      document.documentElement.style.removeProperty('--font-sans');
      return;
    }

    const existing = document.querySelector('link[data-branding-font]');
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = preset.importUrl;
    link.setAttribute('data-branding-font', 'true');
    document.head.appendChild(link);
    document.documentElement.style.setProperty('--font-sans', preset.family);

    return () => {
      link.remove();
      document.documentElement.style.removeProperty('--font-sans');
    };
  }, [config.fontPreset]);

  return (
    <BrandingContext.Provider value={config}>
      {children}
    </BrandingContext.Provider>
  );
}
