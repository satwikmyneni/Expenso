# PWA and offline sync

`public/manifest.webmanifest`, the SVG maskable icon, Apple metadata, and `public/sw.js` provide installable standalone behavior. Production registers the worker and caches the shell plus successful same-origin GET responses.

When a user creates a transaction offline, the UI updates locally and an IndexedDB operation stores an ID, owner, entity, operation, payload, timestamp, retry count, and error. On the `online` event the queue replays through the ordinary authenticated Supabase repository. RLS is therefore still enforced. Successful operations are removed; failures retain error/retry state and show `Sync failed`.

The current strategy is last-confirmed-server refresh after queued inserts. A production extension should add update/delete queuing, background sync where supported, tombstones, an idempotency key column, and a user-facing conflict resolver. Safari may suspend background work, so reconnection also triggers sync while the app is open.

Test installation and offline behavior on HTTPS (or localhost), iPhone Safari Add to Home Screen, Chrome, and Edge.
