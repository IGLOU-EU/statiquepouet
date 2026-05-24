// Module state: config, i18n strings, resolved language. Lazy init on first action.

import type { Config, Strings } from './types.js';
import { resolveLang, format } from './lang.js';

declare global {
  interface Window {
    STATIQUE_POUET_CONFIG?: Partial<Config>;
  }
}

let _config: Config | null = null;
let _strings: Strings = {};
let _lang = 'en';
let _initPromise: Promise<void> | null = null;

export function ensureInit(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const raw = (typeof window !== 'undefined' && window.STATIQUE_POUET_CONFIG) || {};
    _config = {
      commentsContainerId: raw.commentsContainerId ?? 'comments',
      lang: raw.lang,
      basePath: (raw.basePath ?? '/').replace(/\/?$/, '/'),
    };
    _lang = resolveLang(
      _config.lang,
      typeof document !== 'undefined' ? document.documentElement.lang : null,
      typeof navigator !== 'undefined' ? navigator.language : null,
    );
    try {
      const res = await fetch(_config.basePath + 'lang/' + _lang + '.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _strings = (await res.json()) as Strings;
    } catch (err) {
      console.warn('[statique-pouet] language file unavailable:', err);
      _strings = {};
    }
  })();
  return _initPromise;
}

export function getConfig(): Config {
  if (!_config) throw new Error('statique-pouet: ensureInit() not called yet');
  return _config;
}

export function getLocale(): string {
  return _lang;
}

/** i18n lookup with `{name}` variable interpolation. */
export function t(
  key: string,
  vars?: Record<string, string | number | undefined>,
): string {
  return format(_strings[key] ?? key, vars);
}
