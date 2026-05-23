// Defence-in-depth on top of server-side sanitized HTML.
// Pure tokenizer (no DOMParser) plus tag and attribute allowlists.

const TAG_ALLOWLIST: ReadonlySet<string> = new Set(['p', 'br', 'a', 'span', 'em', 'strong']);

const ATTR_ALLOWLIST: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(['href', 'class']),
  span: new Set(['class']),
  p: new Set(['class']),
  em: new Set(['class']),
  strong: new Set(['class']),
  br: new Set([]),
};

interface TextToken {
  type: 'text';
  value: string;
}

interface TagToken {
  type: 'tag';
  name: string;
  attrs: Record<string, string>;
  closing: boolean;
}

type Token = TextToken | TagToken;

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== 'string') return '';
  let out = '';
  for (const tok of tokenize(input)) {
    if (tok.type === 'text') {
      out += tok.value;
      continue;
    }
    const name = tok.name.toLowerCase();
    if (!TAG_ALLOWLIST.has(name)) continue;
    if (tok.closing) {
      if (name === 'br') continue;
      out += `</${name}>`;
    } else {
      out += renderTag(name, tok.attrs);
    }
  }
  return out;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '<') {
      const end = input.indexOf('>', i);
      if (end === -1) break;
      let raw = input.slice(i + 1, end);
      i = end + 1;
      const closing = raw[0] === '/';
      if (closing) raw = raw.slice(1);
      raw = raw.trim();
      if (raw.endsWith('/')) raw = raw.slice(0, -1).trim();
      const m = raw.match(/^([a-zA-Z][a-zA-Z0-9]*)(\s[\s\S]*)?$/);
      if (!m) continue;
      tokens.push({
        type: 'tag',
        name: m[1]!,
        attrs: parseAttrs(m[2] ?? ''),
        closing,
      });
    } else {
      const end = input.indexOf('<', i);
      if (end === -1) {
        tokens.push({ type: 'text', value: input.slice(i) });
        break;
      }
      tokens.push({ type: 'text', value: input.slice(i, end) });
      i = end;
    }
  }
  return tokens;
}

function parseAttrs(str: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    attrs[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

function renderTag(name: string, attrs: Record<string, string>): string {
  if (name === 'br') return '<br>';
  let result = `<${name}`;
  const allowed = ATTR_ALLOWLIST[name] ?? new Set<string>();
  for (const [k, v] of Object.entries(attrs)) {
    if (!allowed.has(k)) continue;
    if (k === 'href' && !isSafeUrl(v)) continue;
    result += ` ${k}="${escapeAttr(v)}"`;
  }
  if (name === 'a') result += ' rel="noopener nofollow ugc" target="_blank"';
  return result + '>';
}

/** Allowlist of `href` prefixes. Anything starting with `javascript:`, `data:`, etc. is blocked. */
function isSafeUrl(url: string): boolean {
  const t = String(url).trim().toLowerCase();
  return (
    t.startsWith('https://') ||
    t.startsWith('http://') ||
    t.startsWith('/') ||
    t.startsWith('#') ||
    t.startsWith('?')
  );
}

/**
 * Input is already entity-encoded server-side. Re-escaping `&` would
 * double-encode it (`&amp;` becomes `&amp;amp;`). We only escape `"`
 * as a safety net for values that came from single-quoted attributes.
 */
function escapeAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;');
}
