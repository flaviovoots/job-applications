# Work steps

The step list for the current stage, written at the start of the stage (see
"How to read this plan" in the
[design](designs/job_applications_tracker_design.md)). Tick each step when it
is done, so a session on either computer starts where the last one stopped.

## Stage 0: scaffold

Goal: a repository whose CI passes on `dev`, with the two time zone guard
tests green. Nothing is deployed.

### Machine

- [x] 0.1 Install Node 24 (the 24.x line, not the newest LTS), and check that
      `node -v` prints `v24.`.
- [x] 0.2 Install pnpm 12.18.0 globally, from outside the repository:
      `npm i -g pnpm@12.18.0`, then check that `pnpm -v` prints `12.18.0`.
      Don't rely on an older pnpm switching to the `packageManager` version:
      on Windows, pnpm 10 downloads pnpm 12 without running its install
      script, and the result can't start ("is not recognized"). If that
      happened, run `rm -rf "$LOCALAPPDATA/pnpm/.tools/pnpm/12.18.0"`.
      If `which -a pnpm` lists a standalone pnpm in `$LOCALAPPDATA/pnpm`
      before npm's copy, rename its `pnpm`, `pnpm.CMD`, `pnpx` and
      `pnpx.CMD` shims to `*.bak` so npm's pnpm 12.18.0 runs.

### Repository basics

- [x] 1.1 Create the `dev` branch from `main`. All Stage 0 work happens on it.
- [x] 1.2 Type `.gitignore`.
- [x] 1.3 Type `.gitattributes`.
- [x] 1.4 Type `.node-version`.
- [x] 1.5 Type `.env.example`.
- [x] Commit point: repository basics.

### Packages and the client template

- [x] 2.1 Generate the client with the Vite react-ts template, then review
      each generated file line by line.
- [x] 2.2 Delete the demo files (`src/App.css`, `src/assets/`, all of
      `public/`, including the Vite-logo favicon) and the template's
      `client/README.md` and `.oxlintrc.json`. Type `App.tsx` down to a
      component that returns `null` (Stage 1 writes its test first). Remove the
      favicon `<link>` from `index.html`. Merge `client/.gitignore` into the
      root one: only `*.local` is new (Vite's `.env.local` files), then
      delete `client/.gitignore`.
- [x] 2.3 Create the root `package.json`, merge in the template's
      `package.json`, then delete the template's copy. No `license` field.
      `config.mongodbMemoryServer` moves to Stage 1, when
      `mongodb-memory-server` is installed.
- [x] 2.4 Type `pnpm-workspace.yaml`.
- [x] 2.5 Run `pnpm install`, and approve or deny build scripts as they come up.
- [x] 2.6 Add Tailwind (typed from its install guide): the Vite plugin, and the
      one-line `client/src/index.css`. Add `envDir` and `envPrefix` to
      `client/vite.config.ts`.
- [x] Commit point: client template and packages.

### Tooling

- [x] 3.1 Type `.prettierrc` and `.prettierignore`.
- [x] 3.2 Generate `server/tsconfig.json` with `tsc --init`, review it,
      then edit it to the settings in the plan.
- [x] 3.3 Type `tsconfig.test.json`.
- [x] 3.4 Type the one-line `server/src/index.ts` placeholder.
- [x] 3.5 Run `pnpm format:write` once, so the generated files pass `format`.
- [x] Commit point: tooling.

### Tests

- [x] 4.0 Install the test packages, and `tsx` for `dev:server`:
      `pnpm add -D vitest jsdom @testing-library/react @testing-library/dom tsx`.
      Approve or deny build scripts as they come up.
- [x] 4.1 Type `vitest.config.ts` (two projects, `TZ` set at the top).
- [x] 4.2 Type `client/src/test/setup.ts`.
- [x] 4.3 Write `server/test/tz.guard.test.ts` and watch it pass, then
      temporarily remove the `TZ` line and run it with `TZ=UTC` to watch it
      fail (the red step). Without `TZ=UTC` it falls back to the machine's
      zone, which isn't UTC either, so it still passes.
- [x] 4.4 Write `client/src/tz.guard.test.ts` the same way.
- [x] Commit point: test runner and guard tests.

### CI and docs

- [x] 5.1 Type `.github/workflows/ci.yml`.
- [x] 5.2 Type `README.md`.
- [x] 5.3 Type `docs/acceptance-checklist.md` (the two tables, no lines yet).
- [x] 5.4 Type `docs/decision-log.md` (the first entry).
- [x] 5.5 Run `lint`, `format`, `typecheck`, `test` and `build` locally.
- [x] Commit point: CI and docs.

### Finish

- [x] 6.1 Push `dev` and check that CI passes on GitHub.
- [x] 6.2 Merge `dev` into `main` and push. (Render isn't set up yet, so
      nothing deploys.)

## Stage 1: walking skeleton on Render

Goal: `https://jobs.<domain>/healthz` answers `{"status":"ok","db":"up"}`
with the deployed commit, the placeholder page loads over HTTPS, and
S1.1 to S1.4 pass on production.

Decided during the stage (recorded in the decision log at 6.8):
Render region Virginia with Atlas AWS `us-east-1`; `createApp({ config,
logger })` takes the logger as an input; three tests the design doesn't list
(`errors.test.ts`, `helpers.test.ts`, and `client/src/test/setup.guard.test.ts`,
added at 4.4); the error handler answers a 4xx error whose status is 404 with
`"Not found"`; `index.html`'s title becomes the app's name; a `check` script
that runs `lint`, `format`, `typecheck`, `test` and `build` in CI's order
(added at 5.1); `server/test/tsconfig.json`, which only extends
`tsconfig.test.json`, so VS Code (which finds only files named
`tsconfig.json`) checks test files with the same settings and files as the
CLI (added after 5.3); the closing docs commit stays on `dev` until Stage 2's
merge.

### Start

- [x] 0.1 Tick Stage 0's 6.2 and write these steps.
- [x] Commit point: Stage 1 steps.

### Atlas

- [x] 1.1 Create the Free cluster on AWS `us-east-1` (matches Render's
      Virginia region).
- [x] 1.2 Create users `jobs-prod` and `jobs-dev`, each with `readWrite` on
      its own database only (`jobs_prod` or `jobs_dev`), with a random
      password of at least 24 characters from the password manager. Use
      letters and digits only, so the password needs no URL encoding in the
      URI. Set network access to `0.0.0.0/0`. Create no database or
      collection by hand.
- [x] 1.3 Note the cluster's exact MongoDB version (an 8.0 patch, for
      example `8.0.x`) → 8.0.37. If the dashboard shows only the major version, run
      `db.version()` in the Atlas shell or Compass.
- [x] 1.4 Set `MONGODB_URI` in the local `.env` to the `jobs-dev` URI, with
      `/jobs_dev` in its path:
      `mongodb+srv://jobs-dev:<password>@<cluster-host>/jobs_dev?retryWrites=true&w=majority`.
      Store both URIs in the password manager.

### Test database

- [x] 2.1 `pnpm add -D mongodb-memory-server` (its build script is already
      denied in `pnpm-workspace.yaml`). Add to `package.json`:
      `"config": { "mongodbMemoryServer": { "version": "<1.3's version>",
      "preferGlobalPath": true } }`.
- [x] 2.2 In `ci.yml`, add an `actions/cache` step (current major, checked
      in its README) before `pnpm test`, with path
      `~/.cache/mongodb-binaries` and key
      `mongodb-binaries-${{ runner.os }}-<1.3's version>`. The version
      appears in `package.json` and here; change both together.
- [x] 2.3 Type `server/test/setup/globalSetup.ts`: start one
      `MongoMemoryServer`, `provide('mongoUri', uri)`, and return a
      teardown that stops it. Declare `mongoUri: string` in Vitest's
      `ProvidedContext`. Add `globalSetup` to the `server` project in
      `vitest.config.ts`.
- [x] 2.4 `pnpm add mongoose mongodb`. Write `server/test/helpers.test.ts`,
      then `server/test/helpers.ts`:
      - `assertTestUri(uri)` throws unless the host is `127.0.0.1` and the
        database name starts with `test-`. Tested with an Atlas-style host,
        `localhost`, a name without the prefix, and a valid URI.
      - `connectTestDb()` builds `test-<crypto.randomUUID()>` into the path
        of `inject('mongoUri')`, calls `assertTestUri`, connects Mongoose,
        and returns the URI (connect-mongo uses it in Stage 2).
      - `disconnectTestDb()` drops that database and disconnects.
- [x] 2.5 Run `pnpm test`. The first run downloads mongod into
      `~/.cache/mongodb-binaries` (`%USERPROFILE%\.cache\mongodb-binaries`
      on Windows).
- [x] Commit point: test database.

### Server

Each step: write the test, watch it fail, then make it pass.

- [x] 3.1 `server/test/config.test.ts`, then `server/src/config.ts`.
      `readConfig(env)` returns `{ mongodbUri, port, commit, clientDir }`.
      A missing or empty `MONGODB_URI` and a `PORT` that isn't a whole
      number from 1 to 65535 are each named in one error, joined with `; `,
      and no value appears in the message (the test uses a distinctive bad
      `PORT` value and checks it's absent). `commit` is `RENDER_GIT_COMMIT`
      or `"dev"`. A missing or empty `PORT` gives 3000.
- [x] Commit point: config.
- [x] 3.2 `pnpm add express pino pino-http helmet` and
      `pnpm add -D supertest @types/express @types/supertest`. Approve or
      deny build scripts as they come up. Type
      `server/test/fixtures/client/index.html` and
      `server/test/fixtures/client/assets/test.js`. Add `testConfig()` to
      `helpers.ts`, with `clientDir` set to the fixtures folder.
- [x] 3.3 `app.test.ts`: `GET /api/anything` and `GET /auth/anything` give
      a JSON 404 `{ error: "Not found", requestId }`. This brings in
      `apiNotFound` (`errors.ts`), `createApp({ config, logger })` with
      `trust proxy` set to 1 (`app.ts`), and `createLogger({ destination?,
      level? })` plus the pino-http options with `genReqId` (`logger.ts`).
      Tests pass `createLogger({ level: "silent" })`.
- [x] 3.4 `app.test.ts`: the 404 has an `X-Request-Id` header equal to its
      `requestId`. (3.6 and 3.7 add the same check to their responses.)
- [x] 3.5 `server/test/errors.test.ts`, then `errorHandler` in `errors.ts`,
      on a small Express app with throwing routes: `HttpError` gives its
      status, `error` and `fields`; an error with a 4xx `status` gives that
      status with `"Not found"` for 404 and `"Invalid request body"`
      otherwise; a `CastError` gives 404; anything else gives 500
      `"Something went wrong"`. Every body has the `requestId`.
- [x] 3.6 `app.test.ts`: `/assets/missing.js` gives 404, not `index.html`;
      `/assets/test.js` has `Cache-Control` with a one-year `max-age` and
      `immutable`; `/` and `/anything` give `index.html` with
      `Cache-Control: no-cache`.
- [x] 3.7 `app.test.ts`: the CSP header names `accounts.google.com/gsi/`
      and has `frame-ancestors 'none'`; COOP is `same-origin-allow-popups`.
      This brings in `securityHeaders()` (`security.ts`).
- [x] 3.8 `server/test/logger.test.ts`: a small Express app with the
      pino-http options and a capture stream as the destination, and one
      route that sets a cookie. A POST with `Cookie`, `Authorization` and a
      JSON body is logged with the cookie, authorization and `set-cookie`
      values redacted, and with no body.
- [x] Commit point: app pipeline.
- [x] 3.9 `server/test/health.test.ts`, then `server/src/http/health.ts`,
      mounted in the app: 200 `{ status: "ok", db: "up", commit }` after
      `connectTestDb()`; 503 `{ status: "degraded", db: "down", commit }`
      after `disconnectTestDb()`.
- [x] 3.10 Replace `server/src/index.ts`: `readConfig(process.env)`,
      `mongoose.set('bufferCommands', false)`, `await mongoose.connect()`,
      `createApp({ config, logger: createLogger() })`, `listen(port)`, and a
      startup log line with the commit. Any failure logs and exits with
      code 1. Check by hand: `pnpm dev:server`, then
      `http://localhost:3000/healthz` shows `"db":"up"` and
      `"commit":"dev"`; `pnpm exec tsx server/src/index.ts` (no `.env`)
      exits with code 1 and names `MONGODB_URI`.
- [x] Commit point: health check and startup.

### Client

- [x] 4.1 `client/vite.config.ts`: `server.proxy` sends `/api` and `/auth`
      to `http://localhost:3000` (no `changeOrigin`, so the browser's
      `Origin` reaches the server).
- [x] 4.2 `pnpm add @tanstack/react-query react-router`.
- [x] 4.3 `client/src/queryClient.test.ts`, then `client/src/queryClient.ts`.
      `shouldRetry(failureCount, error)`: TanStack Query's `failureCount`
      starts at 0, so 0 gives true and 1 gives false; a 4xx (400 to 499) gives
      false; an error without a numeric `status` counts as status 0.
      The exported `queryClient` uses it for queries and sets mutations'
      `retry` to false.
- [x] 4.4 `client/src/test/setup.ts`: before each test, set the shared
      client's default query `retry` to false; after each test,
      `queryClient.clear()`.
- [x] 4.5 `client/src/components/ErrorBoundary.test.tsx`, then
      `ErrorBoundary.tsx`: a child that throws shows "Something went wrong.
      Reload the page." The test silences `console.error` with a spy.
- [x] 4.6 `client/src/App.test.tsx`, then `App.tsx`: a heading "Job
      Applications Tracker". Change `index.html`'s `<title>` to the same
      name.
- [x] 4.7 `client/src/main.tsx`: `StrictMode` >
      `QueryClientProvider` > `BrowserRouter` > `ErrorBoundary` > `App`.
- [x] Commit point: client shell.

### Local check

- [x] 5.1 Run `lint`, `format`, `typecheck`, `test` and `build` locally.
- [x] 5.2 Run `node --env-file=.env dist/server/src/index.js`, then check
      `http://localhost:3000` (placeholder page), `/healthz`, and that
      `/assets/nope.js` gives 404.
- [x] 5.3 Push `dev` and check that CI passes. The mongod cache misses on
      the first run and hits on the next.

### Deploy

- [x] 6.1 Add S1.1 to S1.4 to `docs/acceptance-checklist.md` (desktop
      only).
- [x] Commit point: Stage 1 checklist lines.
- [x] 6.2 Merge `dev` into `main` and push.
- [x] 6.3 Create the Render web service from the GitHub repo: Free plan,
      Virginia, branch `main`; build
      `corepack enable && pnpm install --frozen-lockfile && pnpm build`;
      start `node dist/server/src/index.js`; health check path `/healthz`;
      Auto-Deploy "After CI Checks Pass"; environment variable
      `MONGODB_URI` with the `jobs-prod` URI (`/jobs_prod` in its path). If
      `corepack enable` fails, use `npm install -g pnpm@12.18.0` instead.
      Check that `https://<service>.onrender.com/healthz` shows `main`'s
      SHA.
- [x] 6.4 Confirm in Render's dashboard that the health check path is
      active on a free instance.
- [x] 6.5 Domain steps 2 to 6 under "Build, deploy and domain" in the
      design: nameservers, add `jobs.<domain>` in Render, the CNAME (and
      no `AAAA`; `CAA` allowing `letsencrypt.org` and `pki.goog` if any
      exist), wait for the certificate, disable the `onrender.com`
      subdomain.
- [x] 6.6 Run S1.1 to S1.4 and add a run log row.
- [x] 6.7 Leave the service idle for at least 20 minutes, then send the
      idle write (Stage 1, manual step 5 in the design) and note which of
      the three outcomes happened → the app's JSON 404, after a delay.
- [x] 6.8 Add a decision log entry: region, Atlas version, the health
      check result (6.4), the idle outcome (6.7), and the changes listed at
      the top of this stage. Tick the steps;
      mongodb uses Mongoose's range (~7.8), so the app has one driver.
- [x] Commit point: Stage 1 results (stays on `dev` until Stage 2's merge).

## Stage 2: Google sign-in end to end

Goal: on `https://jobs.<domain>`, the author's account signs in with Google
and out again, an account not on the list is refused with no cookie, a session
survives a redeploy, and S2.1 to S2.4 pass on desktop, iPhone Safari and
Android Chrome.

Decided during the stage (recorded in the decision log at 6.5):
Google publishes an External consent screen only with a homepage and a
privacy policy URL, so the privacy policy is a static page on the root domain,
hosted through cPanel outside the repository (1.1); `http://localhost:3000`
is a fourth authorized JavaScript origin, so the built server's CSP and COOP
are checked locally before deploying (5.3);
`createApp({ config, logger, verifyIdToken })` keeps Stage 1's logger input;
tests build the app with `makeTestApp()` after `connectTestDb()`, because the
session store takes the connected client; tests the design doesn't list: an
`app.test.ts` case where a POST with no `Origin` gets 403 (it proves the write
guard is mounted), `SignedOutBanner.test.tsx`, and an `App.test.tsx` case for a
failed `GET /api/me`; when `GET /api/me` fails with anything but a 401 and
there is no session data yet, App shows "Couldn't reach the server." with a
"Try again" button; `client/src/types/env.d.ts` types
`import.meta.env.GOOGLE_CLIENT_ID`; a sign-in failure other than a 403 counts
as `"failed"`; neither `auth.signin` nor `auth.refused` logs the email;
the CSP and COOP match Google Identity Services' setup guide (its parent
path `https://accounts.google.com/gsi/` covers `client`, `style` and FedCM's
`fedcm.json`), but `Referrer-Policy` is `strict-origin-when-cross-origin`, as
the guide recommends, not helmet's `no-referrer`, which hides the page's
origin from Google's button (1.4); `pnpm why mongodb` shows a second
driver, 7.5.0, used only by `mongodb-memory-server-core` (dev), while
connect-mongo, Mongoose and the app share 7.8.0 (2.1); from 3.1 on, Claude
writes the files the design marks "Typed", test first, and the author reviews
each diff before its commit point; when a refetch of `['me']` gets a 401
after sign-in, the query function returns what `markSignedOut()` left, so a
session that ends shows the banner, not the sign-in page (4.3); `signOut()`
sets `['me']` to `null` and removes every other query, because `clear()`
would also remove `['me']` and leave the mounted hooks showing the email; a
failed `POST /auth/logout` makes `signOut()` throw and change nothing, since
the cookie may still be valid (4.5); `client/vite.config.ts` sets port 5173
with `strictPort`, because when 5173 was taken Vite moved to 5174, and the
write guard refused that `Origin` with a 403, which the sign-in page shows as
"not allowed" (5.2); Google's library adds a `<style>` tag and `style`
attributes to its placeholder button, which `style-src` blocks, so its logo
flashed at full width before the iframe arrived: `GoogleButton` sizes any
`svg` in its container to 18px, and `style-src` stays without
`'unsafe-inline'`; the other console lines at 5.3 are harmless (a 401 from
`GET /api/me` while signed out, Brave blocking `play.google.com/log`, and
COOP's report-only "would block" from Google's popup) (5.3); no iPhone was at
hand, and the Pixel 9 ran S2.1 to S2.4 in Brave, so the iPhone Safari and
Android Chrome runs come before Stage 3's merge to `main`, as a step in
Stage 3's list (6.4).

### Start

- [x] 0.1 Tick Stage 1's last commit point and write these steps.
- [x] Commit point: Stage 2 steps.

### Google Cloud

- [x] 1.1 Create a Google Cloud project. In Google Auth Platform, set up the
      consent screen: app name Job Applications Tracker, the author's support
      and contact email, no logo; audience External; data access with only
      the `openid` and `.../auth/userinfo.email` scopes. Publishing ("In
      production") also needs a homepage and a privacy policy URL: the
      homepage is `https://jobs.<domain>`, and the privacy policy is a static
      `privacy.html` uploaded to the root domain through cPanel, outside the
      repository. Add the root domain under Authorized domains, then publish.
      With no sensitive scope and no logo, it needs no verification.
- [x] 1.2 Create one OAuth client of type Web application, with the
      authorized JavaScript origins `https://jobs.<domain>`,
      `http://localhost:5173`, `http://localhost:3000` and `http://localhost`,
      and no redirect URIs. Store the client id in the password manager.
      Sign-in uses only the id; the client secret is never stored or used.
- [x] 1.3 Generate two `SESSION_SECRET` values with the command in
      `.env.example`, one for development and one for production. Store both,
      the client id and the allowlist (the author's account and the second
      test account) in the password manager. Fill in `SESSION_SECRET` (the
      development one), `GOOGLE_CLIENT_ID` and `ALLOWED_EMAILS` in this
      computer's `.env`, and in the other computer's before working there.
      S2.2 needs a third account, not on the list.
- [x] 1.4 Compare `securityHeaders()` with what Google Identity Services'
      setup guide says about CSP, COOP and `Referrer-Policy` (helmet's
      default `Referrer-Policy` is `no-referrer`). Note the result for 6.5. If
      a header must change, change `app.test.ts` first, then `security.ts`,
      and add the change to the list at the top of this stage.

### Packages

- [x] 2.1 `pnpm add google-auth-library express-session connect-mongo` and
      `pnpm add -D @types/express-session`. Approve or deny build scripts as
      they come up. Check the majors against "Versions" in the design
      (google-auth-library 11, express-session 1, connect-mongo 6), and that
      `pnpm why mongodb` shows one version, so connect-mongo and Mongoose
      share one driver.

### Server

Each step: write the test, watch it fail, then make it pass.

- [x] 3.1 `server/test/allowlist.test.ts`, then `server/src/auth/allowlist.ts`.
      `parseAllowlist(raw)` splits on commas, trims, lowercases and drops
      blanks: `" Alice@Example.com,, ,bob@example.com "` gives the two
      lowercased emails. `isAllowed(set, email)` lowercases the email first.
- [x] 3.2 `config.test.ts`, then `config.ts`. `readConfig` adds
      `sessionSecret`, `googleClientId`, `allowedEmails` (a `Set` from
      `parseAllowlist`) and `appOrigin`. The Stage 1 cases start from a full
      valid environment (`validEnv()` in the test), so only the variable under
      test is missing or changed. New problems, in the same joined error and
      without any value: `SESSION_SECRET is missing` or `SESSION_SECRET must
      be at least 32 characters` (31 refused, 32 accepted);
      `GOOGLE_CLIENT_ID is missing`; `ALLOWED_EMAILS is missing` (also when
      parsing leaves no email); `APP_ORIGIN is missing` or `APP_ORIGIN must
      be an origin, with no path or trailing slash` (the value must equal
      `new URL(value).origin`). Add the four fields to `testConfig()`:
      allowlist `alice@example.com` and `bob@example.com`, `appOrigin`
      `http://localhost:5173`, and a 32-character secret.
- [x] Commit point: allowlist and config.
- [x] 3.3 `server/test/security.test.ts`, then `writeGuard(appOrigin)` in
      `security.ts`, on a small Express app (pino-http, the guard, one route
      answering 204, the error handler). The `Origin` check runs first: on any
      method but GET and HEAD, a missing or foreign `Origin` gives 403
      `{ error: "Forbidden", requestId }`. Then, on POST and PATCH, a body
      that isn't `application/json` gives 415
      `{ error: "Send JSON", requestId }`. The guard passes both on as an
      `HttpError`. Cases: a form-encoded POST (415), a POST with a foreign
      `Origin` (403), a POST and a DELETE with no `Origin` (403), and a GET
      with no `Origin` (204).
- [x] 3.4 Type `server/src/auth/googleVerifier.ts` (no test: it calls
      Google's servers). It exports `GoogleIdentity`
      (`{ sub, email, emailVerified }`), the `VerifyIdToken` type, and
      `makeGoogleVerifier(clientId)`, which calls
      `OAuth2Client.verifyIdToken({ idToken, audience: clientId })` and maps
      `email_verified` to `emailVerified`. Any failure, or a payload without
      `sub` or `email`, throws `HttpError(401, "Invalid sign-in token")`.
- [x] 3.5 Refactor; the tests stay green. `createApp({ config, logger,
      verifyIdToken })`, and `index.ts` passes
      `makeGoogleVerifier(config.googleClientId)`. In `helpers.ts`, add
      `fakeVerifier` (`"valid:<email>"` gives
      `{ sub: "sub-<email>", email, emailVerified: true }`,
      `"unverified:<email>"` the same with `emailVerified: false`, anything
      else throws `HttpError(401, "Invalid sign-in token")`) and
      `makeTestApp({ logger? })`, which returns `{ app, config }` built from
      `testConfig()`, the fake verifier and a silent logger. `app.test.ts` and
      `health.test.ts` build their app with it after `connectTestDb()`.
- [x] 3.6 `app.test.ts`: on `POST /auth/google` with the test `Origin`,
      malformed JSON gives 400 and a body over 100 KB gives 413, both
      `{ error: "Invalid request body", requestId }`; a JSON POST with no
      `Origin` gives 403. This mounts `express.json()` and the write guard on
      `/auth` and `/api` (pipeline step 5, without the session yet).
- [x] 3.7 `server/test/auth.test.ts`: an allowed sign-in
      (`{ credential: "valid:alice@example.com" }`) gives 200 `{ email }` and
      sets `sid` with `HttpOnly` and `SameSite=Lax`, and with `Secure` only
      when `X-Forwarded-Proto: https` arrives; `readSession(agent)` shows
      `userId: "sub-alice@example.com"` and the email. This brings in
      `server/src/types/express.d.ts` (`SessionData`), `sessionMiddleware`
      (`session.ts`, mounted between `express.json()` and the write guard),
      and `authRouter`'s `POST /google` (`routes.ts`), which sets the
      session's `userId` and `email` and saves it. Add to `helpers.ts`:
      `signIn(agent, email)`, which sets the test `Origin` on the agent and
      posts the credential, and `readSession(agent)`, which reads the stored
      session for the agent's `sid` (the cookie value is
      `s:<id>.<signature>`, URL-encoded; connect-mongo stores `session` as a
      JSON string).
- [x] 3.8 `auth.test.ts`: a missing `credential` gives 400
      `"Missing credential"`; a bad token gives 401 `"Invalid sign-in token"`;
      `"unverified:alice@example.com"` and an unlisted account each give 403
      `"Not allowed"`. Each refusal sends no `Set-Cookie` and leaves the
      `sessions` collection empty.
- [x] 3.9 `auth.test.ts`: signing in again with the same agent gives a new
      `sid` value. This brings in `req.session.regenerate()` before the
      session's fields are set.
- [x] 3.10 `auth.test.ts`: after sign-in, `GET /api/me` gives `{ email }`;
      with no session it gives 401 `"Not signed in"` and no `Set-Cookie`;
      `POST /auth/logout` with `{}` gives 204 and clears `sid`, and the next
      `GET /api/me` gives 401. `app.test.ts`: an anonymous
      `GET /api/anything` now gives 401 (`requireAuth` comes before the JSON
      404), a signed-in one gives the JSON 404, and `GET /auth/anything`
      stays a JSON 404. This brings in `requireAuth` (`requireAuth.ts`),
      `Request.user` in `express.d.ts`, `meRouter`, `POST /logout`, and
      pipeline steps 6 to 8.
- [x] 3.11 `auth.test.ts`: after `config.allowedEmails.delete(...)`, the next
      `GET /api/me` gives 401 and `readSession` finds no session. This brings
      in `requireAuth(getAllowlist)`, with `() => config.allowedEmails` passed
      by `createApp`; `POST /auth/google` reads the same getter.
- [x] 3.12 `auth.test.ts`, with `makeTestApp({ logger })` writing to a
      capture stream (move `captureStream()` from `logger.test.ts` into
      `helpers.ts`): a sign-in logs the message `auth.signin`; a refusal logs
      `auth.refused` with `reason` `"email_unverified"` or `"not_allowed"`;
      no log line contains the email.
- [x] Commit point: sign-in routes.
- [x] 3.13 Check by hand: `pnpm dev:server` starts with the new `.env`, and a
      POST to `http://localhost:3000/auth/google` with
      `Origin: http://localhost:5173` and `{"credential":"x"}` gives 401
      `"Invalid sign-in token"` from the real verifier.

### Client

- [x] 4.1 `client/index.html` loads `https://accounts.google.com/gsi/client`
      with `async`. Type `client/src/types/gsi.d.ts`
      (`window.google.accounts.id.initialize` and `renderButton`, and
      `window.onGoogleLibraryLoad`) and `client/src/types/env.d.ts`
      (`GOOGLE_CLIENT_ID: string` in `ImportMetaEnv`).
- [x] 4.2 `client/src/api.test.ts`, then `client/src/api.ts`:
      `apiFetch<T>(path, { method, body })` and
      `ApiError { status, error, fields, requestId }`. One case per rule: a
      204 gives `undefined`; a JSON success is parsed; a JSON error throws
      with the server's `error`, `fields` and `requestId`; an HTML answer and
      a rejected fetch each throw status 0 with "Couldn't reach the server.
      Try again."; a POST without a body sends `{}`. Tests mock `fetch` with
      `vi.spyOn(globalThis, "fetch")`.
- [x] 4.3 `client/src/session.test.ts`, then `client/src/session.ts`: the
      `['me']` query function maps a 401 from `GET /api/me` to `null`;
      `useSession()` reads it. `apiFetch` calls `markSignedOut()` on a 401
      from `/api/*`, which turns `{ email }` into
      `{ email, signedOut: true }`; a 401 from `/auth/google` doesn't.
- [x] 4.4 `session.test.ts`: `signInWithCredential(credential)` posts to
      `/auth/google`. A 200 sets `['me']` to `{ email }` and refetches the
      other queries. A 403 stores `"refused"` under `['signInError']`, any
      other failure stores `"failed"`, and `['me']` stays as it was; the next
      attempt clears it. `useSignInError()` reads it.
- [x] 4.5 `session.test.ts`: `signOut()` posts `/auth/logout`, clears the
      cache and sets `['me']` to `null`.
- [x] Commit point: client session.
- [x] 4.6 Type `client/src/test/render.tsx`: `renderWithProviders(ui,
      { url = "/" })` renders inside `QueryClientProvider` with the shared
      `queryClient` and a `MemoryRouter` at `url`. In `setup.ts`, stub
      `window.google` (`initialize` and `renderButton` as `vi.fn()`) before
      each test and remove it after.
- [x] 4.7 `client/src/components/GoogleButton.test.tsx`, then
      `GoogleButton.tsx`. With the stub, it renders the button
      (`renderButton` gets its element); without it, it renders once
      `window.onGoogleLibraryLoad` fires; two mounts call `initialize` once
      and `renderButton` twice. `initialize` gets `client_id` from
      `import.meta.env.GOOGLE_CLIENT_ID` (set in the test with
      `vi.stubEnv`), `ux_mode: "popup"`, and a callback that calls
      `signInWithCredential`. The once-per-page-load flag is module state,
      so each case imports a fresh copy (`vi.resetModules()`, then
      `await import()`).
- [x] 4.8 `client/src/pages/SignInPage.test.tsx`, then `SignInPage.tsx`: the
      app's name as the `<h1>`, the Google button, and the message from
      `['signInError']`: "This Google account is not allowed to use this
      app." after a 403 from `POST /auth/google`, "Sign-in failed. Try
      again." after a 401. The tests call `signInWithCredential()` with
      `fetch` mocked. The message is a `SignInError` component exported from
      `SignInPage.tsx`, so the banner shows the same text.
- [x] 4.9 `client/src/components/SignedOutBanner.test.tsx`, then
      `SignedOutBanner.tsx`: "Signed out: sign in again" with the Google
      button; after a 403 from `POST /auth/google`, the refusal message shows
      inside the banner and the banner stays.
- [x] 4.10 `App.test.tsx`, then `App.tsx`, rendered with
      `renderWithProviders`: a 401 on `GET /api/me` shows the sign-in page; a
      200 shows the email and a "Sign out" button in a header above the
      placeholder heading; a rejected fetch shows "Couldn't reach the
      server." and a "Try again" button, which refetches `['me']` (a 200 then
      shows the email). While `['me']` loads, App shows nothing. When
      `['me']` is signed out mid-session, the banner shows above the page.
- [x] Commit point: client sign-in.

### Local check

- [x] 5.1 Run `pnpm check`.
- [x] 5.2 Run `pnpm dev:server` and `pnpm dev:client`. At
      `http://localhost:5173`: sign in with the author's account (the header
      shows the email; DevTools shows `sid` with `HttpOnly` and `Lax`, without
      `Secure`); restart `dev:server` and reload (still signed in: the session
      is in `jobs_dev`); Sign out (the sign-in page); sign in with the third
      account (the refusal message, and no `sid`).
- [x] 5.3 Run `pnpm build`, then the built server with `APP_ORIGIN` set to
      `http://localhost:3000` in the shell, which wins over `.env`
      (PowerShell: `$env:APP_ORIGIN = "http://localhost:3000"`, then
      `node --env-file=.env dist/server/src/index.js`). At
      `http://localhost:3000`, sign in and out: no CSP error in the console,
      and Google's popup closes after the account is picked.
- [x] 5.4 Push `dev` and check that CI passes.

### Deploy

- [x] 6.1 Add S2.1 to S2.4 to `docs/acceptance-checklist.md` (desktop,
      iPhone Safari and Android Chrome).
- [x] Commit point: Stage 2 checklist lines.
- [x] 6.2 In Render's environment, add `SESSION_SECRET` (the production one),
      `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` and
      `APP_ORIGIN=https://jobs.<domain>`, with "Save only": the merge
      deploys. The build reads `GOOGLE_CLIENT_ID` too, so it must be set
      before 6.3.
- [x] 6.3 Merge `dev` into `main` and push. Check that `/healthz` shows
      `main`'s SHA.
- [x] 6.4 Run S2.1 to S2.4 on each device, and add one run log row per device
      and browser.
- [x] 6.5 Add a decision log entry: the setup guide check (1.4), anything
      Google's console or the phones did differently from the design, and the
      changes listed at the top of this stage. Tick the steps.
- [x] Commit point: Stage 2 results (stays on `dev` until Stage 3's merge).

## Stage 3: full schema, create and list

Goal: on `https://jobs.<domain>`, the signed-in account adds an application
with company and role only or with every field, sees it in the list in the
default order, gets a message under the field for bad input with the form
kept, and S3.1 to S3.3 pass on desktop, iPhone Safari and Android Chrome.
Before the merge, S2.1 to S2.4 pass on iPhone Safari and Android Chrome
(carried over from Stage 2's 6.4).

Decided during the stage (recorded in the decision log at 5.5):
the design's Stage 3 has no manual setup, so the only manual work is the
local check, the carried-over phone runs and the checklist; the field
messages in `MESSAGES` are "Required", "At most {n} characters", "Not
allowed", "Must be text", "Must start with http:// or https://", "Not a valid
option", "Use a real date (YYYY-MM-DD)" and "Can't be in the future"; a 400
with `fields` has the `error` "Check the fields", and a body that isn't a
JSON object gets "Invalid request body" (1.1); `"Check the fields"` is
`MESSAGES.checkFields`, since `input.ts` and `errors.ts` both send it (1.1);
`client/src/api.ts` uses the shared `ApiErrorBody` instead of its own
`ErrorBody` (1.3); `normalizeInput` also refuses an empty or `null` status
with "Required", and an absent one keeps the schema's default (2.2);
`trashed()` waits for Stage 5 and `formatTime()` for Stage 4a, the first
stages that use them (2.4, 3.1); the Stage 2 phone runs sit just before the
merge, against the production commit `25b7557` (5.2).

### Start

- [x] 0.1 Tick Stage 2's last commit point and write these steps.
- [x] Commit point: Stage 3 steps.

### Shared

- [x] 1.1 Type `shared/fields.ts` (data only, no test): `STATUSES`
      (`saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`,
      `no_response`, `as const`), `STATUS_LABELS` (Saved, Applied,
      Interviewing, Offer, Rejected, Withdrawn, No response),
      `OPEN_STATUSES` (saved, applied, interviewing), `CLOSED_STATUSES` (the
      other four), `WORK_MODES` (`remote`, `hybrid`, `onsite`) and
      `WORK_MODE_LABELS` (Remote, Hybrid, On-site), `LIMITS` (company 150,
      role 150, jobUrl 2048, location 150, salaryRange 100, nextStep 1000,
      jobDescription 10000, coverLetter 10000, note 2000), `WRITABLE_FIELDS`
      (company, role, status, appliedDate, jobUrl, location, salaryRange,
      workMode, nextStep, jobDescription, coverLetter), `MESSAGES` (the texts
      in the list at the top of this stage; `tooLong(n)` builds "At most
      {n} characters" with the number formatted by `toLocaleString("en-US")`),
      and the types `Status`, `WorkMode` and `WritableField`. No `enum`.
- [x] 1.2 `shared/bullets.test.ts`, then `shared/bullets.ts`:
      `cleanBullets(text)` replaces `/(?<=\S)[ \t]*•/gu` with `"\n•"`.
      `a•b`, `a •b` and `a\t•b` each give `a\n•b`; `•a` and `a\n•b` are
      unchanged; running it twice gives the same result; text with no bullet
      is unchanged.
- [x] 1.3 Type `shared/api.ts`: `StatusHistoryEntry` (`{ status, changedAt }`,
      an ISO string), `ApplicationInput` (company and role `string`, status
      `Status`, workMode `WorkMode | null`, the other seven `string | null`,
      with `appliedDate` as `YYYY-MM-DD`), `ApplicationSummary` (`id, company,
      role, status, appliedDate, location, workMode, salaryRange, nextStep,
      createdAt`), `ApplicationDetail` (the summary plus `jobUrl,
      jobDescription, coverLetter, statusHistory, deletedAt, updatedAt`; no
      `notes` until Stage 4b) and `ApiErrorBody` (`{ error, fields?,
      requestId }`). `client/src/api.ts` imports `ApiErrorBody` in place of
      its local `ErrorBody`, which proves the client reaches `shared/`
      (imports use the `.js` extension, as on the server). Run
      `pnpm typecheck` and `pnpm test`; if `tsc -b client` reports TS6307,
      add `../shared` to `client/tsconfig.app.json`'s `include`.
- [x] Commit point: shared fields and types.

### Server

Each step: write the test, watch it fail, then make it pass.

- [x] 2.1 `server/test/dates.test.ts`, then `server/src/lib/dates.ts`.
      `parseDay(s, now)` returns a UTC-midnight `Date`, or the message
      string: `2026-11-14` gives `Date.UTC(2026, 10, 14)`; `2026-02-30`,
      `2026-2-3` and `""` give "Use a real date (YYYY-MM-DD)". With `now` at
      `2026-11-14T23:30` New York time (`2026-11-15T04:30Z`), `2026-11-16` is
      accepted and `2026-11-17` gives "Can't be in the future".
      `formatDay(date)` gives `YYYY-MM-DD` in UTC: `Date.UTC(2026, 10, 14)`
      gives `2026-11-14` although New York is still on the 13th.
- [x] 2.2 `server/test/input.test.ts`, then
      `server/src/applications/input.ts`. `normalizeInput(body,
      { partial })` collects every field problem into one
      `HttpError(400, "Check the fields", fields)`; a body that isn't a plain
      object (an array, a string, `null`) gives
      `HttpError(400, "Invalid request body")`. Cases: `userId` and `notes`
      give "Not allowed"; a number, an array and an object each give "Must
      be text" for that field; strings are trimmed; an empty or `null`
      optional field, `appliedDate` included, becomes `null`; on create
      (`partial: false`) a missing, empty or `null` company or role gives
      "Required", and on PATCH (`partial: true`) only the fields sent are
      checked, so `{}` gives `{}`; `jobDescription` comes back with its
      bullets cleaned; a bad date gives the date message; `appliedDate`
      comes back as a `Date`.
- [x] Commit point: dates and input.
- [ ] 2.3 `errors.test.ts`: a Mongoose `ValidationError` (from
      `validateSync()` on a small schema in the test, with two failing paths)
      gives 400 `{ error: "Check the fields", fields, requestId }` with one
      message per path. This brings in the mapping in `errors.ts`.
- [ ] 2.4 Add `buildInput(overrides)` to `helpers.ts`: a valid
      `ApplicationInput` with every field filled.
      `server/test/applications.test.ts`: signed in as Alice, `POST /api/applications` with company and role only
      gives 201 with status `saved`, `statusHistory` of one
      `{ status: "saved", changedAt }`, `appliedDate: null`, `deletedAt: null`,
      and exactly the `ApplicationDetail` keys. This brings in `model.ts`
      (the schema with messages from `MESSAGES`, the `statusHistory`
      subschema with `_id: false`, the index, and the `toJSON` transform that
      maps `_id` to `id`, drops `__v` and `userId`, and formats `appliedDate`
      with `formatDay`), `repo.ts` (`active(userId)` and `create(userId,
      input)`, which writes the first history entry; `trashed()` comes in
      Stage 5) and `routes.ts`'s `POST /`, mounted by `createApp` on
      `/api/applications` after `requireAuth`.
- [ ] 2.5 `applications.test.ts`: `buildInput()` round-trips every field,
      with `appliedDate` as `YYYY-MM-DD`; a create with status `applied` gives
      a first history entry of `applied`.
- [ ] 2.6 `applications.test.ts`: each of these gives 400
      `{ error: "Check the fields", fields, requestId }` naming the field,
      and writes no document: no company ("Required"); a 151-character role
      ("At most 150 characters"); `jobUrl` `javascript:alert(1)` ("Must start
      with http:// or https://"); `workMode` `"office"` and `status` `"done"`
      ("Not a valid option"); `appliedDate` `2999-01-01` ("Can't be in the
      future"); `"ab•".repeat(3000)` as the description, 9,000 characters that
      cleanup turns into 12,000 ("At most 10,000 characters"); a posted
      `userId` ("Not allowed"). The length, URL and option rules live in the
      schema, with `runValidators` on later updates.
- [ ] 2.7 `applications.test.ts`: `GET /api/applications` gives exactly the
      `ApplicationSummary` keys for each row, and leaves out a row whose
      `deletedAt` was set through the model. This brings in
      `listActive(userId)` with a projection, and `routes.ts`'s `GET /`.
- [ ] 2.8 `server/test/crossUser.test.ts`: Alice creates an application;
      Bob's `GET /api/applications` doesn't include it.
- [ ] Commit point: applications routes.

### Client

- [ ] 3.1 `client/src/lib/dates.test.ts`, then `client/src/lib/dates.ts`.
      With `vi.useFakeTimers({ toFake: ["Date"] })` at `2026-11-14T23:30` New
      York time, `todayLocal()` gives `2026-11-14`. `displayDay("2026-11-14")`
      gives `Nov 14, 2026` (`en-US`, `dateStyle: "medium"`,
      `timeZone: "UTC"`), so the day doesn't shift. `formatTime()` comes in
      Stage 4a.
- [ ] 3.2 `client/src/lib/listView.test.ts`, then `client/src/lib/listView.ts`:
      `sortApplications(list)` returns a new array: rows with no applied date
      first, then applied date newest first; ties (both empty, or the same
      date) by `createdAt` newest first.
- [ ] 3.3 Type `client/src/components/CharCounter.tsx`: `n / limit` (numbers
      with `toLocaleString("en-US")`), red (`text-red-700`) only when `n` is
      over the limit.
- [ ] Commit point: client helpers.
- [ ] 3.4 `client/src/pages/ListPage.test.tsx`, then `ListPage.tsx`: loads
      `['applications']` and shows a `<h1>` "Applications", a "New
      application" link to `/applications/new`, and a table with Company,
      Role and Status on all widths, and Location, Applied (`displayDay`) and
      Work mode (its label) from `sm` (`hidden sm:table-cell`). Cases: rows in
      the default order from an unsorted response, each with company, role
      and status label; an empty list shows "No job applications yet. Add one
      to get started."; a failed load shows the `ApiError`'s message and a
      "Try again" button. While loading, it shows "Loading…".
- [ ] 3.5 Type `client/src/pages/NotFoundPage.tsx`: a `<h1>` "Not found" and
      a "Back to the list" link to `/`.
- [ ] 3.6 `client/src/pages/ApplicationFormPage.test.tsx`, then
      `ApplicationFormPage.tsx`: a `<h1>` "New application" and the eleven
      fields, labelled Company, Role, Status, Applied date, Job URL, Location,
      Salary range, Work mode, Next step, Job description and Cover letter.
      Status defaults to Saved; Work mode's empty option is "Not set" and
      sends `null`; Applied date is `<input type="date">`; job description
      and cover letter are textareas with a `CharCounter` (the description
      counts `cleanBullets(value).length`). The form has `noValidate`, and no
      `maxLength`, `required` or `pattern`. Each field message shows under its
      field (`aria-describedby`); any other error shows above Save. Save
      posts, then invalidates `['applications']` and goes to `/`; a "Cancel"
      link goes to `/`. Cases, rendered through `App` at `/applications/new`
      with `GET /api/me` answering 200: a 400 with `fields.company` shows
      "Required" under Company; a 401 keeps every typed value and shows the
      banner; an HTML answer keeps every typed value and shows "Couldn't
      reach the server. Try again."; a second click while the POST is pending
      sends no second request.
- [ ] 3.7 `App.test.tsx`, then `App.tsx`: routes `/` (`ListPage`),
      `/applications/new` (`ApplicationFormPage`) and `*` (`NotFoundPage`).
      The header gains the app's name as a link to `/` and a "New" link to
      `/applications/new`; the placeholder heading goes. The Stage 2 cases
      that look for the placeholder heading look for the list's heading
      instead.
- [ ] Commit point: list and create pages.

### Local check

- [ ] 4.1 Run `pnpm check`.
- [ ] 4.2 Run `pnpm dev:server` and `pnpm dev:client`. At
      `http://localhost:5173`: add one with company and role only (top of
      the list, Saved); add one with a 151-character company (the message
      under Company, every value kept); add one with every field, pasting a
      description with inline bullets (the counter counts the cleaned text,
      and the saved row sits in the default order). In DevTools' responsive
      mode at 360 px, the list shows company, role and status only, with no
      sideways scrolling.
- [ ] 4.3 Push `dev` and check that CI passes.

### Deploy

- [ ] 5.1 Add S3.1 to S3.3 to `docs/acceptance-checklist.md` (desktop,
      iPhone Safari and Android Chrome).
- [ ] Commit point: Stage 3 checklist lines.
- [ ] 5.2 Stage 2's phone runs: on production, still `25b7557` until 5.3, run
      S2.1 to S2.4 in iPhone Safari and in Android Chrome, and add one run log
      row for each. S2.2 needs the third account; S2.4 needs a manual
      redeploy from Render. This can happen any time before 5.3. A failure is
      fixed on `dev` first and recorded for 5.5.
- [ ] 5.3 Once 5.2 is ticked, merge `dev` into `main` and push. Check that
      `/healthz` shows `main`'s SHA. No new environment variables.
- [ ] 5.4 Run S3.1 to S3.3 on each device, and add one run log row per device
      and browser. The applications they add stay in `jobs_prod` until Delete
      forever arrives in Stage 5, so give them a company that says "Test".
- [ ] 5.5 Add a decision log entry: the Stage 2 phone runs (5.2), anything the
      phones did differently from the design, and the changes listed at the
      top of this stage. Tick the steps.
- [ ] Commit point: Stage 3 results (stays on `dev` until Stage 4a's merge).
