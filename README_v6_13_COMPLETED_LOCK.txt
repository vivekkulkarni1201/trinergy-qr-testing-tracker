TRINERGY v6.13 — COMPLETED TERMINAL LOCK

Required behavior:
- Mark Completed -> UPS disappears from Active UPS automatically.
- QR may still be scanned for lookup, but Scan page shows UPS COMPLETED read-only message only.
- No Buffer Stock, Parking, Fault, bay assignment, stage or timer actions are shown.
- Stale/double-click actions are blocked in frontend.
- Database trigger prevents COMPLETED -> any other status and prevents active bay assignment to a completed UPS.

DEPLOY ORDER:
1. Run TRINERGY_v6_13_COMPLETED_LOCK.sql ONCE in Supabase project trinergy-qr-pilot.
2. Upload/replace frontend files from this patch to GitHub root.
3. DO NOT TOUCH config.js.
4. Commit and wait for GitHub Pages.
5. Ctrl+Shift+R.

FAST TEST:
A. Complete one UPS.
B. Confirm it vanishes from Active UPS.
C. Scan its same QR again.
D. Confirm only UPS COMPLETED read-only message appears.
E. Confirm no Buffer/Completed/Parking/Fault/stage buttons.
F. In Supabase, completed UPS must have zero active bay occupancy.
