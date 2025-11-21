'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';

interface SeasonSelectorProps {
  currentSeason: number;
  availableSeasons?: number[];
}

export function SeasonSelector({ currentSeason, availableSeasons }: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate seasons from 1950 to current year + 1 (for upcoming season)
  const currentYear = new Date().getFullYear();
  const seasons = availableSeasons || Array.from(
    { length: currentYear - 1950 + 2 },
    (_, i) => currentYear + 1 - i
  );

  const handleSeasonChange = (season: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('season', season.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      <select
        value={currentSeason}
        onChange={(e) => handleSeasonChange(Number(e.target.value))}
        className="rounded-lg border border-border bg-background px-4 py-2 font-medium transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {seasons.map((season) => (
          <option key={season} value={season}>
            Temporada {season}
          </option>
        ))}
      </select>
    </div>
  );
}
