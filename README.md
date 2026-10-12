# SECOND BRAIN — Croswell Marketing Studio

First incremental release: a working browser-local marketing studio. No paid AI, no external photo uploads, and no invented property records.

## Included

- Property records and agent library, persisted with IndexedDB on this browser/device.
- Bulk JPG/PNG/WEBP imports (50 per batch; 25 MB each); exact duplicate detection using SHA-256.
- Original preservation; per-photo presets, intensity, framing and crop positioning.
- Exact 800 × 600 unbranded JPEG exports at 0.95 encoder quality; stored ZIP exports with CRC-32.
- Natural, Premium and Bright Interior use deterministic gamma/contrast and mild sharpening. They are not AI restoration, denoising, perspective correction, or generative editing.
- Low-resolution and portrait-framing warnings. No platform compliance certification or advanced blur detection.
- Automatic 1080 × 1920 branded Stories/WhatsApp Status using original source photos, property details, selected hero, agent profile, editable headline and CTA.
- Optional 1080 × 1080 photo carousel; complete kit ZIP.
- Provisional configurable brand wordmark, color, footer and official-logo upload.
- Export/restore device workspace backup, including originals. Restore explicitly confirms replacement and commits atomically.

## Run / deploy

Serve this folder with any static web server (e.g. `python3 -m http.server 8080`). Vercel can deploy the repository with framework Other, no install/build command and output directory `.`. All application dependencies are local files; no npm or paid service is needed.

This first release deliberately uses buildless browser code. A later Next.js/TypeScript shell and Supabase integration can reuse the image/export core. It is not the complete Phase 1 production system.

## Privacy and data

No files or property/agent records are sent to a server. IndexedDB is local to the domain and browser, not a cloud backup. Clearing site data or changing device/domain loses access unless a backup has been exported. Storage quota varies by device. Export failures are surfaced. Use only trusted devices and protect downloaded backups.

The public source contains no private business records. Vercel preview protection depends on the team's settings; app-level login is not yet implemented. Keep deployment protected. Cross-device sync, Supabase Auth/RLS/storage, reminder delivery and server-side scheduling remain unconnected. Do not treat this as the finished private cloud workspace.

## Known limits

JPEG quality depends on the source. Compressed WhatsApp photos cannot recover lost detail. Small inputs need upscaling. Fit mode pads with white; crop mode can remove content. Review previews before export. JPEG colors are browser-managed; custom ICC metadata is not preserved. HEIC is unsupported. Stories use the original photos, not the smaller listing exports; Story photo enhancement is not applied in this release. Agent background removal is not implemented: use a transparent PNG or the original portrait.

Image processing and export require the tab to remain open. There are no background/server jobs or notifications in this release. There are no Canva APIs, paid AI APIs, Instagram publishing or WhatsApp sending integrations.

## Verification

`node --check app.js`, `node --check core.js`, and `node tests/core.test.cjs` check syntax, aspect-fit/crop math, untouched original colors, enhancement alpha preservation, and ZIP generation. ZIP output was independently opened with Python's zipfile to verify CRC and bytes. Full browser interaction/export rendering still needs browser QA. No live Supabase changes were made.
