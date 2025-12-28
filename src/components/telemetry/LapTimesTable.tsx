'use client';

/**
 * Lap Times Table Component
 * Displays lap times for a session
 */

import type { LapData } from '@/types';

interface LapTimesTableProps {
  laps: LapData[];
  showDriver?: boolean;
}

// Compound colors
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: 'bg-red-500',
  MEDIUM: 'bg-yellow-500',
  HARD: 'bg-slate-400',
  INTERMEDIATE: 'bg-green-500',
  WET: 'bg-blue-500',
};

export function LapTimesTable({ laps, showDriver = true }: LapTimesTableProps) {
  if (!laps.length) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <p className="text-muted-foreground">No lap data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Lap
              </th>
              {showDriver && (
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Driver
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                S1
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                S2
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                S3
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                Tyre
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Max Speed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {laps.map((lap, index) => (
              <tr
                key={`${lap.Driver}-${lap.LapNumber}-${index}`}
                className={`transition-colors hover:bg-muted/50 ${
                  lap.IsPersonalBest ? 'bg-purple-500/10' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-foreground">
                  {lap.LapNumber}
                </td>
                {showDriver && (
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">
                      {lap.Driver}
                    </span>
                    {lap.Team && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {lap.Team}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`font-mono ${
                      lap.IsPersonalBest
                        ? 'font-semibold text-purple-400'
                        : 'text-foreground'
                    }`}
                  >
                    {lap.LapTime || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector1Time || '-'}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector2Time || '-'}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector3Time || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {lap.Compound && (
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          COMPOUND_COLORS[lap.Compound] || 'bg-gray-500'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {lap.TyreLife ? `L${lap.TyreLife}` : ''}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {lap.SpeedST ? `${lap.SpeedST.toFixed(0)} km/h` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
