TRINERGY v6.12 — LIVE GRAPHICS PATCH

NO SQL REQUIRED.

Changes:
- Monthly Racing Track car is now dynamically positioned from 0–100% completion.
- Car travel uses the usable road length (6% start to 92% finish) so even low completion shows visible forward movement.
- Race car and progress fill animate smoothly when completion changes.
- Weekly calendar is now Monday through Sunday.
- Sunday completions are included in the selected/current week.
- Weekly tank liquid height is bound to completion percentage and animates live.
- Weekly bottom progress bar animates with the same percentage.
- Explicit weekly targets, if configured, remain authoritative. Fallback target distribution now uses all calendar days, including Sunday.
- Existing waving chequered flag, mobile layout, PWA icon and all business logic remain unchanged.

UPLOAD ONLY:
- dashboard.js
- styles.css
- service-worker.js

DO NOT TOUCH config.js.
NO SUPABASE SQL.

After upload: Commit -> wait for Pages -> Ctrl+Shift+R. For installed PWA, close/reopen once.
