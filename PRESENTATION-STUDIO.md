# Presentation Studio

Private feature in the existing Mikee's Hub app. No decks are shared or sent automatically.

## Available now

- Notes, public HTTPS links, text PDF/TXT supporting documents and images in combination.
- Server-side basic extraction (labelled fields/numbers); full original extracts remain reviewable. Retrieved information starts independently unverified. Identity, authority, currency, exact evidence and field value must be reviewed before marking a website-backed fact confirmed. Unit-specific conditions remain the user's responsibility.
- Explicit conflicting/unavailable/unverified states, source snapshots, checked dates and retained limitations.
- Existing Agent Library/manual contacts, snapshotted per approved version; approved logo upload/Brand Kit reuse.
- Three branded layouts, short/standard outlines, slide text/order/image framing edits, source appendix, final contact slide.
- Sourced bar charts; comparables screened by scope/date/size/completion with differences required. No invented data or default market figures.
- Optional validated payment milestones, purchase costs and gross/net yield scenarios. All fees and rent assumptions are explicit, editable inputs. No fee schedule is silently assumed current.
- Shared absolute layout primitives for PDFKit and offline HTML, embedded Inter fonts and private image assets. HTML has navigation, keyboard controls and fullscreen; no analytics or network fetches. PDF has selectable embedded-font text and one 16:9 slide per page. Overflow is rejected rather than clipped.
- Dedicated owner-only Supabase tables, private storage bucket and immutable approved versions. Optimistic revision checks and atomic approval RPC. Drafts also survive failures in per-user IndexedDB.
- Search, edit, preview, duplicate, delete and version-specific HTML/PDF downloads. Research refresh proposes additions without overwriting approved snapshots.

## Server configuration still required for assisted/live research

The app has no provider credentials configured by this change. No model or paid data access is invented.

Set on Vercel (server-only):

- `AI_GATEWAY_API_KEY`: authorised Vercel AI Gateway key.
- `PRESENTATION_MODEL`: an available Gateway model ID (`provider/model`) supporting structured output. Select from the current model catalogue; no stale hardcoded model is used.
- `BRAVE_SEARCH_API_KEY`: authorised Brave web-search key. Queries use only the property/project title and generic research terms, not notes, contacts or uploaded client data.

The AI SDK is pinned with a lockfile. The optional extractor returns source IDs and exact quotes; output without a matching quote is discarded. Retrieved/uploaded text is explicitly untrusted data, never instructions. Source labels and field review remain necessary even when these providers are enabled.

DXB Interact subscription/API access is NOT connected. Use permitted uploaded text reports or public attributable evidence. There is no invented connector. Uploaded scanned PDFs require OCR elsewhere or pasted text. No access controls are bypassed.

All inference/search calls occur server-side. Public-site retrieval rejects credentials, non-HTTPS, literal/private/reserved IPs, unsafe redirects and oversized responses. DNS results are validated and pinned for each hop. Requests carry no user's cookies or Supabase credentials.

## Persistence

`lib/presentation-schema.sql` records the applied migration. `hub_presentations` stores editable drafts; `hub_presentation_versions` stores immutable snapshots plus generated export paths. `presentation-private` stores inputs and exports under authenticated user IDs. Both tables use RLS; anonymous access is revoked. Storage enforces owner/workspace policies. The API verifies the Supabase user and existing workspace and uses the user token (no service-role credential).

Atomic approval checks draft revision, increments the revision, and inserts the next immutable version. Old versions never become 'fresh' from a newer research request. Deletes remove the record/versions and attempt to remove its known files, retaining assets referenced by another draft. An interrupted render may leave an unreferenced export object for later housekeeping; it remains private.

## Checks

`npm ci && npm test`

Covers provenance/conflicts, payment/yield/cost arithmetic, source requirements, comparables, private network rejection, PDF/HTML generation for all layouts, offline restrictions, escaping, overflow, server authentication, mocked authenticated render/storage/RPC, text PDF and HTML extraction.

PDF pages were rendered with Poppler and inspected. Supabase rollback tests exercised owner insert/approval/version retrieval and non-owner denial. Security advisors reported no new Presentation Studio issues; unrelated existing project advisories were left unchanged.

Live signed-in browser/iPhone flows and provider calls require end-to-end verification with the user's session and configured providers. They have not been claimed as tested. Existing modules were preserved; integration checks cover script syntax, unique DOM IDs and all Studio control bindings.

## Focused entry page (21 October 2026)

The default page now asks only for a website link, optional notes and the agent. The title is derived from source text, branding is copied automatically from the same `state.brand` used by Marketing Tools, and generation goes straight to a reviewable preview. Where no Brand Kit logo image exists, it reuses the existing Croswell text wordmark rather than inventing an image or blocking the download. A final review confirmation retains the distinction between independently unverified and confirmed facts.

Source/fact and slide edits open in a separate modal. Detailed calculation and service controls remain retained for compatibility with saved decks, but are not part of the main entry flow. Public website cover images (JPEG/PNG og:image) may be retrieved through the same DNS-pinned, capped HTTPS transport and saved privately. They are labelled for review before use. A refresh replaces previously derived website images so a different property's prior cover is not silently reused.

The page was visually reviewed in an isolated browser preview; manual disclosure expanded correctly. Existing signed-in production flows were not used for this preview. The redesigned shared renderer uses larger Inter typography, warm paper backgrounds, photograph-led covers, fact cards, clearer charts and matching HTML/PDF layouts. Twelve focused tests pass, including wordmark-only branding and long source details. Live AI/search and authorised transaction-data feed configuration remain unchanged.
