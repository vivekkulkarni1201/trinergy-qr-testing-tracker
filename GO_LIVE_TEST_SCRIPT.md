# TRINERGY v6.7 — GO-LIVE SMOKE TEST SCRIPT

Run this after GitHub Pages deploy and a hard refresh. Use fresh QR labels. Test on one laptop and one mobile if possible.

## A. Dashboard / UI
1. Open Dashboard. Confirm KPI cards render without a blank page flash lasting more than a normal network load.
2. Test Bay Monitoring: every Core Bay shows exactly Slot 1 + Slot 2.
3. Confirm ONE combined **STS Test Bays** card contains STS Test Bay-1 and Bay-2.
4. Confirm ONE combined **STS Heatrun Bays** card contains STS Heatrun Bay-1 and Bay-2.
5. Weekly Progress: verify real Monday-Saturday calendar weeks. For Oct 2026 expect: W1 1-3, W2 5-10, W3 12-17, W4 19-24, W5 26-31. Sunday must not be planned.
6. Click W1/W2/etc. Confirm selected-week 3X/2X/STS Target, Completed, Pending and % update without overlap.
7. Check same weekly section on mobile: no clipped card/button/text.

## B. 2X / 3X Core Bay Flow
1. Receive fresh 2X QR. Confirm Received only; no serial at receiving.
2. Start Testing: choose a Core Bay. Confirm serial assigned and UPS appears in Slot 1.
3. Start another 3X into same Core Bay. Confirm Slot 2 is used.
4. Try a third UPS: full Core Bay must NOT be selectable.
5. Progress first UPS: LV/Hi-Pot -> HV -> Core Heatrun. Confirm it remains in same Core Bay.
6. Start timer. Watch 20-30 sec: countdown must stay stable with no full-card flicker or selection reset.
7. Timer expiry must NOT auto-pass. Click Check UPS & Mark Passed manually.
8. Verify only one timed event can run for that UPS.

## C. Parking
1. Move active 2X/3X to Parking. Bay slot must become Available immediately.
2. Under Testing count should still include parked UPS.
3. Parking -> Move & Resume: only Core Bays with free capacity appear.
4. Resume and confirm status/stage is retained and Scan/Update page opens correctly.
5. For TST/STS in Parking: Core Bays must never appear. Only STS Test and STS Heatrun destinations may appear.

## D. TST / STS Dedicated Routing
1. Receive fresh TST/STS QR.
2. Start testing: only STS Test Bay-1/Bay-2 may be selected. Core Bay must never appear.
3. Mark STS Test Passed.
4. Before STS Heatrun, use Move to STS Heatrun Bay. Only STS Heatrun Bay-1/Bay-2 may appear.
5. Start STS Heatrun only after physical move.
6. Confirm STS Heatrun timer appears on the correct combined STS Heatrun card.
7. Timer expiry -> manual Pass -> 480V / Parameters -> Buffer or Completed.

## E. No-Bay Interlock
1. Open any UNDER_TESTING UPS with no active occupancy (only if intentionally created for test).
2. Confirm stage controls are blocked and **ASSIGN BAY TO CONTINUE** appears.
3. After assigning compatible bay, stage controls unlock.

## F. Fault / RTA
1. During normal stage, click MARK UPS FAULTY. Confirm bay releases and UPS appears Faulty Area.
2. Repeat while a timer is running. Confirm timer stops and bay releases.
3. Faulty serial stays Amber.
4. Re-enter: choose restart stage + compatible bay. Confirm previous valid stages remain and downstream stages reset.
5. TST re-entry must never list Core Bays.

## G. Active UPS / Navigation / Realtime
1. Active UPS -> click each serial. Exact UPS must open; no blank Scan/Update page.
2. Update a stage on mobile. Confirm laptop Dashboard/Bay page updates without manual refresh.
3. Update on laptop. Confirm mobile follows.
4. Navigate Dashboard -> Active -> Bays -> Dashboard repeatedly. No broken/blank screen.

## H. Final Exit / KPI
1. Complete one UPS directly. Bay releases, Completed increments, Under Testing decrements.
2. Move another UPS to Buffer Stock. Bay releases; Buffer increments; Completed unchanged.
3. Buffer -> Completed. Buffer decrements and Completed increments.
4. Faulty UPS must not count Under Testing. Parking UPS must count Under Testing.

## I. Automated Invariant Check
Open portal DevTools -> Console, paste the full contents of `trinergy-diagnostics.js`, press Enter.
Expected: every row in console table says PASS and final message says all go-live invariant checks passed.

If A-I pass on both laptop and mobile, the build is ready for live rehearsal.
