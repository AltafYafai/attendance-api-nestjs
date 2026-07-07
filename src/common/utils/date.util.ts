// Attendance is tracked per calendar day in UTC. These helpers normalize any
// incoming value to midnight UTC so it maps cleanly onto a Postgres `date`.

export function toDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function today(): Date {
  return toDateOnly(new Date());
}
