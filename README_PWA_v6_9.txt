TRINERGY PWA v6.9

NO SQL REQUIRED.

Adds:
- Installable PWA for Android/Desktop Chrome/Edge.
- iPhone/iPad home-screen support via Safari Add to Home Screen.
- manifest.webmanifest
- service-worker.js
- 192px / 512px icons
- theme / Apple PWA meta tags
- Install App button in top bar
- basic offline app-shell cache
- Supabase/API requests are NOT cached
- navigation uses network-first so new GitHub deploys appear quickly

Deploy:
1. Extract ZIP.
2. Upload/replace all files in GitHub repo root.
3. DO NOT TOUCH config.js.
4. Commit.
5. Wait for GitHub Pages deployment.
6. Hard refresh once.
7. On Android Chrome: open site and tap Install App or browser Install.
8. On iPhone Safari: Share -> Add to Home Screen.

Important:
After a future frontend deployment, the service worker cache name should be bumped if you want immediate cache invalidation.
