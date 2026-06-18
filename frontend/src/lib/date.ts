// Centralised date formatting so the whole app shows dates as DD/MM/YYYY.

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** DD/MM/YYYY (e.g. 18/06/2026). Returns '—' for empty/invalid input. */
export function fmtDate(d: string | number | Date | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm — for timestamps where the time matters. */
export function fmtDateTime(d: string | number | Date | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return `${fmtDate(dt)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
