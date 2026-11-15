# 01. Product Overview

## Summary

Daily Habit Log is a personal, free, offline-first habit tracker. The owner opens it from an app icon, taps a circle to mark today's habit done, and sees streaks and history. It has no accounts, no ads, no tracking, and no subscription.

## Why a PWA

| Need | How a PWA meets it |
|---|---|
| Free, no App Store fee or review | Distributed as a URL, installed from the browser |
| Same app on iPhone and Mac | One codebase, installs on both |
| Works without internet | Service worker caches the whole app |
| Owner controls the data | Data stays on the device, with backup and restore |
| Not tied to claude.ai | Hosted on any static host |

## Target user

One person (the owner), tracking a small set of daily habits, mainly on an iPhone, sometimes on a Mac. Not a social or multi-user product.

## Goals for v1

1. Feature parity with the current page (see `03-functional-spec.md`).
2. Installable on iPhone (Safari "Add to Home Screen") and Mac (Safari "Add to Dock", Chrome "Install").
3. Opens instantly and works with no network after the first load.
4. Data survives app restarts, phone reboots, and app updates.
5. Owner can export and import all data as a JSON file.
6. Accessible: usable with VoiceOver and a keyboard, respects dark mode and reduced motion.
7. Deployable for free in under 30 minutes using `07-deployment.md`.

## Non-goals for v1

- Push notifications or reminders (see `04-pwa-requirements.md`, section "Notifications").
- Automatic cross-device sync (see `05-data-storage-sync.md`, section "Future sync").
- User accounts or login.
- Analytics, telemetry, or any network request after install other than fetching app updates.
- Native iOS app, App Store submission, or Capacitor or React Native wrappers.
- Gamification: badges, points, social sharing.
- Habit types other than daily done or not done (no counts, durations, or per-weekday schedules).

## Success criteria

- A Chrome DevTools "Application" check shows an installable manifest and a running service worker.
- The app opens from the home screen in standalone mode (no browser bar) and works in airplane mode.
- All acceptance criteria in `03-functional-spec.md` pass.
- The unit tests in `06-test-plan.md` pass.
- Total transferred size on first load is under 150 KB, excluding fonts.

## Constraints

- No build step required to run or deploy. Plain files served as they are.
- No framework, no runtime npm dependencies. Development tooling is allowed only if it never ends up in the shipped files.
- No third-party requests at runtime (no CDNs, no analytics, no font servers).
- Original branding only. Do not copy logos, icons, names, or artwork from other habit apps.

## Open questions for the owner (the agent should ask only if blocked)

1. Final app name. Default: "Daily Habit Log" (short name "Habit Log").
2. Hosting choice. Default: Cloudflare Pages, with GitHub Pages as the alternative.
3. Custom domain. Default: none, use the host's free subdomain.
4. Whether to add v2 sync later. Default: no.
