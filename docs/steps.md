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
- [x] 0.2 Check that `pnpm -v` works. Once `packageManager` is set (step 2.3),
      pnpm switches to 12.18.0 by itself inside this repository.

### Repository basics

- [x] 1.1 Create the `dev` branch from `main`. All Stage 0 work happens on it.
- [x] 1.2 Type `.gitignore`.
- [x] 1.3 Type `.gitattributes`.
- [x] 1.4 Type `.node-version`.
- [x] 1.5 Type `.env.example`.
- [x] Commit point: repository basics.

### Packages and the client template

- [ ] 2.1 Generate the client with the Vite react-ts template, then review
      each generated file line by line.
- [ ] 2.2 Delete the demo files and the template's `client/README.md` and lint
      config. Merge `client/.gitignore` into the root one.
- [ ] 2.3 Create the root `package.json`, merge in the template's
      `package.json`, then delete the template's copy.
- [ ] 2.4 Type `pnpm-workspace.yaml`.
- [ ] 2.5 Run `pnpm install`, and approve or deny build scripts as they come up.
- [ ] 2.6 Add Tailwind (typed from its install guide): the Vite plugin, and the
      one-line `client/src/index.css`. Add `envDir` and `envPrefix` to
      `client/vite.config.ts`.
- [ ] Commit point: client template and packages.

### Tooling

- [ ] 3.1 Type `.prettierrc` and `.prettierignore`.
- [ ] 3.2 Generate `server/tsconfig.json` with `tsc --init`, review it,
      then edit it to the settings in the plan.
- [ ] 3.3 Type `tsconfig.test.json`.
- [ ] 3.4 Type the one-line `server/src/index.ts` placeholder.
- [ ] 3.5 Run `pnpm format:write` once, so the generated files pass `format`.
- [ ] Commit point: tooling.

### Tests

- [ ] 4.1 Type `vitest.config.ts` (two projects, `TZ` set at the top).
- [ ] 4.2 Type `client/src/test/setup.ts`.
- [ ] 4.3 Write `server/test/tz.guard.test.ts` and watch it pass, then
      temporarily remove the `TZ` line to watch it fail (the red step).
- [ ] 4.4 Write `client/src/tz.guard.test.ts` the same way.
- [ ] Commit point: test runner and guard tests.

### CI and docs

- [ ] 5.1 Type `.github/workflows/ci.yml`.
- [ ] 5.2 Type `README.md`.
- [ ] 5.3 Type `docs/acceptance-checklist.md` (the two tables, no lines yet).
- [ ] 5.4 Type `docs/decision-log.md` (the first entry).
- [ ] 5.5 Run `lint`, `format`, `typecheck`, `test` and `build` locally.
- [ ] Commit point: CI and docs.

### Finish

- [ ] 6.1 Push `dev` and check that CI passes on GitHub.
- [ ] 6.2 Merge `dev` into `main` and push. (Render isn't set up yet, so
      nothing deploys.)
