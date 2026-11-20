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
- [ ] Commit point: Stage 1 results (stays on `dev` until Stage 2's merge).
