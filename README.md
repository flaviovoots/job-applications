# Job Applications Tracker

A web app for tracking job applications: each application's details, its
status and status history, notes, and a Trash with Restore. Users sign in with
Google, and only allowlisted accounts get in.

One Express 5 service (TypeScript, Mongoose) serves both the JSON API and the
React client (Vite, Tailwind CSS) from one origin. It runs on Render, with the
data in MongoDB Atlas.

- Design (the source of truth):
  [docs/designs/job_applications_tracker_design.md](docs/designs/job_applications_tracker_design.md)
- Changes since the design: [docs/decision-log.md](docs/decision-log.md)
- Steps for the current stage: [docs/steps.md](docs/steps.md)

## Setting up a computer

1. Install Node 24 (the 24.x line, not the newest LTS). `node -v` should
   print `v24.`.
2. From outside the repository, install pnpm with npm:
   `npm i -g pnpm@12.18.0`. `pnpm -v` should print `12.18.0`. If it doesn't
   on Windows, see "pnpm on Windows" below.
3. Clone the repository and switch to `dev`:

   ```sh
   git clone https://github.com/flaviovoots/job-applications.git
   cd job-applications
   git switch dev
   ```

4. Set this repository's commit email to the GitHub noreply address, so no
   personal email lands in the public history:

   ```sh
   git config user.email "20058311+flaviovoots@users.noreply.github.com"
   ```

5. Run `pnpm install`. Build scripts are already approved or denied in
   `pnpm-workspace.yaml`.
6. Copy `.env.example` to `.env` and fill in the secrets from the password
   manager.
7. Run `pnpm test`. When the time zone guard tests pass, the computer is
   ready.

### pnpm on Windows

Don't let an older pnpm switch to 12.18.0 itself: on Windows it downloads
pnpm 12 without running its install script, and the result "is not
recognized". To fix it, in Git Bash:

- Delete the broken download:
  `rm -rf "$LOCALAPPDATA/pnpm/.tools/pnpm/12.18.0"`.
- If `which -a pnpm` lists a standalone pnpm in `$LOCALAPPDATA/pnpm` before
  npm's copy, rename its `pnpm`, `pnpm.CMD`, `pnpx` and `pnpx.CMD` shims to
  `*.bak`.

## Branches and deploys

- Work happens on `dev`, pushed from either computer. CI runs on every push.
- `dev` is merged into `main` at the end of each stage, and for fixes. Each
  merge into `main` deploys to Render once CI passes on it.
- Nothing is committed to `main` directly.

## Backups

Export the data once a week (`GET /api/export`, from Stage 5 on) and keep the
file somewhere safe. The export is the only backup.

## Scripts

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `pnpm dev:server`   | Runs the API with `tsx`, restarting on changes     |
| `pnpm dev:client`   | Runs the Vite dev server for the client            |
| `pnpm build`        | Builds the client, then compiles the server        |
| `pnpm start`        | Runs the built server from `dist/`                 |
| `pnpm test`         | Runs all tests once                                |
| `pnpm test:watch`   | Runs the tests in watch mode                       |
| `pnpm lint`         | Lints with oxlint                                  |
| `pnpm format`       | Checks formatting with Prettier                    |
| `pnpm format:write` | Formats every file with Prettier                   |
| `pnpm typecheck`    | Type-checks the client, the server and the tests   |
