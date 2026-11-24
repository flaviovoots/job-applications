# Decision log

Decisions made after the
[design](designs/job_applications_tracker_design.md), newest first. Where an
entry differs from the design, the entry wins.

## 2026-11-24: Stage 2 results and changes to the design

Results of Stage 2's manual setup, header check and production run, and
changes to the Stage 2 table in "Detailed Implementation Plan", made during
the stage.

### Google Cloud

- Google publishes an External consent screen only with a homepage and a
  privacy policy URL, which the design's manual setup doesn't list. The
  homepage is `https://jobs.<domain>`. The privacy policy is a static
  `privacy.html` on the root domain, uploaded through cPanel outside the
  repository, and the root domain is an authorized domain. With only the
  `openid` and email scopes and no logo, publishing needed no verification.
- The OAuth client has a fourth authorized JavaScript origin,
  `http://localhost:3000`, so the built server's CSP and COOP can be checked
  locally before deploying.

### Security headers

- The CSP and COOP already matched Google Identity Services' setup guide:
  `https://accounts.google.com/gsi/` in `script-src`, `frame-src`,
  `connect-src` and `style-src` covers the library, its styles and FedCM's
  `fedcm.json`, and COOP is `same-origin-allow-popups`.
- `Referrer-Policy` is `strict-origin-when-cross-origin`, as the guide
  recommends, not helmet's default `no-referrer`, which hides the page's
  origin from Google's button.
- Google's library styles its placeholder button with a `<style>` tag and
  `style` attributes, which `style-src` blocks, so its logo flashed at full
  width before the button's iframe arrived. `GoogleButton` sizes any `svg`
  in its container to 18px, and `style-src` stays without
  `'unsafe-inline'`.
- The other console lines in the local check are harmless: a 401 from
  `GET /api/me` while signed out, Brave blocking `play.google.com/log`, and
  COOP's report-only "would block" from Google's popup.

### Production run

- `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` and `APP_ORIGIN`
  were added in Render with "Save only" before the merge. The merge deployed
  `25b7557`, and `/healthz` showed it.
- S2.1 to S2.4 passed on the desktop and on a Pixel 9, both in Brave. The
  session survived a manual redeploy on both.
- No iPhone was available, and the Pixel 9 ran Brave, not Chrome. The
  iPhone Safari and Android Chrome runs of S2.1 to S2.4 come before Stage 3's
  merge to `main`, as a step in Stage 3's list.

### Changes to the Stage 2 table

- `createApp({ config, logger, verifyIdToken })` keeps Stage 1's logger
  input.
- Tests build the app with `makeTestApp()` after `connectTestDb()`, because
  the session store takes the connected client.
- Three tests the design doesn't list: an `app.test.ts` case where a POST
  with no `Origin` gets 403 (it proves the write guard is mounted),
  `SignedOutBanner.test.tsx`, and an `App.test.tsx` case for a failed
  `GET /api/me`.
- When `GET /api/me` fails with anything but a 401 and there is no session
  data yet, App shows "Couldn't reach the server." with a "Try again"
  button.
- `client/src/types/env.d.ts` types `import.meta.env.GOOGLE_CLIENT_ID`.
- A sign-in failure other than a 403 counts as `"failed"`, not only a 401.
- Neither `auth.signin` nor `auth.refused` logs the email.
- When a refetch of `['me']` gets a 401 after sign-in, the query function
  returns what `markSignedOut()` left, so a session that ends shows the
  banner, not the sign-in page.
- `signOut()` sets `['me']` to `null` and removes every other query, rather
  than clearing the cache: `clear()` would also remove `['me']` and leave the
  mounted hooks showing the email. A failed `POST /auth/logout` makes
  `signOut()` throw and change nothing, since the cookie may still be valid.
- From step 3.1 on, Claude writes the files the table marks "Typed", test
  first, and the author reviews each diff before its commit point.

### Tooling

- `pnpm why mongodb` shows a second driver, 7.5.0, used only by
  `mongodb-memory-server-core` (a dev dependency). connect-mongo, Mongoose
  and the app share 7.8.0.
- `client/vite.config.ts` sets port 5173 with `strictPort`. When 5173 was
  taken, Vite moved to 5174, and the write guard refused that `Origin` with
  a 403, which the sign-in page showed as "not allowed".
- Stage 2's closing docs commit stays on `dev` until Stage 3's merge, so it
  doesn't trigger a deploy.

## 2026-11-20: Stage 1 results and changes to the design

Results of Stage 1's manual setup and vendor checks, and changes to the
Stage 1 table in "Detailed Implementation Plan", made during the stage.

### Hosting

- Render web service on the Free plan in Virginia, set up as the design
  lists, with Atlas's Free cluster on AWS `us-east-1`. The cluster runs
  MongoDB 8.0.37, the version pinned in `package.json` and `ci.yml`.
- Render installs Node 24.22.3 from `.node-version`, and its Corepack runs
  pnpm 12.18.0, so the build needs no `npm install -g pnpm@12.18.0`
  fallback.
- Free instances get Render's health check: while the instance runs,
  `Render/1.0` requests `/healthz` every 5 seconds. Health checks don't keep
  the instance awake; it still spins down 15 minutes after the last request.
- The first deploy failed with `MongoServerError` "bad auth" (the
  `jobs-prod` password in `MONGODB_URI` didn't match Atlas). Startup exited
  with code 1 and Render marked the deploy failed, so connecting before
  listening kept the bad setting from going live. Resetting the `jobs-prod`
  password fixed it.

### Domain

- `jobs.<domain>` is a CNAME in cPanel's Zone Editor to
  `<service>.onrender.com`, with a Google Trust Services certificate. The
  domain has no `CAA` or `AAAA` records.
- The zone had a stray `A` record for `jobs`, removed before the CNAME was
  added. The first CNAME pointed to itself and was corrected.
- Windows' DNS cache kept serving the old `A` record for a while;
  `ipconfig /flushdns` cleared it.

### Idle write

Stage 1's manual step 5 gave the first outcome: the app's JSON 404, after a
delay. Render held the write until the app woke, so a Save after a sleep
only takes longer.

- On 2026-11-20 (UTC), the instance spun down at 13:49:02 (the last health
  check). The write left at 13:51:53, Render started the app at 13:52:03,
  the app logged `server started` at 13:52:08 and the request at 13:52:11,
  and curl got the 404 after 17.7 seconds. The wake took about 18 seconds,
  not the minute the design estimates.
- The write reached the app once and got JSON, not Render's loading page.
  curl sends `Accept: */*`, as `fetch()` does by default, so the sentence in
  "Client" about a Save getting the loading page doesn't apply. The rest of
  the failed-write rule stays: writes never retry, and Save stays disabled
  while its request is pending, which after a sleep is about 18 seconds.
- Two earlier tries (01:47 and 13:04 UTC) got an instant 404 because the
  instance was awake: scanner requests to `/` and `/auth` woke it 10 times
  overnight. Health checks run only while the instance is up, so it is
  asleep once `/healthz` lines stop in Render's live log. The third try
  waited for that.

### Changes to the Stage 1 table

- `createApp({ config, logger })` takes the logger as an input, so tests
  pass a silent one.
- Three tests the design doesn't list: `server/test/errors.test.ts` (the
  error handler), `server/test/helpers.test.ts` (`assertTestUri`) and
  `client/src/test/setup.guard.test.ts` (the shared query client's test
  setup: no retries, and an empty cache in each test).
- The error handler answers a 4xx error whose status is 404 with
  `"Not found"`, not `"Invalid request body"`.
- `index.html`'s `<title>` is the app's name, Job Applications Tracker.
- `mongodb` is a direct dependency on Mongoose's range (`~7.8.0`), so the
  app has one copy of the driver.

### Tooling

- A `check` script runs `lint`, `format`, `typecheck`, `test` and `build`
  in CI's order.
- `server/test/tsconfig.json` only extends `tsconfig.test.json`. VS Code
  finds only files named `tsconfig.json`, so this file makes the editor
  check test files with the same settings and files as the CLI.
- Stage 1's closing docs commit stays on `dev` until Stage 2's merge, so it
  doesn't trigger a deploy.

## 2026-11-17: soft target dates per stage

Each stage has a target date for being deployed with its checklist lines
passing. The targets are soft: missing one means re-planning the stages left,
not cutting scope. The two checkpoints under "Risks and Mitigations" in the
design (2027-01-17 and 2027-01-24) stay the only rules that cut scope.

| Stage | Target |
| --- | --- |
| 0 | 2026-11-19 (CI passing, merged into `main`) |
| 1 | 2026-11-28 |
| 2 | 2026-12-07 |
| 3 | 2026-12-15 |
| 4a | 2026-12-22 |
| 4b | 2026-12-30 |
| 5 | 2027-01-10 |
| 6 | 2027-01-22 |
| Full checklist run | 2027-01-24 to 2027-01-31 |

Stage 5's target leaves a week before the 2027-01-17 checkpoint.

## 2026-11-17: Stage 0 changes to the design

Changes to the Stage 0 table in "Detailed Implementation Plan", made during
the stage.

### Files

- The root `.gitignore` also ignores `*.local` (Vite's `.env.local` files).
  The template's `client/.gitignore` was merged into it and deleted.
- `client/public/` is gone, including the Vite-logo favicon and its `<link>`
  in `index.html`.
- `App.tsx` returns `null` in Stage 0, so Stage 1's test fails first.
- `package.json` has no `license` field (all rights reserved).

### Tooling

- pnpm 12.18.0 is installed globally with `npm i -g pnpm@12.18.0`, not with
  `npm install -g pnpm` and a switch to the `packageManager` version: on
  Windows, pnpm 10 downloads pnpm 12 without running its install script, and
  the result can't start. The README has the fix.
- Prettier is pinned to an exact version (`--save-exact`), as its install
  guide recommends, because patch releases can change formatting.
- `server/tsconfig.json` also sets `"lib": ["es2023"]`, so DOM globals don't
  type-check in server code (the template's `tsconfig.node.json` does the
  same). It keeps `tsc --init`'s `isolatedModules`,
  `noUncheckedSideEffectImports`, `moduleDetection: "force"` and
  `skipLibCheck`, and drops the rest of its extras (source maps,
  declarations, `jsx`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), so `shared/` type-checks the same way on
  both sides.

### Moved to Stage 1

- `config.mongodbMemoryServer` in `package.json`, added when
  `mongodb-memory-server` is installed.
- The `~/.cache/mongodb-binaries` cache step in `ci.yml`, so its key can use
  the pinned mongod version.

### Acceptance checklist

- In the steps table, the device columns say where a step is run ("yes" or
  "—"). Results go only in the run log, one row per device and browser in
  each run.
