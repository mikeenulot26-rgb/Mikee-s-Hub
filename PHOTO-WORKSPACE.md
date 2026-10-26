# Photo Studio and Listings — 26 October 2026

Photo Studio uses the existing property IDs, photos manifest, private marketing bucket, authenticated Cloud client and revision-checked Supabase Postgres workspace. No parallel listing/task database or file-storage JSON database was introduced. The existing Listings page is extended rather than duplicated. Company and agent defaults remain the user's existing records.

## Preservation

Read-only production inventory before implementation: 5 property folders, 74 photo/asset metadata records, 1 listing. Two photo records have property `marketing-tools` and an asset purpose; these are Marketing assets, not orphan property photos. Original files and existing approved versions are not overwritten. Existing folders appear directly; no bulk migration or data deletion occurred. Thumbnails for old photos are generated lazily once from their original, using a cached local copy when available. Original downloads for this initial preparation cannot be avoided when no thumbnail exists.

## Implemented

- Searchable property folders, covers/counts, add-to-folder uploads, folder details and links to existing listings.
- Byte-signature validation for JPG/PNG/WebP, explicit image content type, original preservation, cover-cropped 800x600 JPEG and 320x240 thumbnail. Three workers, two for batches containing files over 12 MB; image rendering is serialized. Failed files retain their upload state for retry in the current session.
- Direct authenticated TUS upload for originals over 6 MB, 6 MB chunks and upload-offset recovery, with no automatic unbounded retries. Small originals use typed direct uploads. Supabase's resumable protocol is used instead of S3 multipart credentials.
- Large centered mouse/touch reposition editor, grid, keyboard movement, preview-first/original loading, save/cancel/outside click, retained enhancement settings, immutable versions and bounded original cache (3).
- Folder-local order numbers, optimistic DOM moves, per-folder debounced save queues, failure reconciliation, stable image URLs and ZIP ordering.
- Three export choices, individual/selected ZIP, sanitized single property directory, simple numeric prefixes and return to folder overview after download initiation. ZIP byte contents verified separately from browser delivery.
- Natural local enhancement review using a same-origin background worker, low-resolution and heuristic soft-focus/low-texture warning. It does not reconstruct missing detail or use paid AI.
- Confirmed deletion removes a card optimistically, rolls back failed metadata removal, and retains persistent retry metadata if private binary cleanup fails.
- Listings copy-reference control, manual agent name, name/reference/due/recent sorting, existing filters, partial-success bulk entry, duplicate references including another listing's retained history, publication/republication history and actual-date/reference republication form.
- Tasks now use publication +25 days; deadline remains publication +27 days. The former rule used day 28, brought forward to Friday for weekends. Completed task history is preserved; pending tasks reconcile on authenticated workspace loading/saving. Same-day cycle changes have distinct cycle revisions. All views continue to use existing task/listing IDs.

## Free limits

The existing private marketing bucket was raised from 25 MiB to 50 MiB; it remains private and restricted to image/jpeg, image/png and image/webp. Supabase Free cannot support 100 MB individual files. Global account restrictions may impose a lower effective limit and are reported as upload failures. No paid plan, new account or new storage service was enabled.

Published Free allowances: 1 GB storage, 500 MB database, 5 GB egress plus 5 GB cached egress; inactivity restrictions remain. Actual inventory at inspection: 147 files, 47,657,862 stored bytes across the project's buckets. This is not a claim of unlimited capacity or measured billing reduction. Browser decoding rejects images above 50 megapixels; iPhone/iPad original-size enhancement is limited to 16 megapixels to protect memory. Larger originals still support resized exports. Old immutable versions remain until their photo is explicitly deleted.

Official references:
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- https://supabase.com/pricing

## Verification and limits

144 automated tests pass. Automated checks cover existing modules plus MIME signatures, the 50 MB boundary, safe names, contiguous ordering, date/year/leap boundaries, duplicate references, retained republication history, inactive/undated task reconciliation, authenticated small upload/TUS request shapes, retry-independent original upload deduplication, and deletion/cleanup failure reconciliation.

Desktop Chromium browser checks used isolated fixture records and IndexedDB, with mocked cloud persistence: multi-file processing, EXIF orientation (1200x800 orientation-6 source correctly decoded as 800x1200), immediate cards, reposition popup and keyboard save, order persistence after reload, unchanged image URLs during order changes, ZIP directory/order/800x600 JPEG contents, and preservation of form input after a simulated failed save. A representative reorder performed one metadata save, zero additional image reads and zero uploads. The isolated HTTP preview uses fixture-only crypto stand-ins; production uses native HTTPS SHA-256.

The browser download-event bridge timed out, although the app initiated the download and the generated ZIP bytes passed the fixture checker. Do not claim browser file delivery was verified. No owner credentials were used for production write tests. Physical iPhone Safari/Home Screen, live large-file storage writes, real-account cross-device uploads and the full production login-to-save flow remain unverified. Do not claim those checks passed.
