# Cross-device assistant synchronisation

Assistant requests now fetch the current authenticated workspace before saving. The browser keeps the last saved baseline and performs a three-way reconciliation of existing records and photo metadata. Independent edits and additions on phone/desktop are preserved, unchanged remote deletions are respected, and conflicting changes to the same record stop without overwriting either version. Local image blobs are retained only for matching saved versions. Read-only requests no longer cause an unnecessary full-workspace write. A failed previous save queue does not prevent a fresh reconciliation. Post-action refresh updates the baseline and existing views.

The screenshot phrase “create a schedule for me tomorrow at 2pm to speak with sheila g” is interpreted as an owner event titled “speak with sheila g”, at 14:00 the next Dubai day. No invitation is sent. Cross-device browser verification uses an explicit fixture backend and real IndexedDB, not the owner’s production records.

# Browser timer binding regression fix

The previous release assigned native browser timer functions to controller instance properties and then invoked them as methods. Native browser bindings rejected the receiver with Illegal invocation, including during input cleanup and Send. Default timer adapters now use wrapper functions, preserving native receiver rules. Dispatch cleanup is inside its try/finally so an unexpected preflight error cannot leave busy/microphone controls locked. The failure was reproduced in Chromium with the real assistant panel; browser Send/retry and controller cleanup are rechecked after this fix.

# Automatic spoken replies to voice commands

Microphone commands carry their voice origin through auto-send, clarification and retry. Replies automatically invoke device speech and retain the full text, independently of the typed-reply speech preference. Voice replies default on and can be muted separately in assistant Settings. A paused synthesis queue is resumed before speaking. Play/replay remains a recovery path for browser/OS restrictions; app code cannot override device volume, Silent mode, browser restrictions, or unavailable language voices. This change has automated coverage and is not a physical-iPhone verification.

# Repeat voice-session recovery

A recognised transcript no longer depends on receiving Safari speech-end before its auto-send timer can run. New recognition activity refreshes the approximately three-second timer. This is a browser-event heuristic, not a guarantee of precise acoustic silence detection. Each tap uses a fresh recognizer; close/error cleanup detaches old handlers and aborts capture. A ten-second no-result watchdog releases a stalled session and retains existing text. Starting voice during a Hub save is disabled. When a spoken response is active, it is cancelled and given a short release interval before recognition starts; inactive speech synthesis is not unnecessarily cancelled. These paths have automated repeated-session tests; no physical iPhone test has been performed.

# Voice auto-send update

Voice transcripts now submit after approximately three seconds without new speech activity. Speech/result activity resets the timer. Closing, navigating, hiding the page, editing the transcript, Cancel voice, starting another recording, or a recognition error cancels pending submission. Typed input still requires Send. Empty transcripts never submit; duplicate final recognition callbacks share one timer. Timing depends on browser recognition events and has not been verified on a physical iPhone.

# Free voice update — 21 October 2026

Browser-native `SpeechRecognition` / `webkitSpeechRecognition` is now the default microphone path. No app transcription API key or paid AI/speech call is needed. Choose English or Tagalog beside the microphone; mixed-language recognition depends on the browser. Transcripts stay editable and require Send. If recognition is unsupported, denied, interrupted, silent or fails, the panel points to iPhone keyboard dictation or typed input. Browser/OS recognition may process audio online under its own privacy settings; it is not advertised as always on-device. Actual iPhone Safari/Home Screen audio still requires a device test.

Paid interpretation, transcription and cloud playback are disabled by default on the server, even if credentials exist. They require the separate operator flag `ASSISTANT_PAID_SERVICES_ENABLED=true`; this update does not set that flag or add credentials. Existing hosting/database usage is unchanged. Device speech synthesis remains available. The exact query “what are my pendings this week?” and related English/Tagalog wording now resolve to unfinished saved tasks for the Dubai calendar week.

The older cloud-service configuration below is optional architecture documentation, not a required setup step for free voice.

# Personal assistant — Mikee’s Hub

## Release state

The assistant extends the existing app and authenticated workspace. It does not introduce another task, event, listing, agent, or notes database. The floating microphone opens a phone-friendly conversation panel throughout signed-in pages. Typed commands work without an LLM credential through the validated bilingual command parser. Flexible AI interpretation, cloud transcription, and cloud speech are implemented but **not active or live-tested until configured**.

No actual iPhone or iOS simulator was available during implementation. Chromium at a 390 × 844 CSS-pixel viewport is a layout check, not an iPhone test. Do not describe this release as device-certified.

## Supported actions and shared data

| Module | Supported assistant operations |
| --- | --- |
| Calendar | Read, create, edit title/time, reschedule, soft-cancel events; open the existing editor |
| Tasks | Read unfinished records, create dated or undated tasks, edit, reschedule, complete, soft-cancel; open existing task editor |
| Recurrence | Daily, weekly, weekdays, weekends through the existing recurrence engine; occurrence/series clarification, duplicate-date guard, future-series changes, confirmed bulk cancellation/stop |
| Listings | Search saved listing references/names/status, list due/overdue renewals, open records; actual renewal date must pass the existing cycle rules and be explicitly confirmed |
| Notes & Memory | Search existing note bodies, create and edit notes; open matching notes |
| Agent Library | Search saved active agent information and open details |
| Marketing Tools | Find saved marketing history and open the existing editor/review workflow |
| Presentation Studio | Search the existing authenticated presentation table and open a saved draft |
| Other existing pages | Open dashboard, productivity, photo studio, brand kit, properties, games, watermark cleanup, and assistant settings |

The existing app has recurring **tasks**, not recurring calendar events. No fabricated event-series integration is exposed. No emails, SMS, invitations, publishing, purchases, permanent deletion, arbitrary SQL, or document-generation approval bypass is exposed. Unsupported actions direct the user to the module’s normal review workflow. Mentioning a person in an event/task creates only the owner's record.

## Persistence and permissions

`Cloud.assistant` reuses the current Supabase access token. The server verifies it and reads the owner's existing `marketing_workspaces` row under RLS. All changes are planned by explicit server actions. The invoker-security RPC `commit_hub_assistant_action` locks that same workspace, checks its revision, saves the existing Hub/listing JSON and audit record in one transaction, and increments the revision. Failed persistence cannot return a completed-action response. Other users and anonymous callers cannot access the audit table/RPC.

Request UUIDs plus content hashes prevent duplicate commits. A network retry reuses the original UUID. Concurrent workspace edits fail with a retry message instead of silently overwriting another device. The client flushes its normal save queue first, then reloads saved Hub/listing state and rerenders affected views. If the local copy changed while a response was pending, it is preserved and the user is told to refresh safely.

Task recurrence uses `recurrence.js`; listing renewal dates/tasks use `PFCore`. Completing a renewal task cannot impersonate a real renewal. Calendar/task/dashboard read the same records. Soft-cancelled events are excluded from calendar, dashboard, productivity, local reminders and the existing background reminder worker. The background worker update preserves its existing authentication and sending behavior; no test notifications were sent.

## Server configuration

Configure these as **server-only Vercel environment variables**, then redeploy. Never paste provider keys into chat or commit them to source. No client-side public prefix is used.

| Variable | Purpose | Current dependency |
| --- | --- | --- |
| `ASSISTANT_AUDIT_KEY` | A random 32-byte key encoded as base64; AES-256-GCM encrypts Undo snapshots and idempotency responses, bound to the authenticated user | Production creation was blocked by automatic approval review; approval/setup is pending |
| `ASSISTANT_MODEL` | Exact structured-output-capable model ID from the current Vercel AI Gateway model catalog | Not configured |
| `AI_GATEWAY_API_KEY` or Vercel-managed `VERCEL_OIDC_TOKEN` | AI Gateway authentication; deployed Vercel OIDC is supported | No model request has been made |
| `OPENAI_API_KEY` | Cloud English/Tagalog transcription | Not configured; microphone button stays disabled with a typed fallback |
| `ASSISTANT_TRANSCRIPTION_MODEL` | Optional transcription model override; current default `gpt-transcribe` | Verify provider availability before activation |
| `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` | Optional cloud English/Filipino speech playback | Not configured; installed device voices are the fallback |

AI Gateway, transcription and Azure speech are metered services. No provider account, billing plan, purchase, or budget was created. Configure a capped budget with the provider before enabling paid use. Environment presence means configured, not independently verified provider health. Provider failures remain visible and never trigger Hub actions.

Without `ASSISTANT_AUDIT_KEY`, changes still have metadata-only audits and safe duplicate prevention, but **Undo is not offered**. A retry returns a generic previously-saved acknowledgement rather than storing private response text in an unencrypted audit. With the key, encrypted snapshots allow Undo for up to 15 minutes, only if every touched record still matches its post-action state. Unrelated later edits are preserved. Keep the key stable; replacing it invalidates older encrypted replay/Undo data. No private notes or transcripts are written to application logs. Audit fields contain only record IDs/changed field names, or authenticated encrypted payloads.

## Voice and iPhone behavior

Tap to start, tap to stop, review/edit transcription, then Send. `MediaRecorder` prefers Safari's MP4 recording format and falls back to supported WebM. Capture ends on tap-stop, close, navigation, page hiding, pagehide, blur while recording, track interruption, or the 60-second limit. Late microphone permission responses cannot leave an active stream after close. No always-listening, wake word, locked-phone, or closed-app microphone behavior exists.

Cloud transcription sends only the recording, language hints and up to five saved agent/property names as spelling hints; it does not send client contacts or note bodies. A failed recording can be retried from memory while the panel stays open. Closing discards it. Raw audio is never put in the workspace, browser storage, audit table, or logs. Provider-side processing/retention follows the configured provider's account terms; app-side zero storage is not a promise about provider retention.

Text-to-speech uses Azure's supported English/Filipino voices when configured, or installed device voices. Recognition is not perfect; names, dates and times remain editable. If audio is blocked or no Filipino device voice exists, the response remains visible and a Play response button offers recovery. Settings expose name, Auto/English/Tagalog, spoken responses on/off, available voices, and clear conversation history. Browser-session conversation text is capped and can be cleared; raw audio is not retained there.

Safe-area spacing, visualViewport keyboard accommodation, 16px input, at least 46px main controls, reduced-motion support and no horizontal panel overflow are implemented. OS permissions, real keyboard/rotation behavior, installed voices, interrupted calls and Home Screen capture/playback still require the actual-device checks below.

## Dates, clarification and conflict limits

Asia/Dubai is the default regardless of the phone timezone. English and Tagalog relative dates use the current Dubai day, including the 20:00 UTC midnight boundary. Explicit supported timezone overrides are converted to Dubai storage. Ambiguous AM/PM, slash dates, missing required event details, uncertain names, multiple matches and occurrence/series changes require short selectable clarification. Undated tasks remain undated. Results show interpreted dates/times.

The current calendar stores a start time only, with no duration/end time. Conflict detection therefore checks the same saved start time across tasks/events; it does not claim interval-overlap detection. It offers keep-both or another exact date/time. Other records are never silently shifted. Unsupported date wording falls back to clarification rather than guessing.

## Verification performed

- 44 focused automated assistant/API tests: supplied English/Tagalog/mixed examples; midnight dates; actual fixture-backed reads; task/event/note actions; all four recurrence patterns; scope and duplicate guards; renewal workflow; multiple/fuzzy matches; conflict choices; Undo with later edits; encrypted audits; duplicate retries; failed reads/saves; permission denial; late permissions; interruption; microphone shutdown; transcription retry; blocked playback; untrusted note content.
- 24 existing presentation regression tests and the core regression script passed alongside them: 69 total at release preparation.
- Supabase authenticated transaction tests passed for atomic save, duplicate replay, stale revision rejection, and Undo audit marking. All test mutations were rolled back. RLS/anonymous privilege checks passed; the function uses security invoker. Security advisor found no new assistant finding; existing unrelated password/push findings remain.
- Chromium component QA: typed flow, selectable clarification, failed-save text/input retention, retry, settings and history clearing. 390px panel measured 374px including borders, 372px content with no horizontal overflow; main controls measured 46px and input 16px. Full existing Hub startup/auth gate smoke check passed. Component tests used clearly labelled fixture adapters, not the live signed-in owner's account.
- Production smoke checks and deployment result are recorded in the implementation report. Live authenticated assistant/provider requests and actual iPhone testing remain unverified until credentials/device access are available.

## Required iPhone acceptance pass — NOT YET EXECUTED

On a real iPhone, test Safari and Add to Home Screen separately over the production HTTPS URL after server setup. Verify English/Tagalog/mixed speech and spelling correction; allow/deny/re-enable microphone; tap stop; close/navigation/background/incoming call interruption; no speech; offline/retry; automatic audio and Play response recovery; mute/replay/stop; installed/cloud voice selection; safe areas, keyboard and rotation. Then use disposable records to verify saved schedule retrieval, task/event actions, recurrence scope, renewal actual-date confirmation, cross-page sync, ambiguous matches, double-tap/network-retry idempotency, Undo and failed-save errors. Do not mark these as passed without observing the device.
