# Contributing to StatiquePouet

Thanks for the interest in the project. The codebase stays small on
purpose — around 14 KB minified for the shipped library — and the
goal is to keep that compactness while remaining strictly typed and
well tested. This document describes how to contribute.

> **🤖 Using an AI or an agentic tool?** Read [`AGENTS.md`](AGENTS.md)
> first — it contains the mandatory behaviour rules (full human review,
> no auto-commits, commit co-signing, etc.).

## Philosophy

- **KISS**: prefer the obvious to the clever. Three repeated lines beat
  a premature abstraction.
- **Favor native browser primitives.** When a problem is solved by an
  HTML element, attribute, CSS rule, or built-in browser behaviour,
  use that rather than reimplementing it in JavaScript. The native
  primitive ships with accessibility (keyboard navigation, ARIA
  semantics, screen-reader support, focus management) for free.
  Reinventing it costs code, increases the bug surface, and almost
  always leaves accessibility gaps that we won't catch by tests.
  Examples already applied in the codebase: the global `hidden`
  attribute for show/hide, `<datalist>` for instance autocomplete,
  `<form>` + `<button type="submit">` for Enter-to-submit,
  `<label for>` for label-input association, semantic
  `<article>`/`<header>`/`<time>`/`<mark>` for the comments tree,
  `Intl.RelativeTimeFormat` for relative dates. **If you find yourself
  writing more than a few lines of JS to imitate something the browser
  already does, stop and look for the standard primitive first.**
- **No runtime dependencies**: `node`, `fetch`, `Intl`, standard DOM.
  Only `typescript`, `esbuild`, `@types/node` are tolerated as devDeps.
- **Strict TypeScript**: `noImplicitOverride`, `noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax`. No `any`. No double
  cast (`as unknown as X`). Prefer `unknown` + type guard.
- **Pure functions apart from the DOM**: anything testable without a
  browser (parsing, URL building, sanitisation, etc.) lives in modules
  with no `document`/`window` import and is tested under Node.
- **Adapter pattern** for per-software fediverse exceptions — see
  [`src/adapters/`](src/adapters/). Do not scatter
  `if (misskey) …` checks in shared code.

## Dev environment

```bash
git clone <repo>
cd statiquepouet
npm install          # esbuild + typescript + @types/node only
npm run typecheck    # tsc --noEmit
npm test             # compiles TS tests then runs node --test
npm run build        # → dist/comments.min.js (production, minified)
npm run build:dev    # → dist/comments.js with sourcemap (debug)
npm run clean        # wipes dist/ and build-test/
```

Node ≥ 18 required (native `node:test` and `fetch`).

## Running the demo locally

```bash
npm run build
python3 -m http.server
# then http://localhost:8000/demo/index.html
```

`file://` URLs don't work (CORS on ES modules).

## Specifications & external documentation

This list is the **reference** for anything touching endpoints, URLs or
schemas — modifying a function that uses one of them must be preceded
by reading the corresponding spec.

### Foundational standards

- [W3C ActivityPub](https://www.w3.org/TR/activitypub/) — the
  server-to-server protocol of the fediverse. **The project does not
  implement it** but many concepts (Actor, Note, inReplyTo, Activity)
  come from there.
- [W3C ActivityStreams 2.0 — Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/) —
  schema of the objects (`Note`, `Person`, `Create`, etc.).
- [RFC 7033 — WebFinger](https://www.rfc-editor.org/rfc/rfc7033) —
  actor-discovery protocol, used across the fediverse.
- [FEP-3b86 — Activity Intents](https://w3id.org/fep/3b86) — fediverse
  enhancement proposal for publishing intent URL templates (reply,
  share, follow, etc.) via webfinger. The main mechanism used by
  StatiquePouet for writing.
- [Nodeinfo](https://nodeinfo.diaspora.software/) — fediverse-wide
  software self-identification (`software.name`). Used as the
  secondary dispatch signal when webfinger-based adapter detection is
  inconclusive (notably for Misskey-family servers, which don't expose
  an instance-actor webfinger). Schema reference:
  [2.1](https://nodeinfo.diaspora.software/docson/index.html#/ns/schema/2.1).

### Reference implementations

- [Mastodon Client API](https://docs.joinmastodon.org/api/) — official
  docs. Endpoints used:
  - [`GET /api/v1/statuses/:id/context`](https://docs.joinmastodon.org/methods/statuses/#context) —
    reply thread of a toot.
  - [`GET /api/v1/peers/search`](https://docs.joinmastodon.org/methods/instance/#peers_search) —
    instance autocomplete (used by the modal).
  - `GET /authorize_interaction?uri=…` — web UI for replying (not in
    the API docs; see
    [`authorize_interactions_controller.rb`](https://github.com/mastodon/mastodon/blob/main/app/controllers/authorize_interactions_controller.rb)).
  - `GET /share?text=…&title=…&url=…&visibility=…` — web compose UI
    (see [`render_initial_state`](https://github.com/mastodon/mastodon/blob/main/app/helpers/application_helper.rb)
    + [`shares_controller.rb`](https://github.com/mastodon/mastodon/blob/main/app/controllers/shares_controller.rb)).
  - [`remote_interaction_helper.ts`](https://github.com/mastodon/mastodon/blob/main/app/javascript/entrypoints/remote_interaction_helper.ts) —
    client-side FEP-3b86 resolution pattern used by Mastodon's
    official interaction modal (reference implementation).
- [Misskey — Share Form](https://misskey-hub.net/docs/for-users/features/share-form/) —
  user docs for their `/share` page. Source:
  [`share.vue`](https://github.com/misskey-dev/misskey/blob/develop/packages/frontend/src/pages/share.vue),
  detailing the parameters (`text`, `url`, `title`, `replyUri`,
  `renoteUri`, `visibility`, etc.).
- [Pleroma API docs](https://docs-develop.pleroma.social/backend/development/API/pleroma_api/) —
  Pleroma-specific endpoints.
- [GoToSocial docs](https://docs.gotosocial.org/) — Mastodon-API-compat
  implementation in Go.
- [Akkoma docs](https://docs.akkoma.dev/stable/) — Pleroma fork.

### Other software (partial compat or future contributions)

- [Pixelfed docs](https://docs.pixelfed.org/) — Mastodon-API-compat for
  photo posts.
- [Sharkey](https://activitypub.software/TransFem-org/Sharkey) —
  Misskey fork; inherits the family conventions.
- [Iceshrimp](https://iceshrimp.dev/), [Firefish](https://joinfirefish.org/) —
  other Misskey forks.

## Code conventions

### Language

- **All code and documentation must be in English.** Only the i18n
  string files under `lang/` keep their target language as their value.

### Style

- ES modules (`import` / `export`), no CommonJS.
- No `default export` — everything is named so `grep` works well.
- Files in `kebab-case.ts` (no camelCase), classes/types in
  `PascalCase`, functions/variables in `camelCase`, constants in
  `UPPER_SNAKE_CASE`.
- One responsibility per file. If a module passes 250 lines, consider
  a split.

### Project name spelling

The project is named **StatiquePouet**. Its written form follows the
standard casing transform of the host context rather than a single
fixed spelling.

| Context                                         | Form              |
|-------------------------------------------------|-------------------|
| Prose, headings, brand mentions                 | `StatiquePouet`   |
| TypeScript class or type                        | `StatiquePouet`   |
| JS / TS function or variable                    | `statiquePouet`   |
| CSS class or id prefix, npm package, kebab file | `statique-pouet`  |
| Directory name, flat slug                       | `statiquepouet`   |

Do not invent intermediate forms (`Statique-pouet`,
`STATIQUE_POUET` outside of a constant, etc.). When adding a new CSS
class, keep the `statique-pouet-*` prefix used in
[`src/classes.ts`](src/classes.ts). When exposing a JS global on
`window`, mirror the existing `window.statiquePouet(action)` pattern.

### Tests

- Every new pure function must ship with a matching test suite under
  `tests/`.
- Test runner: native `node:test`. No external framework.
- Test names use `test('functionName: scenario', …)` and appear in the
  `npm test` output.
- Per-software exceptions (adapters) get a dedicated test file under
  `tests/adapters/<network>.test.ts`.

### Strict TypeScript

- No `any`. Use `unknown` + a guard.
- No double cast (`as unknown as X`). Almost always a modelling
  problem.
- Prefer **discriminated unions** (`{ ok: true; … } | { ok: false; … }`)
  over "all fields optional" objects that force non-null assertions.
- Non-null assertions (`x!`) are **allowed** when the invariant is
  documented in a comment (e.g. `m[1]!` after a regex match where
  group 1 is guaranteed by the pattern).
- A clean type-check is required before pushing: `npm run typecheck`.

### Comments

- Describe the **why**, not the **what** (the code already says what
  it does).
- File-header comments (`// Foo: bar`) summarise the module's
  responsibility in 1–3 lines.
- Use JSDoc (`/** */`) only when the contract goes beyond the TS
  signature (edge cases, side effects, historical context).

## Adding support for another fediverse software

If you discover that a piece of software uses a different URL
convention for reply/share intents, **do not** add conditions inside
`adapters/default.ts`. Instead:

1. Create `src/adapters/<network>.ts` exporting:
   - a `<Network>Adapter` object conforming to
     [`IntentAdapter`](src/adapters/types.ts);
   - **one or both** detection functions, depending on what the
     software actually advertises:
     - `is<Network>JRD(jrd: JRD): boolean` — when the software exposes
       an instance-actor webfinger with a recognizable template (path
       suffix, query-string shape, etc.).
     - `is<Network>Software(name: string): boolean` — when the
       software is identifiable by its nodeinfo `software.name`. This
       is the reliable signal for any server that doesn't publish an
       instance actor (Misskey-family does not — query the live
       webfinger before assuming).
2. Register the adapter in `EXCEPTIONS` inside
   [`src/adapters/finder.ts`](src/adapters/finder.ts), wiring each
   detector you provide to its respective field (`detectFromJRD`,
   `detectFromSoftware`).
3. Add `tests/adapters/<network>.test.ts` covering:
   - reply/share URL construction for typical cases;
   - each detector against a positive sample and several negative
     samples (Mastodon, Pleroma, other Misskey forks if relevant).
4. Add a **live end-to-end test** in
   `tests/live/<network>.live.test.ts` that calls `resolveReplyUrl`
   against the actual instance and asserts on the URL produced.
   Unit tests with hand-crafted JRDs don't catch dispatch regressions
   (e.g. a 404 on the real webfinger endpoint).
5. Document the convention in the new file's header comment with a
   link to the official source (spec or code).
6. Update the "Per-software compatibility" table in the README.

## Contribution cycle

1. Fork, create a descriptive branch (`feat/peertube-adapter`,
   `fix/sanitize-malformed-tags`).
2. Code following the conventions above.
3. Run locally: `npm run typecheck && npm test && npm run build`.
   All three must pass.
4. If you change an endpoint, URL or schema: cite the source in a
   comment (URL of doc, source-code line, etc.) — otherwise the diff
   will get pushback in review.
5. If you change architecture (module split, public-surface rename,
   new pattern): **open an issue to discuss first**, no surprise PRs.
6. Update the README and related docs in the same commit.
7. Open a PR/MR with a description focused on **why**, not just what.

## License

The project is released into the public domain via the
[Unlicense](UNLICENSE) the ethical position behind that choice is
spelled out in the file's preamble.

By submitting a contribution code, documentation, tests, anything.
You accept the contributor terms in [PATENTS](PATENTS): your
contribution is dedicated to the public domain on the same terms,
copyright and patent claims included. The act of committing to this
repository is the act of acceptance of those terms.
