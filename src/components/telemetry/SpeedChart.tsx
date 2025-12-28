'use client';

/**
 * Speed Chart Component
 * Displays speed telemetry data over distance/time
 */

import { useMemo } from 'react';
import type { TelemetryPoint } from '@/types';

interface SpeedChartProps {
  telemetry: TelemetryPoint[];
  driver: string;
  driverColor?: string;
  height?: number;
}

export function SpeedChart({
  telemetry,
  driver,
  driverColor = '#e10600',
  height = 200,
}: SpeedChartProps) {
  const { maxSpeed, minSpeed, points, svgPath } = useMemo(() => {
    if (!telemetry.length) {
      return { maxSpeed: 0, minSpeed: 0, points: [], svgPath: '' };
    }

    const speeds = telemetry.map((t) => t.Speed);
    const max = Math.max(...speeds);
    const min = Math.min(...speeds);
    const range = max - min || 1;

    const chartWidth = 100; // percentage
    const chartHeight = height - 40; // leave room for labels

    const pts = telemetry.map((t, i) => {
      const x = (i / (telemetry.length - 1)) * chartWidth;
      const y = chartHeight - ((t.Speed - min) / range) * chartHeight;
      return { x, y, speed: t.Speed, distance: t.Distance };
    });

    // Create SVG path
    const path = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    return { maxSpeed: max, minSpeed: min, points: pts, svgPath: path };
  }, [telemetry, height]);

  if (!telemetry.length) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <p className="text-muted-foreground">No telemetry data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Speed Trace - {driver}
        </h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Max: {maxSpeed.toFixed(0)} km/h</span>
          <span>Min: {minSpeed.toFixed(0)} km/h</span>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-xs text-muted-foreground">
          <span>{maxSpeed.toFixed(0)}</span>
          <span>{((maxSpeed + minSpeed) / 2).toFixed(0)}</span>
          <span>{minSpeed.toFixed(0)}</span>
        </div>

        {/* Chart */}
        <svg
          className="ml-10 h-full w-[calc(100%-40px)]"
          viewBox={`0 0 100 ${height - 40}`}
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
            y1={(height - 40) / 2}
            x2="100"
            y2={(height - 40) / 2}
            stroke="currentColor"
            strokeOpacity="0.1"
          />
          <line
            x1="0"
            y1={height - 40}
            x2="100"
            y2={height - 40}
            stroke="currentColor"
            strokeOpacity="0.1"
          />

          {/* Speed line */}
          <path
            d={svgPath}
            fill="none"
            stroke={driverColor}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* X-axis label */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Distance
        </div>
      </div>
    </div>
  );
}
