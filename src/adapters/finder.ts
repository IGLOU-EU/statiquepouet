// Two-pronged dispatch.
//
// `findAdapter(jrd)` reads webfinger markers (`detectFromJRD`).
// `findAdapterBySoftware(name)` reads nodeinfo `software.name`
// (`detectFromSoftware`). Both fall through to the default / `null`
// so the caller can chain probes.
//
// Adding a network:
//   1. New `src/adapters/<network>.ts` exporting `<Network>Adapter`
//      and one or both detectors.
//   2. Append to `EXCEPTIONS` (order is priority).
//   3. Tests in `tests/adapters/<network>.test.ts`.

import type { JRD } from '../types.js';
import type { IntentAdapter } from './types.js';
import { DefaultAdapter } from './default.js';
import { MisskeyAdapter, isMisskeyJRD, isMisskeySoftware } from './misskey.js';

interface ExceptionEntry {
  adapter: IntentAdapter;
  detectFromJRD?: (jrd: JRD) => boolean;
  detectFromSoftware?: (software: string) => boolean;
}

const EXCEPTIONS: readonly ExceptionEntry[] = [
  {
    adapter: MisskeyAdapter,
    detectFromJRD: isMisskeyJRD,
    detectFromSoftware: isMisskeySoftware,
  },
];

export function findAdapter(jrd: JRD | null): IntentAdapter {
  if (jrd) {
    for (const { adapter, detectFromJRD } of EXCEPTIONS) {
      if (detectFromJRD?.(jrd)) return adapter;
    }
  }
  return DefaultAdapter;
}

export function findAdapterBySoftware(
  software: string | null,
): IntentAdapter | null {
  if (!software) return null;
  for (const { adapter, detectFromSoftware } of EXCEPTIONS) {
    if (detectFromSoftware?.(software)) return adapter;
  }
  return null;
}
