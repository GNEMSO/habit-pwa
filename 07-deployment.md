# 07. Deployment

The app is a folder of static files. Any static host with HTTPS works. Service workers require HTTPS (except on `localhost`).

## Local development

Serve the folder with any static server. Do not open `index.html` with a `file://` URL, because service workers and modules will not work.

```bash
# either of these, from the project root
python3 -m http.server 8080
npx serve .
```

Open `http://localhost:8080`. In DevTools, Application, Service Workers, tick "Update on reload" while developing, and untick it when testing real update behavior.

Test on a phone on the same network with the computer's LAN address. Installing on iOS requires HTTPS, so do final device testing against the deployed URL (see below).

## Hosting options

| Host | Free tier | Subpath problem | Custom headers | Notes |
|---|---|---|---|---|
| Cloudflare Pages | Yes | None, deploys at the domain root | `_headers` file | Recommended |
| Netlify | Yes | None | `_headers` file | Also fine |
| GitHub Pages | Yes | Project sites live at `user.github.io/repo/`, so all URLs must be relative | Not supported | Works because the app uses relative URLs |

Free-tier limits and rules change, so check the host's current terms before relying on them.

### Option A: Cloudflare Pages (recommended)

1. Put the project in a Git repository on GitHub.
2. In Cloudflare, create a Pages project and connect the repository.
3. Framework preset: None. Build command: leave empty. Output directory: `/` (the repository root).
4. Deploy. The app is available at `https://<project>.pages.dev`.
5. Every push to the main branch redeploys automatically.

### Option B: GitHub Pages

1. Push the project to a GitHub repository.
2. In the repository settings, Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The app appears at `https://<username>.github.io/<repo>/`.
4. Verify that every URL in `index.html`, `manifest.webmanifest`, and `sw.js` is relative (`./`). A single absolute path like `/css/app.css` will break.

### Option C: Netlify

Drag the project folder into the Netlify dashboard, or connect the Git repository with no build command and publish directory `.`.

## Headers (`_headers`, for Cloudflare Pages and Netlify)

```
/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: no-cache
  Content-Type: application/manifest+json

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```

If any asset under `/icons/` or `/fonts/` is ever replaced, rename the file, since it is cached as immutable.

On GitHub Pages no headers can be set. That is acceptable because browsers re-check `sw.js` directly (registration uses `updateViaCache: 'none'`), and the service worker's own versioned cache controls everything else.

## Release process

1. Change files.
2. Bump `VERSION` in `sw.js` (for example `v1` to `v2`) whenever any shipped file changes. Regenerate the `ASSETS` list if files were added or removed.
3. Run `node --test tests/` under the three time zones from `06-test-plan.md`.
4. Commit and push (or redeploy).
5. Open the deployed URL in a normal browser tab, wait for the update toast or reload twice, and confirm the new version.
6. On the iPhone and Mac installed apps, open the app while online, press "Reload" in the update toast, and confirm.

Forgetting step 2 is the most common cause of "I deployed but nothing changed". Add a short CI or pre-commit check if desired: fail if files changed but `VERSION` did not.

## Post-deploy checklist

- `https://<host>/manifest.webmanifest` loads and parses.
- `https://<host>/sw.js` loads with `Cache-Control: no-cache` (or no long cache).
- DevTools, Application shows no manifest errors; the service worker is activated.
- Add to Home Screen on iPhone: correct name "Habit Log", correct icon, standalone mode, offline works.
- Add to Dock on Mac works and opens its own window.
- Export a backup from the live app and import it back to confirm the pipeline.

## Rollback

Restore the files from the last good commit, then set `VERSION` in `sw.js` to a brand new value. Example: `v3` was bad and `v2` was good, so restore the `v2` files and set `VERSION` to `v4`. Never reuse an old version string, because clients that already hold the bad cache would not refresh.

## Custom domain (optional)

Point a domain you own at the host following its instructions. Changing the origin later loses locally stored data (it is stored per origin), so decide on the final address before the owner starts tracking, or use Export and Import when moving.

## Costs and ownership

Hosting on the free tiers above has no cost for an app this small. There are no keys, secrets, or accounts inside the app. The owner should keep a copy of the Git repository and periodic JSON backups of their data.
