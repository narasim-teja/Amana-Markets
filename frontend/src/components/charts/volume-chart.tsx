'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  HistogramData,
} from 'lightweight-charts';

interface VolumeChartProps {
  data: {
    time: number;
    value: number;
  }[];
  color?: string;
  height?: number;
}

export function VolumeChart({
  data,
  color = '#C9A96E',
  height = 300,
}: VolumeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
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
          color: '#C9A96E',
          labelBackgroundColor: '#C9A96E',
        },
        horzLine: {
          color: '#C9A96E',
          labelBackgroundColor: '#C9A96E',
        },
      },
    });

    chartRef.current = chart;

    // Create histogram series
    const series = chart.addHistogramSeries({
      color,
      priceFormat: {
        type: 'volume',
      },
    });

    seriesRef.current = series;

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
      }
    };
  }, [color, height]);

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    // Convert data to histogram format
    const histogramData: HistogramData[] = data.map((d) => ({
      time: d.time as any,
      value: d.value,
      color,
    }));

    seriesRef.current.setData(histogramData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, color]);

  return <div ref={chartContainerRef} className="w-full" />;
}
