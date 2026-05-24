// Relative date formatting via Intl.RelativeTimeFormat (native in Node + browsers).

export function formatRelativeDate(
  date: Date | string | number,
  now: Date | string | number,
  locale?: string,
): string {
  const d = date instanceof Date ? date : new Date(date);
  const n = now instanceof Date ? now : new Date(now);
  const rtf = new Intl.RelativeTimeFormat(locale || 'en', { numeric: 'auto' });
  const diff = (d.getTime() - n.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60)       return rtf.format(Math.round(diff),               'second');
  if (abs < 3600)     return rtf.format(Math.round(diff / 60),          'minute');
  if (abs < 86400)    return rtf.format(Math.round(diff / 3600),        'hour');
  if (abs < 2592000)  return rtf.format(Math.round(diff / 86400),       'day');
  if (abs < 31536000) return rtf.format(Math.round(diff / 2592000),     'month');
  return rtf.format(Math.round(diff / 31536000), 'year');
}
