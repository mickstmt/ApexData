import Link from 'next/link';
import { cn } from '@/lib/utils';
import { teamColor } from '@/lib/team-colors';

/**
 * One row of a timing tower: position, team stripe, identity, trailing value.
 *
 * The team colour is a 4px stripe rather than text or a background, which is
 * what makes it work for every team — Mercedes' black and Haas' white are
 * unreadable as ink but perfectly legible as a block against the card.
 */
export function TimingRow({
  position,
  constructorId,
  href,
  children,
  value,
  valueLabel,
  highlight = false,
  className,
}: {
  position: number | null;
  constructorId?: string | null;
  href?: string;
  children: React.ReactNode;
  value: React.ReactNode;
  valueLabel?: string;
  highlight?: boolean;
  className?: string;
}) {
  const { color } = teamColor(constructorId);

  const content = (
    <>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
      />

      <span className="w-8 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
        {position ?? '—'}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>

      <span className="shrink-0 text-right">
        <span className="block font-mono text-base font-semibold tabular-nums">{value}</span>
        {valueLabel && (
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            {valueLabel}
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    'relative flex min-h-[56px] items-center gap-3 overflow-hidden rounded-xl border bg-card py-2.5 pl-4 pr-4',
    'transition-colors',
    highlight ? 'border-primary/40' : 'border-border',
    href && 'hover:border-primary active:bg-accent',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
