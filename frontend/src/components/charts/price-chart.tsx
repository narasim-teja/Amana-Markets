'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineData,
  UTCTimestamp,
} from 'lightweight-charts';

type TimeRange = '1h' | '24h' | '7d' | '30d';

const RANGE_SECONDS: Record<TimeRange, number> = {
  '1h': 3600,
  '24h': 86400,
  '7d': 604800,
  '30d': 2592000,
};

interface PriceChartProps {
  data: Array<{ time: number; price: number }>;
  latestPoint?: { time: number; price: number } | null;
  color?: string;
  height?: number;
  range?: TimeRange;
  onCrosshairMove?: (price: number | null, time: number | null) => void;
}

export function PriceChart({
  data,
  latestPoint,
  color = '#C9A96E',
  height = 400,
  range = '24h',
  onCrosshairMove,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#13131A' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#1C1C26' },
        horzLines: { color: '#1C1C26' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1C1C26',
        rightOffset: 5,
        barSpacing: 6,
      },
      rightPriceScale: {
        borderColor: '#1C1C26',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        vertLine: {
          color: color,
          labelBackgroundColor: color,
        },
        horzLine: {
          color: color,
          labelBackgroundColor: color,
        },
      },
    });

    chartRef.current = chart;

    const series = chart.addAreaSeries({
      lineColor: color,
      topColor: `${color}40`,
      bottomColor: `${color}05`,
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      crosshairMarkerBackgroundColor: color,
      crosshairMarkerBorderColor: color,
    });

    seriesRef.current = series;

    // Crosshair move handler
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (param.time && param.seriesData.size > 0) {
          const pointData = param.seriesData.get(series);
          if (pointData && 'value' in pointData) {
            onCrosshairMove(pointData.value, param.time as number);
          }
        } else {
          onCrosshairMove(null, null);
        }
      });
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [color, height]);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    if (!data || data.length === 0) {
      seriesRef.current.setData([]);
      return;
    }

    // Deduplicate and ensure strictly ascending time order
    const seen = new Set<number>();
    const lineData: LineData[] = [];
    for (const d of data) {
      if (!seen.has(d.time)) {
        seen.add(d.time);
        lineData.push({ time: d.time as UTCTimestamp, value: d.price });
      }
    }
    lineData.sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(lineData);

    // Set visible range to match the selected timeframe
    const now = Math.floor(Date.now() / 1000);
    const rangeStart = now - RANGE_SECONDS[range];
    chartRef.current.timeScale().setVisibleRange({
      from: rangeStart as UTCTimestamp,
      to: now as UTCTimestamp,
    });
  }, [data, range]);

  // Real-time update
  useEffect(() => {
    if (!seriesRef.current || !latestPoint) return;

    seriesRef.current.update({
      time: latestPoint.time as UTCTimestamp,
      value: latestPoint.price,
    });
  }, [latestPoint]);

  return <div ref={chartContainerRef} className="w-full" />;
}
