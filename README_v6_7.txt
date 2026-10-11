TRINERGY GO-LIVE POLISH v6.7

NO NEW SQL REQUIRED after v6.6A hotfix has been applied.

CHANGES
- STS Test Bay-1 and Bay-2 displayed inside one combined STS Test Bays card.
- STS Heatrun Bay-1 and Bay-2 displayed inside one combined STS Heatrun Bays card.
- Core bay 2-slot logic unchanged.
- Weekly Progress restored to real Monday-Saturday calendar weeks; Sundays excluded.
  Example Oct 2026: W1 1-3, W2 5-10, W3 12-17, W4 19-24, W5 26-31.
- Week selector retained so previous weeks can be reviewed.
- Weekly design changed to three compact neon energy/tank cards (3X / 2X / STS) with Target, Completed, Pending and completion %.

DEPLOY
1. No SQL for v6.7.
2. Upload/replace dashboard.js, bays.js, styles.css (or all frontend files from this ZIP).
3. KEEP config.js untouched.
4. Commit, wait for GitHub Pages deploy, then Ctrl+Shift+R.
5. Run GO_LIVE_TEST_SCRIPT.md and optionally paste trinergy-diagnostics.js into browser DevTools Console while logged on the portal.
