# StatiquePouet

Comments on your static site, hosted on the fediverse like a Mastodont instance, with no backend of your own.

You publish an article. You write a short post about it on your fediverse account, whichever software you happen to use. You paste that post's URL into your page. From then on, every reply people send to your post shows up under your article as a comment. When a reader wants to chime in, they click a button and land in their own fediverse account with the reply box already open.

That is it. No database, no sign-up, no server to babysit, no comment table to back up, no spam queue to moderate at 2am. The conversation already lives on the fediverse, you are just showing it on your page. And nothing is even downloaded until a reader clicks: at page load the cost is almost zero.

The working example is live at <https://statiquepouet.gitlab.iglou.eu/>. Its source is [`demo/index.html`](demo/index.html), one self-contained file with the whole integration in it. To run it locally, `make serve` then open `http://localhost:8000/demo/index.html`.

## Ready-to-use integrations

If your site runs on a known static-site generator, you should not have to copy-paste anything. Drop in the integration for your stack, point an article at a fediverse post, done.

- **Hugo**: [statiquepouet-hugo](https://gitlab.com/iglou.eu/statiquepouet-hugo). with optional auto-announce tool that posts new toot and writes URL back into your front matter.

And if you really cannot be bothered, host nothing at all. The build is already online: the script (`https://statiquepouet.gitlab.iglou.eu/dist/comments.min.js`) and both themes (`statique-pouet-light.min.css`, `statique-pouet-dark.min.css`) are served from there. Point `basePath` at `https://statiquepouet.gitlab.iglou.eu/`, paste the snippet below, done. The catch: you are pinned to upstream, so if it moves or goes down, your comments go with it. For anything you care about, host the files yourself.

Everything below is for wiring it by hand, or for understanding what happens under the hood.

## Adding it by hand

Two things go on your page: a `<meta>` tag naming the post, and a few plain HTML buttons. Copy this into any static page and you are done.

```html
<head>
  <meta name="fediverse-context" content="https://mastodon.social/@Mastodon/116489457177711947">
</head>
<body>
  <button type="button" onclick="statiquePouet('loadComments')">Load comments</button>
  <button type="button" onclick="statiquePouet('postComment')">Reply</button>
  <button type="button" onclick="statiquePouet('shareArticle')">Share</button>

  <div id="comments-content"></div>

  <script>
    window.STATIQUE_POUET_CONFIG = {
      commentsContainerId: 'comments-content',
      lang: 'en',
      basePath: 'https://statiquepouet.gitlab.iglou.eu/',
    };
    window.statiquePouet = function (action) {
      return (window._sp ||= import(STATIQUE_POUET_CONFIG.basePath + 'dist/comments.min.js'))
        .then(function (m) { return m[action](); });
    };
  </script>
</body>
```

As written, `basePath` points at the online build, so this works as-is, nothing to install. To self-host instead, grab a release (or clone and run `npm install && npm run build`), copy `dist/` and `lang/` onto your site, and point `basePath` at them. The four-line loader does one job: dynamically import `comments.min.js` on the first click, then call the requested action.

## Configuration

`window.STATIQUE_POUET_CONFIG` must exist **before** the loader runs. Only `commentsContainerId` is required.

| Key | Default | Role |
|-----|---------|------|
| `commentsContainerId` | (none) | ID of the div where comments are injected. |
| `lang` | (auto) | Language code. See [Languages](#languages). |
| `basePath` | `'/'` | Path to the project root, used to find `dist/comments.min.js` and `lang/*.json`. |

## Actions

| Action | Effect |
|--------|--------|
| `statiquePouet('loadComments')` | Reads the meta tag, fetches the reply tree from the source instance, renders it into your container. |
| `statiquePouet('postComment')` | Opens the instance modal, then sends the reader to their own server to post a **real reply** that shows up in the thread on the next reload. |
| `statiquePouet('shareArticle')` | Same modal, but composes a **standalone post** mentioning your article and its author, useful for relaying it on one's own feed. |
| `statiquePouet('clearInstance')` | Forgets the instance this browser remembered, handy behind an optional "Change instance" button. |

The modal pre-fills the reader's instance and offers live autocomplete. If what they type is not a fediverse microblog server, the modal stays open with an inline message so they can retype. Where their server is resolved is explained in [Adapter architecture](#adapter-architecture).

## The post URL

Each page names its anchor post in the `<head>`, exactly as the URL appears in your browser's address bar:

```html
<meta name="fediverse-context" content="https://mastodon.social/@Mastodon/116489457177711947">
```

The script reads the instance and the status ID straight out of that URL, so you just paste what you see when looking at the post. Several common fediverse URL shapes are understood:

- `https://instance/@user/123` (canonical handle form)
- `https://instance/@user@other-instance/123` (federated view)
- `https://instance/users/user/statuses/123` (ActivityPub URI)
- `https://instance/notice/AbCdEf` (Pleroma, Akkoma)
- `https://instance/@user/statuses/01H…` (GoToSocial, ULID)

The instance queried for replies is the one in the pasted URL, and the ID used is the one shown there.

## Styling

**The library ships zero forced CSS.** No `<style>` is injected, no `<link>` added, no inline `style=""` set. Every visual choice is yours, including the modal and its backdrop dim. For a live catalogue of every selector emitted, with a copy-pasteable sample theme to fork, open [`demo/showcase.html`](demo/showcase.html). It is a static page, no JavaScript, each component rendered next to its source HTML.

The modal is a native [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) opened with `showModal()`, so the focus trap, ESC-to-close, `aria-modal`, background `inert` and focus restoration come from the browser. The dim layer is the [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop) pseudo-element, target it via `#statique-pouet-modal::backdrop`. Showing and hiding dynamic UI uses the standard [`hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden) attribute. The instance autocomplete is a native [`<datalist>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist), its dropdown drawn by the browser and not stylable beyond what each browser allows, that is the trade for getting the behaviour for free.

Selectors the rendering layer emits:

- **IDs** for the three functional singletons: `#statique-pouet-modal`, `#statique-pouet-modal-input`, `#statique-pouet-modal-suggestions`. They carry an `id` because it is wired (`label[for]` ↔ `input[list]`, `getElementById`), and it doubles as the style hook.
- **Classes** for everything else, including elements nested inside the dialog, so your stylesheet never has to fall back to descendant selectors. Comments tree: `.statique-pouet-comment`, `.statique-pouet-comment-replies`, `.statique-pouet-author`, `.statique-pouet-author-link`, `.statique-pouet-avatar`, `.statique-pouet-handle`, `.statique-pouet-date`, `.statique-pouet-content`, `.statique-pouet-actions`. Modal: `.statique-pouet-modal-content`, `.statique-pouet-modal-title`, `.statique-pouet-modal-description`, `.statique-pouet-modal-form`, `.statique-pouet-modal-label`, `.statique-pouet-modal-buttons`, `.statique-pouet-modal-cancel`, `.statique-pouet-modal-submit`. The canonical list is [`src/classes.ts`](src/classes.ts).
- **Message boxes** (loading, empty thread, errors) share `.statique-pouet-alert` plus a severity variant plus a semantic class:

  | Case | Classes applied |
  |---|---|
  | Load error, post not found, invalid instance | `statique-pouet-alert statique-pouet-alert-error statique-pouet-error` |
  | Loading indicator | `statique-pouet-alert statique-pouet-alert-info statique-pouet-loading` |
  | "No comments yet" | `statique-pouet-alert statique-pouet-alert-info statique-pouet-empty` |

  Style the common look on `.statique-pouet-alert`, differentiate by severity on `-error` / `-info`, or target a precise case via the semantic class.

## Languages

One language is one JSON file under [`lang/`](lang/). `en.json` is the source of truth, the others (`de`, `es`, `fr`, `it`, `ja`, `nl`, `pt`) mirror its keys. To add one, copy `en.json` and translate it. Add or rename a key in `en.json` first, then propagate.

The language is resolved in this order, first match wins:

1. `STATIQUE_POUET_CONFIG.lang`, your explicit override.
2. `<html lang="…">`, the document's declared language.
3. `navigator.language`, the visitor's preference.
4. `'en'`, the final default.

A regional code (`fr-FR`, `pt-BR`, `zh_CN`) is reduced to its base (`fr`, `pt`, `zh`) since files are named `lang/<base>.json`.

Only the strings the module generates are translated (errors, modal, the "Reply" and "View original post" links). The **button labels live in your HTML**, so they are yours, not in the language files.

## Reading and writing

StatiquePouet does **not** implement [ActivityPub](https://www.w3.org/TR/activitypub/) itself. It rides on two ecosystem conventions that microblog fediverse software honours almost universally, no single implementation privileged.

| Function | Contract |
|---|---|
| **Read** comments | `GET /api/v1/statuses/:id/context`, the client API surface shared across the microblog fediverse. |
| **Post** a reply or share | `GET /.well-known/webfinger` ([RFC 7033](https://www.rfc-editor.org/rfc/rfc7033)) plus [FEP-3b86](https://w3id.org/fep/3b86) intent templates, with legacy OStatus and `/authorize_interaction` fallbacks. For software with no instance-actor webfinger (the Misskey family), `GET /.well-known/nodeinfo` identifies the server by `software.name`. |

Reading is the easy half: fetch `/context` on the instance the meta URL points at, then [src/threading.ts](src/threading.ts) rebuilds the reply tree and [src/render.ts](src/render.ts) emits the DOM. Writing is where the families diverge, which is what the adapter layer handles.

## Adapter architecture

Each fediverse family has its own intent-URL convention for "open a reply box". Rather than scattering `if (misskey)` checks around, the dispatcher in [src/intent.ts](src/intent.ts) probes the reader's server in three layers and stops at the first that lands on a real microblog server.

```
intent.ts (dispatcher)
   │
   ├─ 1. webfinger (instance actor)      ─ families that advertise
   │      → adapters/finder.findAdapter(jrd)      FEP-3b86 / OStatus templates
   │
   ├─ 2. nodeinfo (software identity)    ─ families that 404 on the
   │      → finder.findAdapterBySoftware(name)     instance-actor webfinger
   │
   └─ 3. capability probe                 ─ confirms the fallback resolves
          → DefaultAdapter or UnsupportedInstanceError
```

- [`adapters/default.ts`](src/adapters/default.ts): the generic resolver. FEP-3b86 `Object` / `Create` from the JRD when present, then legacy OStatus subscribe, then a hand-built `/authorize_interaction?uri=…` or `/share?text=…`. Covers Mastodon, Pleroma/Akkoma, GoToSocial, Pixelfed, Friendica.
- [`adapters/misskey.ts`](src/adapters/misskey.ts): the Misskey family (Misskey, Sharkey, Iceshrimp, Firefish, Foundkey, Calckey). Uses `/share?replyUri=…` and `/share?text=…`. Detected from the webfinger signature **or** the nodeinfo `software.name`, and since Misskey exposes no instance-actor webfinger, nodeinfo is the signal that actually fires.
- [`adapters/finder.ts`](src/adapters/finder.ts): the registry. `findAdapter(jrd)` walks each adapter's `detectFromJRD`, `findAdapterBySoftware(name)` walks each `detectFromSoftware`.

When all three layers fail to land on a microblog adapter, the dispatcher throws `UnsupportedInstanceError`, the modal catches it and surfaces it inline (the common case being someone typing a Lemmy, PeerTube or Mobilizon domain).

**To support another piece of software:**

1. Create `src/adapters/<network>.ts` exporting a `<Network>Adapter` conforming to `IntentAdapter`, plus the detectors that apply, `is<Network>JRD(jrd)` and/or `is<Network>Software(name)`. Nodeinfo is the reliable one for software with no instance actor.
2. Register it in `EXCEPTIONS` in [src/adapters/finder.ts](src/adapters/finder.ts).
3. Add `tests/adapters/<network>.test.ts` and, ideally, `tests/live/<network>.live.test.ts` exercising `resolveReplyUrl` against the real instance. That live test is the one that catches dispatch regressions a hand-crafted JRD never notices.

No change to `intent.ts` or `actions.ts` is needed.

## Per-software compatibility

### Hosting the anchor post

The `<meta name="fediverse-context">` URL must point at software exposing `/api/v1/statuses/:id/context`.

| Software | `/context` | URL ID format |
|---|---|---|
| Mastodon + forks (Hometown, glitch-soc) | ✅ | numeric snowflake |
| Pleroma / Akkoma | ✅ | alphanumeric FlakeID |
| GoToSocial | ✅ | alphanumeric ULID |
| Pixelfed | ✅ | numeric |
| Friendica | ✅ | via compat layer |
| Misskey / Sharkey / Iceshrimp / Firefish | ❌ | own API at `/api/notes/*` |
| Hubzilla, Plume, WriteFreely | ⚠️ | partial or absent |
| Lemmy, PeerTube, BookWyrm, Mobilizon | ❌ | different content model |

### Where the replies come from

**Anywhere on the federation.** When someone on Misskey, Akkoma, Pixelfed or anything else replies to your post, it federates to the instance hosting the post and turns up in `/context`. ActivityPub does the work server-side. Even a user on software that cannot itself host an anchor post can still reply to one.

### Posting a reply or share

The adapter is chosen by the layered dispatcher above.

| Reader's software | Signal | Adapter | Reply URL | Share URL |
|---|---|---|---|---|
| FEP-3b86 capable | webfinger FEP-3b86 Object | `default` | `…/authorize_interaction?uri=` | `…/share?text=` |
| OStatus only | webfinger OStatus | `default` | `…/authorize_interaction?uri=` | `…/share?text=` |
| Pleroma / Akkoma | webfinger OStatus | `default` | `…/ostatus_subscribe?acct=` | `…/share?text=` |
| GoToSocial | webfinger + capability probe | `default` | `…/authorize_interaction?uri=` | `…/share?text=` |
| Misskey family | nodeinfo `software.name` | `misskey` | `…/share?replyUri=` | `…/share?text=` |
| PeerTube, Lemmy, BookWyrm, Mobilizon, WriteFreely | none | (none) | `UnsupportedInstanceError` | same |

### What it cannot do

Having a fediverse account is not always enough to reply. **PeerTube** (video), **Lemmy** (forum), **BookWyrm** (books) and **Mobilizon** (events) for example have no UI for composing a microblog reply, their content model is simply different. StatiquePouet cannot paper over that. To comment, a reader needs an account on microblog software (Mastodon, Pleroma, Akkoma, Misskey…).

## Build and develop

Strict TypeScript, compiled by esbuild to a single minified ESM bundle of about 14 KB.

```bash
npm install         # esbuild + typescript + sass + @types/node (devDeps only)
npm run build       # dist/comments.min.js + the two themed CSS files
npm run build:dev   # dist/comments.js with sourcemap (no CSS)
npm run typecheck   # tsc --noEmit, must be silent
npm test            # compiles tests then node --test
npm run clean       # wipe dist/ and build-test/
```

`make serve` runs `python3 -m http.server` (needed because `file://` breaks ESM imports). `make help` lists every target.

### Source layout

```
src/
├── index.ts        # public API (loadComments, postComment, shareArticle, clearInstance)
├── types.ts        # shared interfaces + FEP-3b86 constants
├── parse.ts        # parseTootUrl, normalizeInstance, isValidInstance, extractAuthorHandle
├── urls.ts         # builders: /context, /authorize, /peers/search, webfinger, /share, nodeinfo
├── jrd.ts          # findTemplateLink, buildIntentUrl (pure JRD helpers)
├── intent.ts       # layered dispatcher + UnsupportedInstanceError
├── adapters/
│   ├── types.ts    # IntentAdapter interface
│   ├── default.ts  # generic resolver (FEP-3b86 + OStatus + /authorize_interaction)
│   ├── misskey.ts  # Misskey family (/share?replyUri=…) + its detectors
│   └── finder.ts   # findAdapter, findAdapterBySoftware: dual-signal registry
├── threading.ts    # buildTree (reply-tree reconstruction)
├── sanitize.ts     # HTML tokenizer + tag/attribute allowlist
├── date.ts         # formatRelativeDate (Intl.RelativeTimeFormat)
├── lang.ts         # resolveLang + format() for i18n
├── classes.ts      # CSS IDs and class names (stylable contract)
├── storage.ts      # tolerant localStorage wrapper
├── state.ts        # ensureInit + config + strings + locale
├── render.ts       # DOM rendering
├── modal.ts        # showInstanceModal + /peers/search autocomplete
└── actions.ts      # public action orchestration
```

Pure helpers (`parse`, `urls`, `jrd`, `sanitize`, `threading`, `date`, `lang`, `intent`, `adapters/*`) touch no `document` or `window` and are unit-tested under Node. DOM modules (`render`, `modal`, `actions`, `state`, `storage`) are covered by the demo and the live tests. Keep that split intact.

## Tests

```bash
npm test
```

Three layers:

- **Pure functions**: URL and meta parsing, every URL builder, HTML sanitisation (XSS via `<script>`, `<img onerror>`, `javascript:`, `data:`…), reply-tree construction, FEP-3b86 resolution, language resolution, i18n formatting.
- **Adapter dispatch** ([`tests/adapters/`](tests/adapters/)): each adapter's URL building, detectors and the `findAdapter` registry, with hand-crafted JRDs.
- **Live integration** ([`tests/live/`](tests/live/)): for every software whose support is claimed, one file hits a real public instance and validates the contracts end-to-end. Each skips gracefully when offline, so an air-gapped run never fails.

  | Software | Instance | Validated live |
  |---|---|---|
  | Mastodon | `mastodon.social` | webfinger + routing + `/context` |
  | Pleroma | `udongein.xyz` | webfinger + routing + `/context` |
  | Akkoma | `blob.cat` | `/api/v1/instance` + webfinger + routing |
  | GoToSocial | `gts.superseriousbusiness.org` | `/api/v1/instance` + webfinger + routing |
  | Pixelfed | `pixelfed.social` | `/api/v1/instance` + webfinger + routing |
  | Misskey | `misskey.io` | webfinger signature + routes to `MisskeyAdapter` |

  Pleroma, Akkoma and Misskey have no canonical project-run flagship, so a stable community instance stands in.

**115 tests** (8 live, 31 on adapters).

## Contributing

- 👤 **Humans**: [`CONTRIBUTING.md`](CONTRIBUTING.md) (philosophy, conventions, process, the full external-spec reference list).
- 🤖 **AI assistants and agentic tools**: [`AGENTS.md`](AGENTS.md) (mandatory behaviour rules).

## License

Public domain via the [Unlicense](UNLICENSE). The choice is ethical, not a convenience: part of this code was produced with AI tools whose training corpora harvested uncompensated human work, code, documentation, drafts, protocols. Dedicating the output to the public domain returns it to the commons those corpora drew from in the first place. The [UNLICENSE](UNLICENSE) preamble lays out the full position.

Contributors are asked to make the same dedication. See [PATENTS](PATENTS).
