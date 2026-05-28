# StatiquePouet

Comment system for static sites, built on the conventions of the
**fediverse** ecosystem (Mastodon and related software).
Written in strict **TypeScript**, compiled to a single minified ESM
bundle (~14 KB) with **esbuild**. No backend, no OAuth.

At page load, **nothing** is downloaded. On the first button click, the
`dist/comments.min.js` bundle is imported dynamically.

## Quick start (no dev background needed)

If you have a static website (a blog, a personal page, anything you
publish as plain HTML files) and a Mastodon-compatible account
(Mastodon, Pleroma, Akkoma…), you can add a comment section to a page
in three steps.

### 1. Post on your fediverse account

Write a short post on your account announcing the article. Something
like:

> *Just published: "How I learned to stop worrying and love static
> sites". <https://my-blog.example/static-love>*

Then **copy the URL of that post** from your browser's address bar.
It looks like `https://your-instance.example/@you/123456789012345678`.

### 2. Put the project files on your website

- Grab the latest release of StatiquePouet
  (or clone the repo and run `npm install && npm run build` if you're
  comfortable with that).
- Copy the `dist/` folder and the `lang/` folder onto your website,
  for example under `/statiquepouet/`. After that you should have at
  least `/statiquepouet/dist/comments.min.js` and
  `/statiquepouet/lang/en.json` reachable from the web.

### 3. Add the snippet to your article

In the HTML of the page where you want comments, paste this and replace
the URL on the first line with the one you copied at step 1.

```html
<meta name="fediverse-context"
      content="https://your-instance.example/@you/123456789012345678">

<button type="button" onclick="statiquePouet('loadComments')">Load comments</button>
<button type="button" onclick="statiquePouet('postComment')">Reply</button>
<button type="button" onclick="statiquePouet('shareArticle')">Share</button>

<div id="comments-content"></div>

<script>
  window.STATIQUE_POUET_CONFIG = {
    commentsContainerId: 'comments-content',
    basePath: '/statiquepouet/',
  };
  window.statiquePouet = function (action) {
    return (window._sp ||= import(STATIQUE_POUET_CONFIG.basePath + 'dist/comments.min.js'))
      .then(function (m) { return m[action](); });
  };
</script>
```

That's it. When a reader clicks **Load comments**, they see all the
replies to your original post on the fediverse. When they click
**Reply**, they're sent to their own instance with the compose window
open, ready to post their reply.

### Costs and requirements

- **No subscription, no API key, no server to run.** Just static files.
- **Reading comments**: no account needed, anyone can read.
- **Posting comments**: the reader needs a fediverse account
  (Mastodon, Pleroma, Akkoma, Misskey, etc.).
- **Hosting the anchor post**: needs to be on a Mastodon-API-compatible
  server (Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed, Friendica).
  See [Per-software compatibility](#per-software-compatibility) for
  the full list.

The rest of this document is more technical. If you just wanted to add
comments, you're done. Keep reading only if you want to customize
behaviour, styling, or contribute.

## Technical contracts

The project **does not implement** the [ActivityPub](https://www.w3.org/TR/activitypub/)
protocol itself (which is a federated server-to-server protocol with an
authenticated client-to-server profile). It builds on **two
ecosystem-level conventions** generally honoured by microblog fediverse
software:

| Function | Technical contract | Implemented by |
|---|---|---|
| **Read** comments | `GET /api/v1/statuses/:id/context` (Mastodon Client API) | Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed, Friendica, Hometown, glitch-soc |
| **Post** a reply / share | `GET /.well-known/webfinger` ([RFC 7033](https://www.rfc-editor.org/rfc/rfc7033)) + [FEP-3b86](https://w3id.org/fep/3b86) intent templates, with legacy OStatus + Mastodon `/authorize_interaction` fallbacks. For software that doesn't expose an instance-actor webfinger (Misskey-family), `GET /.well-known/nodeinfo` identifies the server by `software.name` and dispatches to a dedicated adapter | Near-universal across microblogging servers |

If the instance hosting the anchor post exposes the first endpoint,
StatiquePouet can read its replies. For writing, the
**[adapter layer](#architecture-adapter-layers)** automatically routes
to the right URL convention depending on the software detected on the
user's side. When no signal lands the user on a supported microblog
server, the modal surfaces an inline "not a supported fediverse
microblogging server" message so the user can retype.

See [Per-software compatibility](#per-software-compatibility) further
down for the detailed breakdown of what works and what doesn't.

## Principle

Each page declares its anchor post in the `<head>`, as the URL shown in
the browser address bar:

```html
<meta name="fediverse-context" content="https://mastodon.social/@Mastodon/116489457177711947">
```

The site author places two or three plain HTML buttons wherever they
want, with an `onclick` that calls the small `statiquePouet(action)`
function. That function (4 lines) has a single job: dynamically import
`comments.min.js` on the first call, then delegate to the requested
action.

The script extracts the instance to query and the status ID from the
URL. Several common fediverse URL formats are accepted:

- `https://instance/@user/123` (Mastodon-like canonical URL)
- `https://instance/@user@other-instance/123` (federated view)
- `https://instance/users/user/statuses/123` (ActivityPub URI)
- `https://instance/notice/AbCdEf` (Pleroma or Akkoma form)
- `https://instance/@user/statuses/01H…` (GoToSocial form, ULID)

The instance queried for `/context` is **the one in the pasted URL**,
and the ID used is the one that appears there. Just paste what you see
when viewing the post.

## Minimal integration

Copy-paste into any static page:

```html
<meta name="fediverse-context" content="https://mastodon.social/@Mastodon/116489457177711947">

<button type="button" onclick="statiquePouet('loadComments')">Load comments</button>
<button type="button" onclick="statiquePouet('postComment')">Reply</button>
<button type="button" onclick="statiquePouet('shareArticle')">Share</button>

<div id="comments-content"></div>

<script>
  window.STATIQUE_POUET_CONFIG = {
    commentsContainerId: 'comments-content',
    lang: 'en',
    basePath: '/statiquepouet/',
  };
  window.statiquePouet = function (action) {
    return (window._sp ||= import(STATIQUE_POUET_CONFIG.basePath + 'dist/comments.min.js'))
      .then(function (m) { return m[action](); });
  };
</script>
```

That's it. No JavaScript is downloaded before the user clicks one of
the buttons.

## Available actions

| Action | Effect |
|--------|--------|
| `statiquePouet('loadComments')` | Reads the `fediverse-context` meta tag, queries `/api/v1/statuses/:id/context` on the source instance, and renders the reply tree into `commentsContainerId`. |
| `statiquePouet('postComment')` | Opens the instance modal (pre-filled and editable, with live autocomplete via `/api/v1/peers/search`). Resolution goes through the [layered dispatcher](#architecture-adapter-layers): webfinger [FEP-3b86](https://w3id.org/fep/3b86) `Object` template → legacy OStatus `subscribe` → Misskey-family detection via nodeinfo → Mastodon API capability probe with `/authorize_interaction?uri=…` fallback. If none match, the modal stays open and surfaces an inline error so the user can retype. Otherwise opens the result in a new tab. The post created is a **real ActivityPub reply** that appears in the thread on next reload. |
| `statiquePouet('shareArticle')` | **Same modal and dispatch** as `postComment`, but resolving the FEP-3b86 `Create` template (compose intent) with `/share?text=…` fallback (or `/share?text=…` directly on Misskey-family). Pre-fills the compose form with a mention of the anchor post's author (`@user@instance` when extractable from the URL) plus the page's canonical URL. Creates a **standalone toot**, not a reply, useful for relaying the article on one's own feed. |
| `statiquePouet('clearInstance')` | Forgets the instance stored in this browser (useful to offer an optional "Change instance" button). |

## Configuration

`window.STATIQUE_POUET_CONFIG` must be defined **before** the loader
snippet. Three keys, all optional except `commentsContainerId`:

| Key | Default | Role |
|-----|---------|------|
| `commentsContainerId` | (none) | ID of the div where comments will be injected. |
| `lang` | (auto) | Language code. If absent, falls back to `<html lang>`, then `navigator.language`, then `'en'`. See [Internationalisation](#internationalisation). |
| `basePath` | `'/'` | Path to the project root (used to locate `dist/comments.min.js` and `lang/*.json`). |

## Internationalisation

One language = one JSON file under `lang/`. To add `de.json`, copy
`en.json` and translate it.

**Language resolution chain** (decreasing priority):

1. `window.STATIQUE_POUET_CONFIG.lang`: explicit site override.
2. `<html lang="…">`: document-declared language.
3. `navigator.language`: visitor preference.
4. `'en'`: final default.

A regional code (`fr-FR`, `pt-BR`, `zh_CN`) is reduced to its base
(`fr`, `pt`, `zh`) since the files are named `lang/<base>.json`.

The **button labels** belong to the site author (they live in their
HTML), so they're not in the language files. Only the strings generated
dynamically by the module are (errors, modal, "Reply" / "View original
post" links).

## Styling

**The library ships zero CSS.** No `<style>` element is injected, no
`<link>` is added, no inline `style=""` attribute is set. Every visual
choice, including the modal's appearance and the `::backdrop` dim,
is up to the host page. See [`demo/showcase.html`](demo/showcase.html)
for every selector emitted, rendered live with browser defaults.

The modal is a native
[`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
opened via `dialog.showModal()`. Focus trap, ESC-to-dismiss,
`aria-modal`, background `inert` and focus restoration on close are
provided by the browser. The dim layer behind the modal is the
[`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop)
pseudo-element. There is no library-specific class for it, so target it
via `#statique-pouet-modal::backdrop` in your stylesheet.

Internal show/hide of dynamic UI (inline validation error) uses the
standard HTML
[`hidden` global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden). No library-specific class is emitted for that.

Selectors emitted by the rendering layer:

- **IDs** for unique elements: `#statique-pouet-modal`,
  `#statique-pouet-modal-input`, `#statique-pouet-modal-suggestions`.
  These three carry an `id` because it is functional
  (`label[for]` ↔ `input[list]` wiring, plus `getElementById` lookup).
  The `id` also doubles as the direct style hook for the singleton.
- **Classes** for every other element the rendering layer creates,
  including elements nested inside the dialog (`form`, `h3`, `p`,
  `label`) so that the host stylesheet never has to fall back to
  descendant selectors like `#statique-pouet-modal form { … }`.
  Comments tree:
  `.statique-pouet-comment`, `.statique-pouet-comment-replies`,
  `.statique-pouet-author`, `.statique-pouet-author-link`,
  `.statique-pouet-avatar`, `.statique-pouet-handle`,
  `.statique-pouet-date`, `.statique-pouet-content`,
  `.statique-pouet-actions`. Modal internals:
  `.statique-pouet-modal-content`, `.statique-pouet-modal-title`,
  `.statique-pouet-modal-description`, `.statique-pouet-modal-form`,
  `.statique-pouet-modal-label`, `.statique-pouet-modal-buttons`,
  `.statique-pouet-modal-cancel`, `.statique-pouet-modal-submit`.
  See [`src/classes.ts`](src/classes.ts) for the canonical list.
  Datalist `<option>`s carry no class because the dropdown is
  UA-drawn and never enters the CSS cascade.

- **Message boxes** (loading, empty thread, errors) share a common
  `.statique-pouet-alert` class plus a type variant plus the historical
  semantic class:

  | Case | Classes applied |
  |---|---|
  | Load error, post not found, invalid instance | `statique-pouet-alert statique-pouet-alert-error statique-pouet-error` |
  | Loading indicator | `statique-pouet-alert statique-pouet-alert-info statique-pouet-loading` |
  | "No comments yet" | `statique-pouet-alert statique-pouet-alert-info statique-pouet-empty` |

  Style the general look on `.statique-pouet-alert` (padding, border,
  background, font), differentiate by severity on
  `.statique-pouet-alert-error` / `-info`, or target a precise case via
  the semantic class.

The instance autocomplete is a native
[`<datalist>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist)
linked to the input via its `list` attribute. The dropdown UI (popup,
keyboard navigation, accessibility, match highlighting) is
browser-controlled and intentionally not stylable beyond what each
browser allows. That's the trade for getting the standard behaviour
for free.

For a complete visual reference of every selector the library emits,
plus a copy-pasteable sample theme to fork as a starting point, open
[`demo/showcase.html`](demo/showcase.html). It's a static, self-contained
page (no JavaScript required) showing each component rendered live next
to its source HTML, same idea as a markdown style guide.

A smaller styling example used by the interactive demo lives in
[`demo/index.html`](demo/index.html).

## Architecture: adapter layers

Writing (reply / share) takes a different path depending on the user's
software, because each fediverse family has its own intent URL
convention. To avoid scattering `if (misskey) …` checks across the
code, the library uses a **strategy pattern** with a layered probe:

```
intent.ts (dispatcher)
   │
   ├─ 1. webfinger (instance actor)     ─ Mastodon-family advertises
   │      ?resource=https://<instance>    FEP-3b86 / OStatus templates
   │      → adapters/finder.findAdapter(jrd)
   │
   ├─ 2. nodeinfo (software identity)   ─ Misskey-family 404s on the
   │      /.well-known/nodeinfo           instance-actor webfinger; its
   │      → adapters/finder.findAdapterBySoftware(name)
   │
   └─ 3. Mastodon API capability probe  ─ confirms /authorize_interaction
          /api/v1/instance                 / /share fallback will resolve
          → DefaultAdapter or UnsupportedInstanceError
```

Each step can short-circuit the chain when it lands on a non-default
adapter. The default adapter is only used after all signals agree the
instance speaks the Mastodon Client API surface.

- **`adapters/default.ts`**: Mastodon-family resolver. FEP-3b86
  `Object` or `Create` from the JRD when present, falling back to legacy
  OStatus subscribe (when not follow-only), then to a hand-built
  `/authorize_interaction?uri=…` or `/share?text=…`. Covers Mastodon,
  Pleroma/Akkoma, GoToSocial, Pixelfed, Friendica.
- **`adapters/misskey.ts`**: exception for the Misskey family
  (Misskey, Sharkey, Iceshrimp, Firefish, Foundkey, Calckey). Uses
  `/share?replyUri=…` and `/share?text=…` instead of the FEP-3b86
  templates. Detected from **either** the webfinger JRD signature
  (`authorize-follow` in the OStatus template) **or** the nodeinfo
  `software.name` field. Misskey doesn't expose an instance-actor
  webfinger, so nodeinfo is the signal that actually fires in practice.
- **`adapters/finder.ts`**: two-pronged dispatcher.
  `findAdapter(jrd)` walks the exceptions' `detectFromJRD` checks.
  `findAdapterBySoftware(name)` walks the `detectFromSoftware` checks.

When all three steps fail to land on a microblogging adapter, the
dispatcher throws `UnsupportedInstanceError`, caught by the modal,
which surfaces it inline so the user can retype another domain
(common case: typing a Lemmy, PeerTube, or Mobilizon instance).

**To add support for another piece of software:**

1. Create `src/adapters/<network>.ts` exporting a `<Network>Adapter`
   conforming to `IntentAdapter`, plus the detection functions that
   apply: `is<Network>JRD(jrd)` and/or `is<Network>Software(name)`.
   Provide both when feasible. Nodeinfo (`Software`) is the reliable
   one for software that doesn't expose an instance actor.
2. Register it in `EXCEPTIONS` (`src/adapters/finder.ts`) with the
   detectors it provides.
3. Add `tests/adapters/<network>.test.ts` and, ideally, a live end-to-end
   test in `tests/live/<network>.live.test.ts` that exercises
   `resolveReplyUrl` against the real instance. That is the test that
   catches dispatch regressions (a unit test with a hand-crafted JRD
   doesn't notice when the actual instance 404s on webfinger).

No change to `intent.ts` or `actions.ts` is required.

## Per-software compatibility

### Anchor post host (`/context`)

The URL in `<meta name="fediverse-context">` must point at software
exposing `/api/v1/statuses/:id/context`:

| Software | `/context` | URL ID format |
|---|---|---|
| Mastodon + forks (Hometown, glitch-soc) | ✅ | numeric snowflake |
| Pleroma / Akkoma | ✅ | alphanumeric FlakeID |
| GoToSocial | ✅ | alphanumeric ULID |
| Pixelfed | ✅ | numeric |
| Friendica | ✅ | via compat layer |
| Misskey / Sharkey / Iceshrimp / Firefish | ❌ | endpoint absent (own API at `/api/notes/*`) |
| Hubzilla, Plume, WriteFreely | ⚠️ | partial or absent |
| Lemmy, PeerTube, BookWyrm, Mobilizon | ❌ | different content model |

The URL parser accepts alphanumeric + `_` + `-`, so all the known ID
formats of the microblog fediverse pass.

### Origin of displayed replies

**Anywhere on the federation.** When a user on Misskey, Akkoma,
Pixelfed, etc. replies to the anchor post, their reply federates to the
instance hosting the post and shows up in `/context`. ActivityPub
federation does all the work server-side. A user on software not listed
in the table above (which therefore can't *host* the anchor post) can
still *reply* to a Mastodon-hosted anchor from their client.

### Posting a reply / share

Adapter selected by the layered dispatcher in `intent.ts`. Webfinger
signature is checked first, then nodeinfo software identity, then a
Mastodon API capability probe before falling back to the default adapter.

| User's software | Dispatch signal | Adapter | URL generated for reply | URL generated for share |
|---|---|---|---|---|
| Recent Mastodon | webfinger has FEP-3b86 Object | `default` | `…/authorize_interaction?uri=<post>` (via FEP-3b86 Object) | `…/share?text=<text>` (via FEP-3b86 Create) |
| Older Mastodon | webfinger has OStatus only | `default` | `…/authorize_interaction?uri=<post>` (legacy OStatus or fallback) | `…/share?text=<text>` |
| Pleroma / Akkoma | webfinger has OStatus | `default` | `…/ostatus_subscribe?acct=<post>` (OStatus accepts URIs) | `…/share?text=<text>` (Pleroma has `/share` too) |
| GoToSocial | webfinger + Mastodon API probe | `default` | `…/authorize_interaction?uri=<post>` (fallback) | `…/share?text=<text>` |
| Misskey / Sharkey / Iceshrimp / Firefish | nodeinfo `software.name` | `misskey` | `…/share?replyUri=<post>` (fetches the remote post via their `ap/show` API) | `…/share?text=<text>` |
| PeerTube, Lemmy, BookWyrm, Mobilizon, WriteFreely | none of the above | (none) | `UnsupportedInstanceError` surfaced inline in the modal | same |

### Fundamental limits

Having a fediverse account isn't always enough to reply to a microblog
post. **PeerTube** (video platform), **Lemmy** (forum), **BookWyrm**
(books), **Mobilizon** (events) don't have a UI dedicated to microblog
reply composition. Their content model is different. StatiquePouet
cannot work around that. The user must use an account on microblog
software (Mastodon, Pleroma, Akkoma, Misskey…) to comment.

## Build & development

The sources are in **strict TypeScript**. Production = single
minified ESM bundle served at `dist/comments.min.js`.

```bash
npm install         # installs esbuild + typescript + @types/node (devDeps only)
npm run build       # → dist/comments.min.js (~14 KB, production, minified)
npm run build:dev   # → dist/comments.js with sourcemap (debug)
npm run typecheck   # tsc --noEmit
npm test            # compiles tests + node --test
npm run clean       # cleans dist/ and build-test/
```

### Source layout

```
src/
├── index.ts        # public API (loadComments, postComment, shareArticle, clearInstance)
├── types.ts        # shared interfaces + FEP-3b86 constants (Object, Create, OStatus)
├── parse.ts        # parseTootUrl, normalizeInstance, isValidInstance, extractAuthorHandle
├── urls.ts         # builders: /context, /authorize, /peers/search, webfinger, /share, nodeinfo
├── jrd.ts          # findTemplateLink, buildIntentUrl (pure JRD/webfinger helpers)
├── intent.ts       # layered dispatcher: webfinger → nodeinfo → Mastodon API probe;
│                   #   exports UnsupportedInstanceError thrown when none match
├── adapters/
│   ├── types.ts    # IntentAdapter interface
│   ├── default.ts  # DefaultAdapter (FEP-3b86 + OStatus + /authorize_interaction)
│   ├── misskey.ts  # MisskeyAdapter + isMisskeyJRD + isMisskeySoftware
│   │               #   (Misskey-family /share?replyUri=… via webfinger OR nodeinfo)
│   └── finder.ts   # findAdapter(jrd), findAdapterBySoftware(name): dual-signal registry
├── threading.ts    # buildTree (reply tree reconstruction)
├── sanitize.ts     # HTML tokenizer + tag/attribute allowlist
├── date.ts         # formatRelativeDate (Intl.RelativeTimeFormat)
├── lang.ts         # resolveLang + format() for i18n
├── classes.ts      # CSS IDs and class names (stylable contract)
├── storage.ts      # tolerant localStorage wrapper
├── state.ts        # ensureInit + config + strings + locale
├── render.ts       # DOM rendering (alerts, tree, comments)
├── modal.ts        # showInstanceModal + /peers/search autocomplete
└── actions.ts      # public action orchestration (reuses the modal)
```

Pure functions (parse, urls, jrd, threading, sanitize, date, lang)
are **all exported and tested** without any DOM dependency.
Adapters are tested in isolation (`tests/adapters/*.test.ts`) with
hand-crafted JRDs that simulate each piece of software.

## Tests

```bash
npm test
```

Covers:

- **Pure functions**: meta tag parsing, author handle extraction, URL
  builders (`/context`, `/authorize_interaction`, `/peers/search`,
  webfinger, `/share`), HTML sanitisation (XSS via `<script>`,
  `<img onerror>`, `javascript:`, `data:`, etc.), reply-tree
  construction, FEP-3b86 intent resolution (`Object` for reply,
  `Create` for share), language resolution, i18n formatting.
- **Adapter dispatch** ([`tests/adapters/`](tests/adapters/)): each
  adapter's URL building, detection functions, and the `findAdapter`
  dispatcher are tested in isolation with hand-crafted JRDs.
- **Live integration tests per software** ([`tests/live/`](tests/live/)):
  for every fediverse software whose support we claim, one test file
  hits a real public instance and validates the contracts end-to-end.
  Each test skips gracefully if the network is unreachable. It never
  fails on an air-gapped CI.

  | Software | Instance used | What is validated live |
  |---|---|---|
  | Mastodon | `mastodon.social` (canonical) | webfinger + adapter routing + `/context` on a trending status |
  | Pleroma | `udongein.xyz` (public Pleroma 2.6.x) | webfinger + adapter routing + `/context` on a local status |
  | Akkoma | `blob.cat` (public Akkoma) | `/api/v1/instance` exposes Akkoma + webfinger + adapter routing |
  | GoToSocial | `gts.superseriousbusiness.org` (project team) | `/api/v1/instance` exposes GoToSocial + webfinger + adapter routing |
  | Pixelfed | `pixelfed.social` (canonical) | `/api/v1/instance` exposes Pixelfed + webfinger + adapter routing |
  | Misskey | `misskey.io` (original flagship) | webfinger contains the Misskey `authorize-follow` signature + `findAdapter` routes to `MisskeyAdapter` |

  Pleroma, Akkoma, and Misskey have no canonical project-run
  flagship instance, so a stable community instance is used as a
  reasonable proxy.

**115 tests** (8 live, 31 on adapters).

## Demo

```bash
python3 -m http.server
```

Then open `http://localhost:8000/demo/index.html`. `file://` URLs
don't work (CORS on ES modules).

## Contributing

- 👤 **Humans**: see [`CONTRIBUTING.md`](CONTRIBUTING.md) (philosophy,
  conventions, process, external doc links).
- 🤖 **AI assistants and agentic tools** (Claude Code, Cursor, Windsurf, …): 
  see [`AGENTS.md`](AGENTS.md) (mandatory behaviour rules).

## License

Public domain via the [Unlicense](UNLICENSE). The choice is ethical,
not a convenience: part of this code was produced with AI tools whose
training corpora harvested uncompensated human work: code,
documentation, drafts, protocols. Dedicating the output to the public
domain returns it to the commons those corpora drew from in the first
place. Read the [UNLICENSE](UNLICENSE) preamble for the full position
behind that choice.

Contributors are asked to make the same dedication on their own
contributions. See [PATENTS](PATENTS).
