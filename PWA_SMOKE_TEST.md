# TRINERGY PWA v6.9 Smoke Test

1. Open GitHub Pages URL in Android Chrome.
2. Hard refresh once.
3. Confirm no red Console errors.
4. Confirm top bar shows Install App.
5. Tap Install App.
6. Confirm browser install prompt appears.
7. Install and launch from home screen.
8. Confirm app opens without browser address bar in standalone mode.
9. Navigate Dashboard / Active UPS / Bays / Parking / Faulty / Scan.
10. Confirm Supabase live data loads normally.
11. Start a timer and confirm realtime still works.
12. Close app completely and reopen from icon.
13. Confirm it returns to tracker.
14. Turn airplane mode on and reopen: app shell should open; live Supabase data may be unavailable.
15. Restore internet and refresh; live data must return.
16. iPhone: Safari -> Share -> Add to Home Screen; launch icon and confirm standalone-like experience.
