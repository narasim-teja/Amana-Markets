'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Palette, Type, Image, Pencil, Eye, RotateCcw } from 'lucide-react';

const FONT_OPTIONS = [
  { value: 'dm-sans', label: 'DM Sans', description: 'Clean, modern (default)' },
  { value: 'inter', label: 'Inter', description: 'Neutral, widely used' },
  { value: 'space-grotesk', label: 'Space Grotesk', description: 'Geometric, techy' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans', description: 'Rounded, friendly' },
  { value: 'sora', label: 'Sora', description: 'Bold, contemporary' },
];

const COLOR_PRESETS = [
  { value: '#C9A96E', label: 'Gold (Default)' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
];

export default function BrandingPage() {
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ['branding'],
    queryFn: () => apiClient.getBranding(),
  });

  const [appName, setAppName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#C9A96E');
  const [fontPreset, setFontPreset] = useState('dm-sans');

  useEffect(() => {
    if (branding) {
      setAppName(branding.appName);
      setLogoUrl(branding.logoUrl);
      setPrimaryColor(branding.primaryColor);
      setFontPreset(branding.fontPreset);
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.updateBranding({ appName, logoUrl, primaryColor, fontPreset }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Branding updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update branding');
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiClient.updateBranding({
        appName: 'Amanah',
        logoUrl: '/logo.png',
        primaryColor: '#C9A96E',
        fontPreset: 'dm-sans',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Branding reset to defaults');
    },
  });

  const hasChanges =
    branding &&
    (appName !== branding.appName ||
      logoUrl !== branding.logoUrl ||
      primaryColor !== branding.primaryColor ||
      fontPreset !== branding.fontPreset);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-display text-gold mb-1">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your platform
        </p>
      </div>

      {/* Live Preview */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-gold" />
            <h3 className="font-semibold">Live Preview</h3>
          </div>
          <div className="bg-dark-950 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center gap-3 mb-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span
                className="font-display text-xl font-semibold"
                style={{ color: primaryColor }}
              >
                {appName || 'App Name'}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: primaryColor, color: '#0A0A0F' }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                Outline Button
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Name */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Pencil className="h-4 w-4 text-gold" />
              <h3 className="font-semibold">App Name</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appName">Display Name</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Amanah"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                Shown in the navigation bar, homepage, and admin panel
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="h-4 w-4 text-gold" />
              <h3 className="font-semibold">Logo</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png or /logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Use a URL to an image or a path relative to /public
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Primary Color */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-gold" />
              <h3 className="font-semibold">Primary Color</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-dark-700 bg-transparent"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#C9A96E"
                  className="flex-1 font-mono"
                  maxLength={7}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setPrimaryColor(preset.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      primaryColor === preset.value
                        ? 'border-foreground scale-110'
                        : 'border-dark-700 hover:border-dark-500'
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Font */}
        <Card className="premium-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-4 w-4 text-gold" />
              <h3 className="font-semibold">Font</h3>
            </div>
            <div className="space-y-2">
              <Label>Body Font</Label>
              <Select value={fontPreset} onValueChange={setFontPreset}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label} — {font.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changes the body text font across the entire application
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button
          className="btn-gold"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
