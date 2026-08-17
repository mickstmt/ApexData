'use client';

import { useEffect, useState } from 'react';

/**
 * Counts down to a session in the viewer's own timezone.
 *
 * The target is passed as an ISO string and formatted on the client, because
 * the server has no idea which timezone the viewer is in — the one detail that
 * decides whether "the race starts at 15:00" is useful or misleading.
 */
export function RaceCountdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();

      if (diff <= 0) {
        setRemaining(null);
        return;
      }

      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);

      setRemaining(days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`);
    };

    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [target]);

  if (!remaining) return null;

  return (
    <span className="font-mono text-sm font-semibold tabular-nums text-primary">
      en {remaining}
    </span>
  );
}

function format(value: string, withTime: boolean, timeZone?: string) {
  return new Date(value).toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * Timestamp in the viewer's own timezone.
 *
 * Server and client disagree by definition here, so the first paint uses UTC —
 * a real date rather than a placeholder, which also means the offline copy
 * cached by the service worker stays readable — and hydration swaps in the
 * local rendering.
 */
export function LocalDateTime({
  value,
  withTime = true,
}: {
  value: string;
  withTime?: boolean;
}) {
  const [label, setLabel] = useState(() => format(value, withTime, 'UTC'));

  useEffect(() => {
    setLabel(format(value, withTime));
  }, [value, withTime]);

  return <span suppressHydrationWarning>{label}</span>;
}
