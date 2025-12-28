'use client';

/**
 * Telemetry Comparison Component
 * Compares telemetry data between two drivers
 */

import { useMemo } from 'react';
import type { TelemetryComparisonResponse } from '@/types';

interface TelemetryComparisonProps {
  data: TelemetryComparisonResponse;
  height?: number;
}

// F1 Team Colors (2024)
const DRIVER_COLORS: Record<string, string> = {
  VER: '#3671C6', // Red Bull
  PER: '#3671C6',
  HAM: '#27F4D2', // Mercedes
  RUS: '#27F4D2',
  LEC: '#E8002D', // Ferrari
  SAI: '#E8002D',
  NOR: '#FF8000', // McLaren
  PIA: '#FF8000',
  ALO: '#229971', // Aston Martin
  STR: '#229971',
  OCO: '#FF87BC', // Alpine
  GAS: '#FF87BC',
  TSU: '#6692FF', // RB
  RIC: '#6692FF',
  BOT: '#52E252', // Sauber
  ZHO: '#52E252',
  MAG: '#B6BABD', // Haas
  HUL: '#B6BABD',
  ALB: '#64C4FF', // Williams
  SAR: '#64C4FF',
};

export function TelemetryComparison({ data, height = 250 }: TelemetryComparisonProps) {
  const { driver1, driver2 } = data;

  const color1 = DRIVER_COLORS[driver1.code] || '#e10600';
  const color2 = DRIVER_COLORS[driver2.code] || '#00d2be';

  const chartData = useMemo(() => {
    const tel1 = driver1.telemetry;
    const tel2 = driver2.telemetry;

    if (!tel1.length || !tel2.length) {
      return null;
    }

    // Find speed range across both drivers
    const allSpeeds = [...tel1.map((t) => t.Speed), ...tel2.map((t) => t.Speed)];
    const maxSpeed = Math.max(...allSpeeds);
    const minSpeed = Math.min(...allSpeeds);
    const range = maxSpeed - minSpeed || 1;

    const chartHeight = height - 60;

    const createPath = (telemetry: typeof tel1) => {
      const len = telemetry.length;
      return telemetry
        .map((t, i) => {
          const x = (i / (len - 1)) * 100;
          const y = chartHeight - ((t.Speed - minSpeed) / range) * chartHeight;
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    };

    return {
      maxSpeed,
      minSpeed,
      path1: createPath(tel1),
      path2: createPath(tel2),
      chartHeight,
    };
  }, [driver1.telemetry, driver2.telemetry, height]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <p className="text-muted-foreground">No telemetry data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-foreground">
          Speed Comparison
        </h3>
        <div className="flex items-center gap-6">
          {/* Driver 1 Legend */}
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-6 rounded"
              style={{ backgroundColor: color1 }}
            />
            <span className="text-sm font-medium">{driver1.code}</span>
            <span className="text-xs text-muted-foreground">
              {driver1.lap_time}
            </span>
          </div>
          {/* Driver 2 Legend */}
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-6 rounded"
              style={{ backgroundColor: color2 }}
            />
            <span className="text-sm font-medium">{driver2.code}</span>
            <span className="text-xs text-muted-foreground">
              {driver2.lap_time}
            </span>
          </div>
        </div>
      </div>

      {/* Delta Time */}
      <div className="mb-4 text-center">
        <span className="text-sm text-muted-foreground">Delta: </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {data.delta_time}
        </span>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-[calc(100%-20px)] flex-col justify-between text-xs text-muted-foreground">
          <span>{chartData.maxSpeed.toFixed(0)}</span>
          <span>
            {((chartData.maxSpeed + chartData.minSpeed) / 2).toFixed(0)}
          </span>
          <span>{chartData.minSpeed.toFixed(0)}</span>
        </div>

        <svg
          className="ml-10 h-[calc(100%-20px)] w-[calc(100%-40px)]"
          viewBox={`0 0 100 ${chartData.chartHeight}`}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            stroke="currentColor"
            strokeOpacity="0.1"
          />
          <line
            x1="0"
            y1={chartData.chartHeight / 2}
            x2="100"
            y2={chartData.chartHeight / 2}
            stroke="currentColor"
            strokeOpacity="0.1"
          />
          <line
            x1="0"
            y1={chartData.chartHeight}
            x2="100"
            y2={chartData.chartHeight}
            stroke="currentColor"
            strokeOpacity="0.1"
          />

          {/* Driver 1 line */}
          <path
            d={chartData.path1}
            fill="none"
            stroke={color1}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Driver 2 line */}
          <path
            d={chartData.path2}
            fill="none"
            stroke={color2}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2,1"
          />
        </svg>

        <div className="mt-2 text-center text-xs text-muted-foreground">
          Distance
        </div>
      </div>

      {/* Compound info */}
      <div className="mt-4 flex justify-center gap-8 text-sm">
        {driver1.compound && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{driver1.code}:</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                driver1.compound === 'SOFT'
                  ? 'bg-red-500/20 text-red-400'
                  : driver1.compound === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : driver1.compound === 'HARD'
                      ? 'bg-slate-500/20 text-slate-400'
                      : 'bg-green-500/20 text-green-400'
              }`}
            >
              {driver1.compound}
            </span>
          </div>
        )}
        {driver2.compound && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{driver2.code}:</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                driver2.compound === 'SOFT'
                  ? 'bg-red-500/20 text-red-400'
                  : driver2.compound === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : driver2.compound === 'HARD'
                      ? 'bg-slate-500/20 text-slate-400'
                      : 'bg-green-500/20 text-green-400'
              }`}
            >
              {driver2.compound}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
