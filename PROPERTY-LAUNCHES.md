# Property Launches

Private owner-only extension of Mikee’s Hub. Frontend is buildless, uses the existing navigation and CSS theme variables. Existing features and their records are retained.

## Data and integration

- `hub_launches`: release/source facts and audit history; separate personal notes, watchlist and archive columns. Owner-only RLS. Authenticated clients can update personal columns only; validated server actions maintain research data. Unique `(user_id, release_key)` plus canonical source matching prevents exact duplicate imports. Differently worded news reports need identity review; do not publish them as separate releases without checking.
- `hub_launch_sources`: last check, selected-page coverage and compact issues.
- `hub_launch_digests`: immutable daily fact snapshots, Dubai day and confirmed update count.
- `hub_launch_preferences`: opt-in launch digest push.
- Private `launch-images` bucket: source image signature, dimensions, size and SHA-256 checked; signed owner URLs, cover cropping. Human review must confirm that the actual cached image depicts the project before publication. No generic fallback imagery.
- Follow-up tasks use `state.hub.tasks`; persistence, task management, calendar and reminders remain existing Hub systems. No separate task store.
- Marketing drafts use `state.marketingTools.posts`, cached source images imported using existing media helpers, selected confirmed facts and attribution. Preview/editor opens; nothing is sent or published. Drafts cannot use Download again to bypass review.
- Launch updates/digest entries extend the existing notification dropdown and its Clear behaviour. Optional digest push uses existing subscriptions, private VAPID configuration, delivery ledger and service worker.

## Scheduled monitor

Supabase Edge Function `property-launches` authenticates owner requests with their existing session and workspace permissions. Cron calls use the existing private reminder cron credential server-side. `hub-property-launches-morning` runs `0 5 * * *` UTC, targeting 09:00 Asia/Dubai. Source fetch/review completes after the trigger; precise delivery time is not guaranteed.

Selected sources: Emaar latest launches, Aldar news, Dubai Properties media, The National property and WAM business. Each run processes a bounded rotating subset of candidate links, not comprehensive UAE coverage. Public pages requiring JavaScript, access checks or unavailable imagery are reported for review. No paywall bypass, paid search service or AI API. Unknown fields remain absent. Browser HTTP requests and image redirects are restricted to explicit HTTPS source/CDN hosts, streamed size limits and timeouts.

The deterministic parser extracts explicit supported fields and sends every new item to review. It does not autonomously verify all amenities, availability, brochure contents or complex instalment tables. The review editor supports adding these with attribution. Additional project sources can enrich an existing release; personal data is never overwritten. Contradictory claims retain source-specific values and history. Explicit complete payment ratios are shortened; incomplete schedules are not guessed.

## Verification

`npm test` covers existing modules and launch parser, date boundaries, duplicate keys, verification gates, payment plans, image headers/dimensions, conflicting updates and preservation. SQL transaction checks cover unique constraints, owner personal updates, denial of research-data writes and other-user isolation, rolled back afterwards. Browser fixture checks cover phone-width rendering, watchlists, detail actions and Escape dismissal. Fixtures are not real launches and are not production data.

Physical iPhone Safari/Home Screen push has not been tested. Live source coverage can change and is shown in Sources. No paid credentials or services are added; existing Vercel/Supabase account usage limits still apply.
