TRINERGY v6.14 — FINAL GO-LIVE DATA / REPORTS PATCH

NO NEW DATABASE SCHEMA REQUIRED.
If v6.13 Completed Lock SQL was already run, do NOT rerun it. If not yet run, run TRINERGY_v6_13_COMPLETED_LOCK.sql once.

FIXES / FEATURES
- Reports Days Met Target now counts only days with a non-zero planned target that were actually achieved. Zero-plan Sundays no longer inflate the count.
- Admin Targets now includes Core Daily Target (3X+2X) and STS Daily Target.
- Reports Core and STS charts use those daily targets.
- Daily matrix shows Core Plan, STS Plan and combined Ideal Capacity. Sunday remains planned 0 for daily input distribution.
- Historical / Monthly Summary merges live current-month Received/Completed with monthly target, so current October data updates automatically.
- Admin has new Data Export tab.
- Export workbook contains Monthly Summary, UPS Detailed History, Daily Distribution.
- Detailed history includes full serial number, type, QR, received date/time, completed date/time, current/final status, stage, faulted and parked flags.
- Active UPS continues to show full serial number. Bay Monitoring remains compact last-4 display.
- Service-worker cache bumped to v6.14.

DEPLOY
1. Extract ZIP.
2. Upload/replace all frontend files in GitHub repo root.
3. DO NOT TOUCH config.js.
4. No new SQL for v6.14.
5. Commit; wait for GitHub Pages; Ctrl+Shift+R.
6. PWA: close/reopen once after deploy.
