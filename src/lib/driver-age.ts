/**
 * Driver dates of birth.
 *
 * Jolpica sends a date with no time, so the value lands at midnight UTC —
 * the same shape as `Race.date`, and with the same two traps. Reading it in
 * local time shows the day before for anyone west of Greenwich, and taking
 * age as a subtraction of years makes everyone who has not had their birthday
 * yet a year older than they are.
 */

function parse(dateOfBirth: Date | string | null | undefined): Date | null {
  if (!dateOfBirth) return null;

  const date = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Completed years of life, counting the birthday itself. */
export function driverAge(
  dateOfBirth: Date | string | null | undefined,
  today: Date = new Date()
): number | null {
  const birth = parse(dateOfBirth);
  if (!birth) return null;

  let age = today.getUTCFullYear() - birth.getUTCFullYear();

  const monthsApart = today.getUTCMonth() - birth.getUTCMonth();
  const beforeBirthday =
    monthsApart < 0 || (monthsApart === 0 && today.getUTCDate() < birth.getUTCDate());

  if (beforeBirthday) age--;

  return age < 0 ? null : age;
}

/**
 * The date as written, not as the reader's clock would shift it. Fixing the
 * time zone also keeps server and client rendering the same string, which is
 * what stops React complaining about hydration.
 */
export function formatBirthDate(
  dateOfBirth: Date | string | null | undefined,
  locale = 'es-ES'
): string | null {
  const birth = parse(dateOfBirth);
  if (!birth) return null;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(birth);
}
