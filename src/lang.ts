/**
 * Priority: config.lang -> <html lang> -> navigator.language -> `'en'`.
 * Regional codes (`fr-FR`) reduce to the primary subtag (`fr`).
 */
export function resolveLang(
  configLang: string | null | undefined,
  htmlLang: string | null | undefined,
  navigatorLang: string | null | undefined,
): string {
  const base = (s: string): string => s.split(/[-_]/)[0]!.toLowerCase();
  if (configLang) return base(configLang);
  if (htmlLang) return base(htmlLang);
  if (navigatorLang) return base(navigatorLang);
  return 'en';
}

/** Substitute `{key}` placeholders with `vars[key]`. Empty when key is missing. */
export function format(
  template: string,
  vars?: Record<string, string | number | undefined>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k] ?? '') : ''
  );
}
