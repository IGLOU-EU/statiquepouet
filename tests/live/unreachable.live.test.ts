// Both dispatcher failure paths, end-to-end through resolveReplyUrl:
//   1. Domain unreachable (DNS NXDOMAIN, server down, refused) raises
//      InstanceUnreachableError via the no-cors HEAD probe.
//   2. Host reachable but no microblogging surface raises
//      UnsupportedInstanceError. CORS-blocked-microblog cases look the
//      same to JS but cannot be reproduced from Node.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveReplyUrl,
  InstanceUnreachableError,
  UnsupportedInstanceError,
} from '../../src/intent.js';

const TOOT = 'https://mastodon.social/@Mastodon/116489457177711947';

// `.invalid` is reserved by RFC 2606. DNS never resolves it.
const UNREACHABLE = 'statique-pouet-nonexistent-host-12345.invalid';

// IANA documentation domain, exists, answers HTTPS on `/`, but
// implements none of webfinger / nodeinfo / Mastodon Client API.
const REACHABLE_NON_FEDIVERSE = 'example.com';

test('live: nonexistent .invalid host → InstanceUnreachableError', async () => {
  await assert.rejects(
    () => resolveReplyUrl(UNREACHABLE, TOOT),
    (err: Error) => {
      assert.ok(
        err instanceof InstanceUnreachableError,
        `expected InstanceUnreachableError, got ${err.name}: ${err.message}`,
      );
      assert.equal((err as InstanceUnreachableError).instance, UNREACHABLE);
      return true;
    },
  );
});

test('live: reachable non-microblog domain (example.com) → UnsupportedInstanceError', async (t) => {
  try {
    await fetch(`https://${REACHABLE_NON_FEDIVERSE}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    t.skip(`example.com unreachable from this host: ${(err as Error).message}`);
    return;
  }

  await assert.rejects(
    () => resolveReplyUrl(REACHABLE_NON_FEDIVERSE, TOOT),
    (err: Error) => {
      assert.ok(
        err instanceof UnsupportedInstanceError,
        `expected UnsupportedInstanceError, got ${err.name}: ${err.message}`,
      );
      assert.equal((err as UnsupportedInstanceError).instance, REACHABLE_NON_FEDIVERSE);
      return true;
    },
  );
});
