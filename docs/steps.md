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
- [ ] 6.2 Merge `dev` into `main` and push. (Render isn't set up yet, so
      nothing deploys.)
