# Decision log

Decisions made after the
[design](designs/job_applications_tracker_design.md), newest first. Where an
entry differs from the design, the entry wins.

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
