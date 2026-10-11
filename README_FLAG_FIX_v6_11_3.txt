TRINERGY v6.11.3 — CHEQUERED FLAG FIX

NO SQL REQUIRED.

Problem fixed:
- v6.11.2 CSS tail contained malformed escaped newline characters, so the animated flag CSS was not parsed reliably.
- Replaced the flag with a self-contained SVG chequered flag (no emoji/font dependency).
- Flag animation is CSS-based and remains visible on desktop and mobile.
- Long vertical finish pole remains removed.
- Existing v6.11.1 mobile/monthly sizing fixes are retained.

UPLOAD ONLY:
- dashboard.js
- styles.css
- service-worker.js

DO NOT TOUCH config.js.

After deploy:
1. Wait for GitHub Pages.
2. Ctrl+Shift+R on desktop.
3. On installed PWA, close/reopen once; if stale, refresh/reinstall.
