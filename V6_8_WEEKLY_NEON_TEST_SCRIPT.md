# TRINERGY v6.8.1 — WEEKLY NEON PATCH TEST SCRIPT

## A. Weekly UI
1. Dashboard hard refresh (Ctrl+Shift+R).
2. Confirm no old “Selected Week” info block.
3. Confirm 3 cards only: 3X blue, 2X green, STS purple.
4. Tank neck, body and neon base must be fully visible — no clipping.
5. Weekly Target / Completed / Pending boxes must be fully visible.

## B. Week selector
1. Use Week dropdown in the weekly header.
2. Select every available week.
3. Expected:
- - card numbers update immediately.
- selected tile has neon highlight.
- current week is marked CURRENT.
- no blank/flicker/duplicate card.

## C. Month selector
1. Select previous month, current month, next month.
Expected:
- calendar week ranges regenerate.
- weekly data refresh.
- main Monthly Performance month stays synchronized.

## D. Calendar logic
For October 2026, with Sunday excluded:
- W1 = 1–3 Oct
- W2 = 5–10 Oct
- W3 = 12–17 Oct
- W4 = 19–24 Oct
- W5 = 26–31 Oct

## E. Calculation
For 3X / 2X / STS:
- Pending = max(Target - Completed, 0)
- % = Completed / Target × 100
- Target = 0 must never show NaN/Infinity
- tank fill and bottom progress must match %

## F. Mobile
At ~390–430 px:
- month/week dropdown reachable
- tank fully visible
- all stat boxes readable
- week tiles tappable
- no unreachable horizontal content

## G. Regression
1. Active UPS serial opens exact Scan/Update screen.
2. Core bay max 2 UPS.
3. 2X/3X only Core bays.
4. TST only STS Test / STS Heatrun.
5. Parking routing remains correct.
6. No bay = no stage progress.
7. Timer does not flicker; only countdown text updates.
8. Fault stops timer, releases bay, moves UPS to Faulty Area.

PASS only if no red Console errors and all above checks pass.
