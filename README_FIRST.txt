TRINERGY GO-LIVE REHEARSAL v6.6

MAJOR SIMPLIFICATION
- Core Test Bay no longer has physical LV/HV sections.
- Every Core Test Bay = max 2 UPS.
- Portal auto assigns Slot 1 / Slot 2.
- LV / Hi-Pot / HV remain LOGICAL stages only.
- 2X/3X stay in the same Core Bay through normal test flow.
- TST/STS logic remains dedicated:
  STS Test Bay -> STS Heatrun Bay.
  TST/STS can never use a Core Test Bay.

BUG CLEANUP
- Active UPS -> exact Scan/Update page fixed by clean scan state engine.
- No physical bay = no stage progress.
- Movement/status/stage are synchronized.
- Parking 2X/3X -> available Core bays only.
- Parking TST/STS -> STS Test or STS Heatrun only.
- Fault re-entry obeys the same compatibility rules.
- Timer uses local countdown and avoids constant full-card repaint.
- Weekly Progress simplified: W1-W5 tabs, selected week only, 3X/2X/STS Target/Completed/Pending.
- Dashboard cached-first loading retained.
- Fault button remains available throughout active testing.

DEPLOY
1. Run TRINERGY_v6_6_CORE_BAY_PATCH.sql ONCE in trinergy-qr-pilot.
2. Upload/replace ALL frontend HTML/JS/CSS/image files.
3. KEEP existing config.js untouched.
4. Ctrl+Shift+R after GitHub Pages deploy.

FAST SMOKE TEST
1. Open Active UPS serial -> UPS screen must open, not blank.
2. Start 2X/3X -> select Core bay -> same bay remains through LV/HV/Heatrun.
3. Put 2 UPS in same Core bay -> bay becomes FULL; third UPS cannot select it.
4. Parking -> 2X/3X sees available Core bays only.
5. TST -> STS Test only; then Move to STS Heatrun; Core bays never appear.
6. No bay allocation -> all stage progress blocked.
