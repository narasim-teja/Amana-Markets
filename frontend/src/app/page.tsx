'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Shield, Activity } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

export default function HomePage() {
  const { appName, logoUrl } = useBranding();
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="text-center space-y-8 max-w-4xl">
        {/* Hero Section */}
        <div className="space-y-4">
          <img src={logoUrl} alt={appName} className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-6xl md:text-7xl font-display text-gold mb-6">
            {appName}
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground">
            Institutional-Grade Commodity Trading
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trade tokenized gold, silver, and oil with real-time oracle pricing
            on-chain
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link href="/trade">
            <Button size="lg" className="btn-gold text-lg px-8 py-6">
              <TrendingUp className="h-5 w-5 mr-2" />
              Start Trading
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
          <Card className="premium-card">
            <CardContent className="pt-6 text-center">
              <Activity className="h-10 w-10 text-gold mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Real-Time Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Multi-source price aggregation from Pyth, DIA, and RedStone
              </p>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="pt-6 text-center">
              <Shield className="h-10 w-10 text-gold mx-auto mb-4" />
              <h3 className="font-display text-xl mb-2">Institutional Security</h3>
              <p className="text-sm text-muted-foreground">
                KYC whitelisting and compliance-first architecture
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Network Info */}
        <div className="mt-16 p-4 bg-dark-800/30 rounded-lg border border-dark-700">
          <p className="text-sm text-muted-foreground">
            <span className="text-gold font-semibold">ADI Testnet</span> • Chain ID: 99999 •{' '}
            <a
              href="https://explorer.ab.testnet.adifoundation.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Block Explorer ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
