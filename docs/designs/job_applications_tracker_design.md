# Job Applications Tracker (standalone rebuild)

*   **Author:** Flavio Pereira
*   **Status:** Proposed
*   **Date:** 2026-11-14 (updated 2026-11-16)
*   **Brief:** the project brief, kept outside this repository (two design
    reviews, 2026-11-12 and 2026-11-13)
*   **Source of truth:** this design replaces the brief. The brief is kept as
    history, and `docs/decision-log.md` records changes made after this
    design.

--------------------------------------------------------------------------------

## Overview

This project rebuilds the Job Applications section of the author's PHP MVC app
as a separate web app. The old app stays in use as its own system, with its own
database. Nothing connects the two. The old code serves only as a reference for
behavior.

One Node.js service (Express 5, Mongoose, TypeScript) runs on Render's free
tier. It serves the JSON API and the built React client (Vite, Tailwind CSS v4)
from one origin, a subdomain of the author's own domain. Because the browser
sees one origin, the session cookie is first-party and no CORS setup is needed.
Data lives in MongoDB Atlas on the free tier. Users sign in with Google. Only
accounts on an allowlist can get in, and each user sees only their own
applications.

The app tracks job applications: eleven fields, seven statuses, notes, a status
timeline, and a Trash with Restore and Delete forever. It also carries over four
features from the old app: status badge colors, autocomplete, bullet cleanup in
job descriptions, and a right-click row menu.

The work has two aims, in this order:

1.  **Build it by hand, test first.** The author writes the code in small
    steps, with tests written first. Only boilerplate setup files (the Vite
    react-ts template, tsconfig) are generated, and each is reviewed line by
    line before it is committed.
2.  **Use the app.** Production holds practice data until done (Goal 1). After
    the final checklist run, production is wiped and real use starts.

The build runs in Stages 0 to 6, with Stage 4 split into 4a and 4b (see
"Detailed Implementation Plan"). Each stage is deployed before the next one
starts. The target date for done is 2027-01-31.

**Proposed solution, in short:** a single Express service that serves both the
API and the client, sessions stored in Mongo so they survive restarts, one
data-access module that scopes every query to the signed-in user and to active
or trashed items, and a build order in which the riskiest parts (sign-in behind
Render's proxy, the custom domain, the deploy pipeline) are live by Stage 2.

## The Problem

The author wants an app worth using during a job search, built end to end on a
current JavaScript stack. Rebuilding a known app fixes the feature set, so the
work goes into building it well.

The old app's Job Applications section works, but the reviews of the brief found
gaps that a rebuild should not copy:

*   **Row actions need a right-click.** In the old list, the right-click menu was
    the only way to view, edit, add notes or delete. Touch screens have no
    dependable right-click: a long-press on iPhone Safari doesn't open a page's
    own menu (to be confirmed on the author's iPhone in Stage 6). On a phone
    those actions can't be reached.
*   **Deleting an application can't be undone.** The old app soft-deleted
    applications but had no restore. It also had no status history, so a past
    status was lost as soon as it changed.
*   **Bad input is changed without telling the user.** Over-long text was cut
    without a warning. An invalid status or work mode was replaced with a
    default (a missing work mode became "remote"). A malformed date kept its old
    value.
*   **The API revealed which records exist.** Another user's record returned 403
    and a missing one returned 404, so a 403 confirmed that the id exists.
*   **The statuses miss two common cases.** There was no status for a posting
    saved but not yet applied to, and none for an application that never got a
    reply.

The rebuild also has fixed constraints:

*   **Free hosting.** Render's free web service stops after 15 minutes without
    traffic and takes about a minute to start again. Anything kept in server
    memory is lost each time. Atlas's free cluster has 0.5 GB of storage.
*   **Small scale.** One user plus one test account, and a few hundred
    applications at most.
*   **A fixed date.** Done by 2027-01-31. The fallback is decided on
    2027-01-24, a week before, so the full checklist run still fits: if Stage 6
    is not deployed by then, done becomes Stages 0 to 5 (through Trash, Restore
    and Export) with a full run of their lines, and Stage 6 ships after real use
    starts; it adds no fields. If only the row menu is unfinished, only it is
    cut. Skipping tests-first or generating code that should be typed is not the
    fallback. Both checkpoints are under "Risks and Mitigations".
*   **Hand-typed code.** Every line the author types costs time, so the design
    avoids code that a declaration, a library already chosen, or the platform
    can replace.

## Goals

Each goal has a check that decides whether it is met.

1.  **Done by 2027-01-31.** The app runs on Render at the custom domain, with
    every stage (0, 1, 2, 3, 4a, 4b, 5 and 6) deployed, or Stages 0 to 5
    under the fixed-date rule in "The Problem". CI passes on the commit that
    `/healthz` reports. The whole acceptance checklist
    (`docs/acceptance-checklist.md`) passes on production from a desktop
    browser, iPhone Safari and Android Chrome, and the run is logged with its
    date, commit, devices and a result per step.
2.  **Each stage is checked when it ships.** A stage counts as finished only when
    it is deployed, CI passes on its commit, and its own checklist lines pass on
    production. From Stage 2 on, that includes both phones.
3.  **The code is hand-written, test first.** The author writes all code
    except the generated setup files, which are reviewed line by line. Every
    feature starts with a failing test.
4.  **Only allowed accounts get in, and each sees only their own data.**
    *   Sign-in uses a Google ID token, checked on the server. Accounts not on
        the `ALLOWED_EMAILS` list get a 403 and a visible message, and no
        session is created.
    *   The allowlist is checked again on every request, so removing an account
        ends its access.
    *   Another user's id, a missing id and a malformed id all return the same
        404. Every data route has an automated cross-user test (see "Tests").
5.  **Input is accepted, or refused with a reason.** Every field has a written
    rule (type, required, length cap, format). Input that breaks a rule gets a
    400 that names the field. No value is cut short, replaced or silently kept.
    The only changes the server makes are documented: trimming, empty to
    `null`, and bullet cleanup of `jobDescription`. The client can never write `userId`, `deletedAt`,
    `statusHistory`, note ids or timestamps.
6.  **A mistake does not lose data.**
    *   Move to Trash can be undone with Restore, which brings back the notes and
        history unchanged.
    *   Delete forever asks first, naming the company and role.
    *   The server records every status change in an append-only history.
    *   `GET /api/export` downloads all of the user's applications, notes and
        history as JSON.
7.  **Every action can be done by tapping, on a 360 px wide screen.** Tapping a
    row opens the detail page, which holds every action for that application.
    Trash rows have visible Restore and Delete forever buttons. On phones the
    list shows company, role and the status badge only.
8.  **Restarts cost time, not data or sign-ins.** Sessions are stored in Mongo,
    so a sleep, restart or redeploy doesn't sign the user out. A session lasts 30
    days and renews on each visit. The checklist has a step that signs in,
    redeploys, and confirms the user is still signed in.
9.  **The four old-app features come back.** These are the seven
    status badge colors, autocomplete for company, role and location, bullet
    cleanup of job descriptions on save, and the right-click menu as a desktop
    shortcut to the actions on the detail page. Each one has its own checklist
    step.
10. **Notes work per application.** The user can add, list, edit and delete notes
    of up to 2,000 characters each. Notes are shown newest first, and edited
    notes are marked "edited". Deleting a note asks first.

## Non-Goals

*   **Replacing or retiring the old app.** It stays in use as a separate system.
*   **Importing old data.** The new app starts empty. Nothing is moved from the
    old database, including applications still in progress.
*   **The resume library** and the old `resume_id` field. These belong to a later
    phase.
*   **Automatic purge of Trash, and an "Empty Trash" button.** Trashed items stay
    until the user picks Delete forever on each one.
*   **Avoiding cold starts.** The app accepts the free tier's sleep and its wake-up
    delay of about a minute. There is no keep-alive ping and no paid instance.
*   **Server-side pagination,** and any port of the old DataTables list. The list
    is loaded once and searched, filtered and sorted on the client.
*   **Infrastructure for scale:** caching, Redis, queues, more than one instance.
*   **End-to-end browser tests.** The manual checklist covers end-to-end flows.
    Automated tests cover what a browser can't show, such as Delete forever
    leaving nothing behind and cross-user 404s.
*   **A Kanban board, an undo toast, and a date field per status.**
*   **Split hosting** (client and API on separate origins) and **a local-only
    app**.
*   **Back-dated or editable history entries.** A wrong status is fixed by
    changing it again.
*   **Restoring a deleted note in the app.** A deleted note stays in the
    database and can be recovered only by editing it by hand. Notes differ from
    applications on purpose: the author chose to keep deleted note text
    recoverable by hand, as in the old app, rather than build a restore for
    notes.
*   **Email and password sign-in.** It is not built in the MVP, but the data
    model must allow adding it later without renaming or removing a field (see
    "Data model" and "Future Improvements").

## Future Improvements

These follow the Non-Goals above; they are the next phase, not the MVP.

*   **Email and password sign-in:** add a `users` collection (`email` with a
    unique index, `passwordHash`), and give each password user a generated id
    string as their `userId`. The same `ALLOWED_EMAILS` check applies.
*   **The resume library** and the `resumeId` field, with the old app's check that
    a user can't attach another user's resume.

## Open Questions

No design questions are open. Every question raised while drafting was decided
by the author on 2026-11-14 or 2026-11-15 (see "Decisions since the brief").

Three vendor facts are checked during the build:

*   Whether free instances get Render's health check (Stage 1, manual step 4).
*   Whether Render's Corepack runs pnpm 12 (the first Stage 1 build).
*   The CSP and COOP values, against Google's Identity Services setup guide
    (Stage 2).

## Decisions since the brief

### Changes to the brief

The author decided these while drafting, on 2026-11-14 unless a row gives
another date. Each one replaces or adds to a decision in the brief.

| Topic | Brief | This design | Why |
| --- | --- | --- | --- |
| Mongoose | Mongoose 8 | **Mongoose 9** | Current major since 2025-11-21. None of the breaking changes in the 9.x migration guide (checked 2026-11-14) affect the APIs this design uses. |
| Trash routes | Not decided | **Separate `/api/trash` prefix** | The URL prefix sets the scope, so a trashed id under `/api/applications` is a 404 with no extra code. |
| Domain | "a subdomain, e.g. `jobs.<domain>`" | **`jobs.<domain>`** | Short, and matches the brief. |
| `onrender.com` | Not decided | **Disabled in Render** once the custom domain is verified | Render answers 404 itself; no code. Health checks use the custom domain as their Host. |
| Atlas access | `0.0.0.0/0`, "free tier has no fixed outbound IP" | **`0.0.0.0/0`, reason corrected** | See "Security and privacy". |
| `shared/` imports | "one Vite alias and one tsconfig path" | **Relative paths** (`../../shared/fields.js`) | `tsc` does not rewrite `paths` aliases, so the compiled server would fail at startup without an extra rewrite tool. |
| Lint and TypeScript | ESLint and Prettier | **oxlint and Prettier, TypeScript 7** | The current Vite template generates TypeScript ~7.0 and oxlint. typescript-eslint supports only TypeScript below 6.1. |
| Package manager | npm | **pnpm 12** | Author's choice. |
| Security headers | Not decided | **helmet**, with CSP and COOP set for Google sign-in | A second defense against XSS and framing. |
| Users | "users keyed by `sub`" | **No `users` collection** (2026-11-15). `applications.userId` is a string holding the verified Google `sub`. | Nothing reads a user document today. A later password user gets a generated id string in the same field, which adds values and renames nothing. |
| Status of a new application | "A new application starts as `saved`" | **Any status on create; the form defaults to Saved.** The first history entry records the starting status. | Logging an application that was already sent would otherwise record a false "saved" entry, followed by a second change. |
| Repository visibility | Assumed GitHub push protection | **Public repository**, with secret scanning and push protection on | Push protection is free only on public repositories, and a public project can be shown during the job search. |
| Development on two computers | Not covered | **No Docker.** Version pins, the lockfile, the shared Atlas dev database, and a committed `.env.example` | Render runs native Node, not a container. Pins make Node, pnpm and dependency versions match production; `.env` is filled from `.env.example` plus a password manager. |
| Stage order | List tools (search to row menu) before Trash, and the export in the Done check | **Trash, Restore and Export (Stage 5) before the list tools (Stage 6)** (2026-11-15). **The timeline moves into Stages 4a and 5** (2026-11-16). | Restore and the export protect the first real record, and the app starts empty, so list tools are worth the least on day one. The brief allowed it ("Stages 5 to 7 can move in the order"). With the timeline folded in, the fixed-date rule can't cut it. |
| Deploy branch | A release branch was one option | **Work on `dev`; each merge to `main` deploys** (2026-11-16) | One deploy per stage keeps build minutes low and keeps half-finished work off production when switching computers. |

### Choices made in this draft

These follow from a stated constraint or a decision above. They are listed so
the author can overrule them.

*   **Node 24 LTS.** Node 24 still ships Corepack, which Render uses to pin
    pnpm. Node 25 and later do not. The Vite template also targets
    `@types/node` 24.
*   **Unknown or server-only fields in a request body get a 400** naming the
    field, for example `{ fields: { userId: "Not allowed" } }`. They are never
    silently dropped.
*   **The session middleware runs only on `/auth` and `/api`,** so static files
    never touch the session store.
*   **`shared/` also holds the API's request and response types.** The client
    is checked against them at compile time. The server's responses are
    checked by route tests that assert each response's exact keys.
*   **Search, filter and sort live in the URL query** (`?q=&status=&sort=&dir=`).
    Going back from a detail page restores the list as it was. `status` is
    `all` (the default), `open`, `closed` or one status. `sort` is `company`,
    `role`, `status` or `appliedDate`, and is absent for the default order.
    `dir` is `asc` or `desc`. An invalid value falls back to the default. A
    column header's first click sorts A to Z (newest first for applied date),
    and the next click reverses it. Updates replace the current history entry,
    so Back leaves the list instead of undoing keystrokes. In Trash, search,
    filter and sort don't apply.
*   **Sortable columns:** company, role, status and applied date. Company and
    role compare with `localeCompare(..., { sensitivity: 'base' })`. Rows
    without an applied date stay at the top in both directions. Ties sort by
    created date, newest first.
*   **The Trash list sorts by `deletedAt`, newest first.**
*   **A trashed application's read-only page is `/trash/:id`,** which matches
    the API.
*   **The timeline lists entries oldest first,** so it reads in order.
*   **Confirmations use `window.confirm()`,** which works on both phones
    (checked in the Stage 4b checklist).
*   **The row menu uses the native Popover API** (`popover="auto"`), which closes
    on Escape and on a click outside with no code. It is a plain list of
    buttons, without `role="menu"`, because that role requires arrow-key
    handling.
*   **The export includes trashed applications,** because they can still be
    restored. Deleted notes are left out, because the app can't restore them.
*   **`NODE_ENV` is never set on Render.** pnpm skips devDependencies when it is
    `production`, which would skip `tsc` and `vite` at build time. The app
    doesn't read `NODE_ENV` at all. The central error handler catches every
    error, so Express's own handler, which shows stack traces when `NODE_ENV`
    is unset, never runs.

## Critical User Journeys (CUJs)

### CUJ 1: Sign in on a new device

*   **Given**: an account on `ALLOWED_EMAILS`, no session cookie in this
    browser, and the Render service asleep.
*   **When**: the user opens `https://jobs.<domain>`, waits through Render's
    loading page, taps "Sign in with Google" and picks the account in Google's
    popup.
*   **Then**: the server checks the Google ID token and the allowlist, then
    creates a session. The list loads and the header shows the account's
    email. A later redeploy or sleep does not sign the user out.

### CUJ 2: An account that is not allowed

*   **Given**: a Google account that is not on `ALLOWED_EMAILS`.
*   **When**: it signs in.
*   **Then**: the server answers 403. The page shows "This Google account is not
    allowed to use this app." No session is created and no cookie is set.

### CUJ 3: Save a posting, then apply

*   **Given**: a signed-in user.
*   **When**: they open New, fill in company and role, paste a job description
    and save. Days later, they open the application and change its status to
    Applied in the quick status control.
*   **Then**: the new application has status Saved and no applied date, so it
    sorts at the top of the list. Bullets in the pasted description each start a
    new line. When the status changes to Applied, the date field fills in
    today's local date, which the user can change before saving. After saving,
    the history holds two entries, and the row moves into date order.

### CUJ 4: Notes

*   **Given**: an active application.
*   **When**: the user adds a note, edits it, adds a second note, then deletes
    the first one and confirms.
*   **Then**: notes show newest first. The edited note is marked "edited". The
    deleted note disappears from the app and can't be restored there.

### CUJ 5: Move to Trash and Restore

*   **Given**: an active application with notes and two history entries.
*   **When**: the user taps Move to Trash on its detail page, opens `/trash`,
    taps the row, then taps Restore.
*   **Then**: Move to Trash happens at once, with no confirmation. The
    application leaves the list and the autocomplete. In
    Trash, its detail page is read-only and shows its fields and timeline but
    no notes. After Restore, it is back in the list with its notes and history
    unchanged.

### CUJ 6: Delete forever

*   **Given**: a trashed application.
*   **When**: the user taps Delete forever and confirms a message that names its
    company and role.
*   **Then**: the application, its notes and its history are gone. Its old URLs
    show "Not found", and the export no longer contains it.

### CUJ 7: Work from a phone

*   **Given**: iPhone Safari or Android Chrome on a screen 360 px wide.
*   **When**: the user opens the list and taps a row.
*   **Then**: the list shows company, role and status badge only, with no
    sideways scrolling. The detail page holds every action: edit, status change,
    notes and Move to Trash.

### CUJ 8: Desktop shortcut

*   **Given**: a desktop browser.
*   **When**: the user right-clicks a row, or focuses it with Tab and presses the
    Menu key or Shift+F10.
*   **Then**: a menu opens with View, Edit, Notes and Move to Trash. Escape or a
    click outside closes it.

### CUJ 9: Another account's URL

*   **Given**: account A owns an application. Account B is signed in.
*   **When**: B opens A's `/applications/:id` URL.
*   **Then**: B sees "Not found". The API answered 404, exactly as it does for an
    id that never existed.

### CUJ 10: Export

*   **Given**: a signed-in user with active and trashed applications.
*   **When**: they click Export.
*   **Then**: the browser downloads `job-applications-YYYY-MM-DD.json`, which
    holds all of their applications (active and trashed) with notes and history.

### CUJ 11: Session ends while editing

*   **Given**: an edit form with unsaved changes, and a session that has ended
    (expired, or the account was removed from the allowlist).
*   **When**: the user taps Save.
*   **Then**: the API answers 401. The form keeps every value, and a banner says
    "Signed out: sign in again" with a Google button. After signing in, the user
    taps Save again and the change is stored.

## Technical Plan (Architecture)

### System overview

```text
 Browser: desktop, iPhone Safari, Android Chrome
   |  https://jobs.<domain>
   |  (cPanel Zone Editor: CNAME jobs -> <service>.onrender.com)
   |  loads https://accounts.google.com/gsi/client for the sign-in button
   v
 Render free web service, Node 24, one instance, TLS ends at Render's proxy
   Express 5 app built by createApp({ verifyIdToken, config })
     1  trust proxy = 1
     2  helmet (CSP for accounts.google.com/gsi, COOP same-origin-allow-popups)
     3  pino-http (request id -> X-Request-Id header)
     4  GET /healthz
     5  /auth and /api: express.json (100 KB default), session (connect-mongo),
        write guard (Origin must equal APP_ORIGIN; POST/PATCH must be JSON)
     6  /auth router: POST /auth/google, POST /auth/logout
     7  /api: requireAuth -> me, applications, notes, trash, export routers
     8  /api and /auth: any unmatched path -> JSON 404
     9  static client/dist (hashed /assets cached one year; a missing asset
        is a 404, never index.html)
    10  GET /{*splat} -> client/dist/index.html (Cache-Control: no-cache)
    11  central error handler -> { error, fields?, requestId }
   |                                 |
   | mongodb+srv (TLS, password)     | HTTPS: Google's public keys,
   v                                 v fetched by google-auth-library
 MongoDB Atlas Free cluster        Google Identity Services
   jobs_prod (user jobs-prod)
   jobs_dev  (user jobs-dev)
   collections: applications, sessions

 GitHub push to any branch -> GitHub Actions (lint, format, typecheck,
                              test, build)
 merge dev -> main          -> Render auto-deploy of main,
                               "After CI Checks Pass"
```

### Repository layout

One package, with one `package.json` and one lockfile at the root. There is no
workspace of packages. `pnpm-workspace.yaml` exists only to hold pnpm's
settings, and Vite treats its folder as the root it may serve files from, which
lets the client import `../shared`.

```text
/                      package.json, pnpm-lock.yaml, pnpm-workspace.yaml,
                       .node-version, .env.example, vitest.config.ts,
                       tsconfig.test.json, .prettierrc, README.md
shared/                fields.ts (enums, labels, limits), api.ts (types), bullets.ts
server/src/            app.ts, index.ts, config.ts, auth/, applications/, http/, lib/
server/test/           supertest and unit tests
client/                index.html, vite.config.ts, tsconfig files (generated)
client/src/            main.tsx, App.tsx, api.ts, pages/, components/, lib/
docs/                  acceptance-checklist.md, decision-log.md, steps.md
.github/workflows/     ci.yml
```

The server compiles with `rootDir` set to the repository root, so `tsc` writes
`dist/server/...` and `dist/shared/...` side by side. Relative imports then
resolve the same way in source and in the build.

### Data model

All names are camelCase. API responses use `id`. The schema's `toJSON`
transform maps `_id` to `id` once, and also removes `__v` and `userId`, turns
`appliedDate` into `YYYY-MM-DD`, and leaves out deleted notes. For each note
it maps `_id` to `id` and drops `updatedAt` and `deletedAt`. The
`statusHistory` subschema is declared with `_id: false`, so history entries are
exactly `{ status, changedAt }`. Reads don't use `lean()`, so every response
goes through that transform. At a few hundred documents, the cost of building
full Mongoose documents is small enough not to matter.

There is no `users` collection. The owner key is the verified Google `sub`,
stored as a string in `applications.userId` and in the session. Adding email
and password sign-in later means adding a `users` collection then and giving
each password user a generated id string in the same `userId` field. Nothing
is renamed, so the add-only rule that starts at done (schema changes only add
fields; see "Data safety, rollout and rollback") still holds.

**`applications`**

| Field | Type | Required | Rules | Client may write |
| --- | --- | --- | --- | --- |
| `userId` | string | yes | The verified Google `sub`, from the session only | no |
| `company` | string | yes | Trimmed; 1 to 150 characters | yes |
| `role` | string | yes | Trimmed; 1 to 150 characters | yes |
| `status` | enum | yes | `saved`, `applied`, `interviewing`, `offer`, `rejected`, `withdrawn`, `no_response`; default `saved` | yes |
| `appliedDate` | Date or null | no | UTC midnight. The API uses `YYYY-MM-DD`. Impossible dates and dates after tomorrow (UTC) get a 400; the cut-off is tomorrow, not today, so a user west of UTC can still enter today's local date in the evening. | yes |
| `jobUrl` | string or null | no | Trimmed; up to 2,048 characters; `http:` or `https:` only | yes |
| `location` | string or null | no | Trimmed; up to 150 | yes |
| `salaryRange` | string or null | no | Trimmed; up to 100 | yes |
| `workMode` | enum or null | no | `remote`, `hybrid`, `onsite`; null means unknown | yes |
| `nextStep` | string or null | no | Trimmed; up to 1,000 | yes |
| `jobDescription` | string or null | no | `cleanBullets()`, then trim, then up to 10,000 | yes |
| `coverLetter` | string or null | no | Trimmed; up to 10,000 | yes |
| `statusHistory` | `[{ status, changedAt }]` | yes | Server only; append-only; first entry on create | no |
| `notes` | `[{ _id, body, createdAt, updatedAt, editedAt?, deletedAt? }]` | no | Server-managed; `body` trimmed, 1 to 2,000 | only `body`, through note routes |
| `deletedAt` | Date or null | always set (null while active) | Default null; set by Move to Trash. Not a Mongoose `required` field, because `required` rejects null. | no |
| `createdAt`, `updatedAt` | Date | yes | Mongoose timestamps | no |

Every optional text field that is empty after trimming is stored as `null`, and
so is an empty `appliedDate`. `normalizeInput` does this conversion before
Mongoose sees the body. Over-long text gets a 400 and is never cut short. A note's `updatedAt` comes from
Mongoose's subdocument timestamps. `editedAt` is set only when the body text
changes.

Index: `{ userId: 1, deletedAt: 1, appliedDate: -1 }`. Indexes are built by
Mongoose's `autoIndex` at startup, which is enough for a collection of a few
hundred documents.

**`sessions`**: written by connect-mongo. Each session holds
`{ userId, email }` and lasts 30 days, renewed on each request (`rolling`).
A session is saved only at sign-in (`saveUninitialized: false`), so a refused
sign-in or an anonymous request sets no cookie. There is no `touchAfter`: at
one user's request rate, writing the session on each request costs nothing
worth saving. connect-mongo removes expired sessions with its own TTL index.

### Route table

Every error has the shape `{ error, fields?, requestId }`. Every `/api` route
answers 401 without a valid session. On `/auth` and `/api`, any request other
than GET or HEAD whose `Origin` header is missing or is not `APP_ORIGIN` gets
403, and a POST or PATCH whose body is not `application/json` gets 415.
Malformed JSON gets 400 and a body over 100 KB gets 413, both as
`{ error: "Invalid request body", requestId }`. A malformed id gets the same
404 as a missing id or another user's id.

| # | Method | Path | Request body | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/healthz` | none | 200 `{ status: "ok", db: "up", commit }` | 503 `{ status: "degraded", db: "down", commit }` |
| 2 | POST | `/auth/google` | `{ credential }` (Google ID token) | 200 `{ email }`, sets the session cookie | 400 no credential; 401 token invalid; 403 email not verified or not allowed |
| 3 | POST | `/auth/logout` | `{}` | 204, session destroyed, cookie cleared | none |
| 4 | GET | `/api/me` | none | 200 `{ email }` | 401 |
| 5 | GET | `/api/applications` | none | 200 `ApplicationSummary[]`, active only | 401 |
| 6 | POST | `/api/applications` | `ApplicationInput` | 201 `ApplicationDetail` | 400 |
| 7 | GET | `/api/applications/:id` | none | 200 `ApplicationDetail` | 404 |
| 8 | PATCH | `/api/applications/:id` | changed fields only; `null` clears an optional field | 200 `ApplicationDetail` | 400, 404 |
| 9 | DELETE | `/api/applications/:id` | none | 204, moved to Trash | 404 |
| 10 | POST | `/api/applications/:id/notes` | `{ body }` | 201 `Note` | 400, 404 |
| 11 | PATCH | `/api/applications/:id/notes/:noteId` | `{ body }` | 200 `Note` | 400, 404 |
| 12 | DELETE | `/api/applications/:id/notes/:noteId` | none | 204, soft-deleted | 404 |
| 13 | GET | `/api/trash` | none | 200 `TrashSummary[]`, newest `deletedAt` first | 401 |
| 14 | GET | `/api/trash/:id` | none | 200 `TrashedDetail` (fields and history, no notes) | 404 |
| 15 | POST | `/api/trash/:id/restore` | `{}` | 204 | 404 |
| 16 | DELETE | `/api/trash/:id` | none | 204, deleted forever | 404 |
| 17 | GET | `/api/export?date=YYYY-MM-DD` | none | 200 JSON download (`Content-Disposition: attachment`), named with the client's local `date` (the server's UTC date when `date` is missing or invalid) | 401 |
| 18 | any | `/api/*`, `/auth/*` (unmatched) | | | 404 `{ error: "Not found" }` |
| 19 | GET | `/{*splat}` (not `/api`, `/auth`, `/healthz`) | | 200 `index.html` | none |

Response types, kept in `shared/api.ts`:

*   `ApplicationSummary`: `id, company, role, status, appliedDate, location,
    workMode, salaryRange, nextStep, createdAt`.
*   `ApplicationDetail`: the summary plus `jobUrl, jobDescription, coverLetter,
    statusHistory, notes, deletedAt, updatedAt` (`deletedAt` is null while
    active).
*   `Note`: `id, body, createdAt, editedAt?`.
*   `TrashSummary`: the summary plus `deletedAt`.
*   `TrashedDetail`: `ApplicationDetail` without `notes` (`getTrashed` leaves
    them out with a projection).
*   `ApplicationInput`: the eleven fields the client may write.
*   Export: `{ exportedAt, applications: ApplicationDetail[] }`.

### Scoping: one data-access module

Route handlers never call the Mongoose model. They call
`server/src/applications/repo.ts`. Each of its functions takes `userId` first
and builds its filter from one of two helpers:

```text
active(userId)  = { userId, deletedAt: null }
trashed(userId) = { userId, deletedAt: { $ne: null } }
```

The applications and notes routers use only `active` functions. The trash router
uses only `trashed` functions. That is how the rule "active actions on active
items, trash actions on trashed items, anything else 404" is enforced: a trashed
application is not found under `/api/applications`, so its note routes answer
404 as well.

### Main flows

**Sign in** (popup mode; Google's redirect mode posts a form, which the write
guard refuses):

```text
client: google.accounts.id.initialize({ client_id, callback, ux_mode: "popup" })
user taps the button -> Google popup -> callback({ credential })
client: POST /auth/google { credential }            (JSON, same origin)
server: verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
          (the wrapper maps Google's email_verified to emailVerified)
        require emailVerified, and the lowercased email in ALLOWED_EMAILS
          otherwise: 403, log auth.refused, no session
        req.session.regenerate() -> session = { userId: sub, email } -> save
        log auth.signin -> 200 { email }
requireAuth on every /api request:
        no session -> 401
        session email no longer in ALLOWED_EMAILS -> destroy the session, 401
        otherwise req.user = { id: userId, email }
```

**Update and status change** (PATCH `/api/applications/:id`). The status and its
history entry are written in one atomic update. Repeating the current status
adds no entry, even from two tabs at once.

```text
fields = the allowed fields in the body, validated, without status
if the body has status = next:
    doc = findOneAndUpdate(
            { ...active(userId), _id: id, status: { $ne: next } },
            { $set: { ...fields, status: next },
              $push: { statusHistory: { status: next, changedAt: now } } },
            { returnDocument: "after", runValidators: true })
    if doc: return 200 doc
doc = findOneAndUpdate({ ...active(userId), _id: id }, { $set: fields },
                       { returnDocument: "after", runValidators: true })
return doc ? 200 doc : 404
```

The server never fills in `appliedDate`. The client applies the date rule: when
the status changes to `applied` and the date is empty, it fills in today's local
date, which the user can change. Changing from applied back to saved keeps the
date.

**Notes.** Each change is one update on an active application owned by the
user:

```text
add:    findOneAndUpdate(active + _id,
                  $push notes { _id: new ObjectId(), body, createdAt, updatedAt },
                  { returnDocument: "after" })
edit:   findOneAndUpdate(active + _id + notes $elemMatch { _id: noteId, deletedAt: null },
                  $set notes.$.body, notes.$.editedAt = now,
                  { returnDocument: "after" })            no match -> 404
        add and edit answer with the note picked by id from the transformed
        document, so the response is the stored note in one round trip
        (the client sends no PATCH when the text is unchanged, so every
        PATCH is an edit)
delete: updateOne(active + _id + notes $elemMatch { _id: noteId, deletedAt: null },
                  $set notes.$.deletedAt = now)          no match -> 404
```

**Trash, Restore, Delete forever:**

```text
trash:   updateOne(active(userId) + _id,  $set deletedAt = now)   no match -> 404
restore: updateOne(trashed(userId) + _id, $set deletedAt = null)  no match -> 404
purge:   findOneAndDelete(trashed(userId) + _id)                  null -> 404
         log application.purged { notes: doc.notes.length }
```

Notes and history live inside the application document, so a purge leaves
nothing behind, and Restore brings them back unchanged, with no extra code.

### Field rules and bullet cleanup

The Mongoose schema holds the rules (`required`, `trim`, `maxlength`, `enum`,
and a validator for `jobUrl`), with `runValidators: true` on every update. The
limits and enum values come from `shared/fields.ts`, so the form uses the same
numbers. A Mongoose `ValidationError` becomes a 400 whose `fields` maps each
failing field to a message.

Three checks run before Mongoose sees the body, in `normalizeInput`:

1.  **Types:** the body must be a plain JSON object, and each field must be a
    string or `null`. Anything else (a number, an array, an object) gets a 400
    naming the field, so Mongoose never casts a value or raises a `CastError`
    for a body field.
2.  **Allowed fields only:** any key outside the eleven writable fields gets a
    400.
3.  **Conversions:** strings are trimmed, and an empty optional field becomes
    `null`. `appliedDate` goes through `parseDay()` (a strict `YYYY-MM-DD`
    pattern, a round trip through `Date.UTC` to reject impossible dates, and no
    date after tomorrow in UTC). `jobDescription` goes through
    `cleanBullets()`.

`cleanBullets(text)` replaces `/(?<=\S)[ \t]*•/gu` with `"\n•"`. It changes only
the "•" character (U+2022), leaves a bullet already at the start of a line
alone, and gives the same result when run twice. Because it runs before the
length check, a pasted description can get longer by one character per bullet.
`cleanBullets()` lives in `shared/`, so the form's character counter for the
job description counts `cleanBullets(value).length`, and the counter and the
server's 400 agree.

### Client

**Pages** (React Router, declarative `<Routes>`):

| URL | Page | Data |
| --- | --- | --- |
| `/` | List, active mode | `['applications']` |
| `/applications/new` | Form, create | `['applications']`, for autocomplete |
| `/applications/:id` | Detail: fields, quick status, notes, timeline, Move to Trash | `['application', id]` |
| `/applications/:id/edit` | Form, edit | `['application', id]`, `['applications']` |
| `/trash` | List, trash mode, with Restore and Delete forever on each row | `['trash']` |
| `/trash/:id` | Read-only detail: fields and timeline, Restore, Delete forever | `['trash', id]` |
| `*` | Not found | none |

**App shell.** At start, the client calls `GET /api/me`. A 401 shows the sign-in
page. A 200 shows the header (email, Trash, Export, Sign out) and the routes. A
401 later in the session doesn't navigate away. It shows a banner with the
Google button above the current page, so a form keeps its state. After the user
signs in, the banner closes and they can retry. The same holds for any failed
write: it never navigates and never resets the form. The form shows the error,
and the user saves again by hand. Writes never retry on their own, because
create and add-note are not safe to repeat. A Save sent after the service has
slept may get Render's loading page instead of JSON; that write never reached
the app, so saving again is safe (Stage 1, manual step 5, checks this). Save is disabled while its request is
pending, so a double tap can't create two applications. Queries keep TanStack
Query's refetch on window focus, so coming back from the job posting's tab
wakes the server and shows an ended session before the user taps Save. A React
error boundary wraps the routes.

**Data.** One `apiFetch()` helper sends JSON with credentials and throws an
`ApiError { status, error, fields, requestId }`. A 204 resolves to `undefined`.
TanStack Query holds the server state, with one shared `QueryClient`: queries
don't retry a 4xx answer and retry other failures once, and mutations never
retry. After any create, edit, status change, note change, trash, restore or
purge, the client invalidates `['applications']`, `['trash']` and the affected
detail query, so no copy of server data is kept outside the query cache.

**Pure modules** (written test-first, in `client/src/lib/`):

*   `listView.ts`: search on company, role and location (case- and
    accent-insensitive: `normalize('NFD')`, strip `\p{M}`, lowercase); filter by
    one status, Open (saved, applied, interviewing) or Closed (offer, rejected,
    withdrawn, no response); sort as listed under "Choices made in this draft".
*   `distinctValues.ts`: `distinctValues(list, field)` trims, drops blanks,
    removes duplicates ignoring case while keeping the most recent spelling, and
    sorts with `localeCompare(..., { sensitivity: 'base' })`.
*   `appliedDateRule.ts`: `nextAppliedDate(nextStatus, currentDate, today)`
    returns `today` only when `nextStatus` is `applied` and `currentDate` is
    empty.
*   `dates.ts`: `todayLocal()` builds `YYYY-MM-DD` from local date parts.
    `displayDay()` shows a calendar date by formatting in UTC. `formatTime()`
    shows a timestamp in local time, and `localDay()` shows a timestamp's local
    calendar date (the Trash list's deleted date). (The server's `formatDay()` turns a `Date`
    into `YYYY-MM-DD`; the client name differs so the two aren't confused.)
*   `badges.ts`: `Record<Status, string>` with seven full Tailwind class strings.

**Forms.** Plain controlled inputs with no form library. Company, role and
location use a `<datalist>` filled from `distinctValues()` over the active list.
The date is an `<input type="date">` bound to the `YYYY-MM-DD` string; the
client never builds a `Date` from it. The empty work mode option is "Not set"
and sends `null`. Edit sends only the changed fields; saving an edit with no
changes sends nothing and returns to the detail page. The form sets
`noValidate` and uses no `maxLength`, `required` or `pattern` attributes, so
the server's 400 is what the user sees. Field messages come from the API's
`fields`, and their text lives in one table in `shared/fields.ts`, so tests can
assert the exact wording. Long-text fields and notes show a counter
(`n / limit`) that turns red over the limit. The server's 400 stays the final
check.

**Display.** Long text and notes use `whitespace-pre-wrap`, with no
`dangerouslySetInnerHTML` and no Markdown. `jobUrl` renders as a link with
`target="_blank" rel="noopener noreferrer"` (a "safe link" below). Below
Tailwind's `sm` breakpoint, the list shows company, role and the status badge
only. The company cell holds the row's one link, and the link's hit area is
stretched over the whole row, so a tap anywhere on the row opens the detail
page and Tab stops once per row. Trash rows' Restore and Delete forever buttons
sit outside the link and above its hit area.

**Navigation after actions.** Saving an edit returns to the detail page. Move
to Trash returns to the list. Restore from `/trash/:id` opens
`/applications/:id`, and Delete forever returns to `/trash`. On a Trash row,
both buttons stay on `/trash`.

**Google button.** `index.html` loads `https://accounts.google.com/gsi/client`.
A small `GoogleButton` component calls `initialize` and `renderButton` once the
script is ready. The client id comes from `GOOGLE_CLIENT_ID`, which Vite
exposes to the client at build time through `envPrefix`; the id is public, so
exposing it is safe.

### Tests

*   **Runner:** Vitest, with one root `vitest.config.ts` holding two projects:
    `server` (Node, which also runs the `shared/` tests) and `client` (jsdom).
    The config file sets `process.env.TZ = 'America/New_York'` before the
    workers start. Each project has a guard test showing that the time zone
    offset is not zero.
*   **Database:** a Vitest `globalSetup` starts one `MongoMemoryServer`, pinned
    to the same 8.0 patch as the Atlas cluster (recorded at Stage 1), and
    passes its URI to the tests. Each test file uses its own database, named
    `test-<random>` and placed in the URI path, so Mongoose and connect-mongo
    both use it. The test helper refuses to connect unless the host is
    `127.0.0.1` and the database name starts with `test-`. A test that connects
    through the helper therefore can't reach Atlas.
*   **Sign-in seam:** `createApp({ verifyIdToken, config })`. Tests pass a fake that
    turns the token `"valid:<email>"` into
    `{ sub: "sub-<email>", email, emailVerified: true }`, and a helper signs in
    a supertest agent. The running app always gets the real verifier, so it has
    no test-only path.
*   **Clock:** `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime()`.
    Only `Date` is faked, so the MongoDB driver's timers keep working.
*   **Automated tests required by decisions:**
    *   A cross-user test for every data route: routes that take an id (7 to 12
        and 14 to 16) answer 404 to another user; the list routes and the export
        (5, 13 and 17) return none of another user's data.
    *   A form-encoded POST, a POST with a foreign `Origin` and a write with no
        `Origin` are rejected.
    *   An unauthenticated `/api` call answers 401.
    *   The cookie is `Secure` when `X-Forwarded-Proto: https` arrives through
        the trusted proxy.
    *   Removing an email from the allowlist ends that session.
    *   Repeating the current status adds no history entry.
    *   Impossible and future dates, over-long text, unknown fields and values
        of the wrong type get a 400.
    *   Note routes answer 404 while the parent is in Trash.
    *   Restore keeps notes and history; Delete forever leaves no document
        behind.
    *   Every route test asserts the exact key set of its response type, so
        the server's response shapes match `shared/api.ts`.
*   **Client tests:** the pure modules first, then a few Testing Library tests: a
    form keeps its input after a 401 or an answer that isn't JSON, the date
    fills in on a change to applied, the `<datalist>` options render, and the
    list renders in both modes. They render through one helper with the app's
    shared `QueryClient` (cleared between tests) and a `MemoryRouter`, and
    `fetch` is mocked per test.
*   **No end-to-end browser tests** (see Non-Goals).

### Build, deploy and domain

*   **Scripts** (root `package.json`): `dev:server` (`tsx watch
    --env-file=.env server/src/index.ts`), `dev:client` (Vite, proxying `/api`
    and `/auth` to the server), `test`, `lint` (oxlint), `format` (Prettier),
    `typecheck` (client, server and test files), `build` (Vite build, then
    `tsc` for the server) and `start`
    (`node dist/server/src/index.js`).
*   **pnpm settings:** `packageManager: "pnpm@12.18.0"` in `package.json`.
    `pnpm-workspace.yaml` holds `allowBuilds`: mongodb-memory-server's
    postinstall is set to `false`, so installs never download mongod and it is
    fetched on the first test run instead. Other packages with build scripts are
    approved or denied with `pnpm approve-builds` when they first appear.
*   **CI** (`.github/workflows/ci.yml`, on every push): checkout,
    `pnpm/action-setup`, `actions/setup-node` with Node 24 and the pnpm cache, a
    cache for `~/.cache/mongodb-binaries`, `pnpm install --frozen-lockfile`,
    then lint, format, typecheck, test and build.
*   **Render web service:**
    *   Node 24 from `.node-version`.
    *   Build: `corepack enable && pnpm install --frozen-lockfile && pnpm build`.
    *   Start: `node dist/server/src/index.js`.
    *   Health check path: `/healthz`.
    *   Auto-Deploy: "After CI Checks Pass", on `main`. Work happens on `dev`,
        so only a merge into `main` deploys.
    *   Environment: `MONGODB_URI` (with the database name in its path, for
        example `.../jobs_prod?retryWrites=true&w=majority`), `SESSION_SECRET`,
        `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`, `APP_ORIGIN`. `PORT` and
        `RENDER_GIT_COMMIT` are set by Render.
*   **Startup** (`server/src/index.ts`): check the environment variables (name
    any that is missing, never print a value), set Mongoose's `bufferCommands`
    to false, connect to Atlas, and only then call `listen(PORT)`.
*   **Custom domain (Stage 1), in this order:**
    1.  Deploy once on the `onrender.com` address.
    2.  Check that the domain's nameservers point to the cPanel host
        (`nslookup -type=ns <domain>`). If they don't, the CNAME goes wherever
        the DNS is managed.
    3.  Add `jobs.<domain>` in Render.
    4.  In cPanel's Zone Editor, add `CNAME jobs -> <service>.onrender.com`.
        Remove any `AAAA` record for `jobs`. If the domain has `CAA` records,
        allow `letsencrypt.org` and `pki.goog`.
    5.  Wait for Render to verify the domain and issue the certificate.
    6.  Disable the `onrender.com` subdomain in Render.

    `APP_ORIGIN=https://jobs.<domain>` is set in Stage 2, when the write guard
    first reads it.
*   **Google OAuth client (Stage 2):** one Web client. Its authorized JavaScript
    origins are `https://jobs.<domain>`, `http://localhost:5173` and
    `http://localhost` (Google's setup asks for both local forms). The consent
    screen is published ("In production") with only the `openid` and `email`
    scopes, which needs no verification. No logo is uploaded, so the screen
    stays outside logo review.
*   **Atlas:** one Free cluster, in the AWS region closest to the Render region
    picked (both chosen at Stage 1). Two databases with one user each
    (`readWrite` on its own database only), each with a long random password.
    Network access `0.0.0.0/0`. Atlas backups stay off (see "Data safety,
    rollout and rollback").

### Working from two computers

The author works on the project from two computers. Each has the same toolchain
without containers:

| What must match | How it matches |
| --- | --- |
| Node version | `.node-version` (24), the same file Render reads |
| pnpm version | `packageManager` in `package.json`. On the two computers, pnpm installed with `npm install -g pnpm` switches to that version itself; Render uses `corepack enable` |
| Dependencies | `pnpm-lock.yaml`, installed with `pnpm install --frozen-lockfile` |
| Test database | mongodb-memory-server, with its MongoDB version pinned; each machine downloads it once |
| Development database | The Atlas `jobs_dev` database, used from both machines. There is no local data to sync, and the `0.0.0.0/0` access list means neither machine's IP has to be added. |
| Line endings | `.gitattributes` |
| Secrets | `.env.example` is committed with every variable name. Secrets are blank; the non-secret development values are filled in (`APP_ORIGIN=http://localhost:5173`, `PORT=3000`, and a `MONGODB_URI` template ending in `/jobs_dev?...`). The secret values live in the author's password manager and are copied into a local `.env` on each machine. |
| Progress | git (the `dev` branch), plus `docs/steps.md` and `docs/decision-log.md`, read at the start of each work session |

Setting up a machine: install Node 24, run `npm install -g pnpm` (npm's global
folder on Windows needs no administrator rights), clone the repo, check out
`dev`, set the repo's commit email to the GitHub noreply address
(`git config user.email "20058311+flaviovoots@users.noreply.github.com"`), run
`pnpm install`, copy `.env.example` to `.env` and fill in the secrets, then run
`pnpm test`. The repository is public, so the noreply address keeps the
author's personal email out of the history. GitHub's "Block command line pushes
that expose my email" setting catches a machine where the address was not set.
The time zone guard test and the first mongod download confirm the machine is
ready. The scripts use no shell-specific syntax (no `VAR=value
command`), so they run the same in PowerShell, cmd and bash.

### Versions (checked on 2026-11-14)

Exact versions are pinned by the lockfile. Major versions: Node 24, pnpm 12,
TypeScript 7, Express 5, Mongoose 9 (MongoDB driver 7), express-session 1,
connect-mongo 6, google-auth-library 11, helmet 8, pino 10, React 19, React
Router 8, TanStack Query 5, Vite 8, Tailwind CSS 4, Vitest 5, mongodb-memory-server
11 (its MongoDB binary version is pinned in its config).

Also needed, because they are peers or type packages that are easy to miss:
`react-dom`, `@testing-library/dom` (a peer of Testing Library 16),
`@types/express`, `@types/express-session`, `@types/supertest`, and `mongodb`
as a direct dependency on driver 7, so connect-mongo and Mongoose share one
driver and `getClient()` type-checks.

## Alternatives Considered

The author rejected every option below. Options from the brief keep the reasons
the brief gives, which the author confirmed on 2026-11-14; the brief holds their
history. Options rejected during drafting carry the trade-off that decided them.
The stage-order change is listed under "Decisions since the brief", since it
was a change, not a rejection.

### Product scope and behavior

| Alternative | What it offered | Reason for rejection |
| --- | --- | --- |
| Hard delete of applications | No Trash code at all | A mistaken delete would permanently lose job-search data. |
| Hard delete of notes (`$pull`) | No `deletedAt` on notes and no filters for it | As in the old app, a mistakenly deleted note stays in the database and can be recovered by editing it by hand. |
| Soft delete without a restore UI | Less UI | Getting an item back would mean editing the database by hand. |
| Undo toast | One small component | It protects only for a few seconds after the delete. Trash allows recovery later. |
| Trash as a "show deleted" toggle, with Delete forever deferred | Fewer screens | A separate, linkable `/trash` page that reuses the list component costs little more and keeps Delete forever in the MVP. |
| "Empty Trash" button | Clearing Trash in one step | Not needed while trashed items are few. |
| Automatic purge with a TTL index after 30 days | No purge code | Deletion would be silent, and a few hundred rows fit easily in Atlas's free tier. |
| Kanban board | A visual pipeline | A board layout and drag-and-drop add client work beyond a CRUD table. |
| Port of server-side DataTables pagination | Matches the old app | A few hundred rows fit in one client-side load, so server-side paging, sorting and search code isn't needed. |
| Current status only, no history | No history array | Past status changes would be lost and can't be rebuilt later. |
| A date field per status | Simple date columns | A fixed field per status can't record a status reached twice or out of order, and needs a new field for each status. |
| Back-dated status changes | Records when a change really happened | Recording the entry time keeps the timeline in order. |
| Editable history entries | Fixing mistakes in place | Extra UI. A mistake is fixed by changing the status again. |
| The server fills in `appliedDate` on a change to applied | No client rule | The atomic update would need an update pipeline, and Render's "today" is a UTC date, which is tomorrow in the evening west of UTC. The form fills in the local date instead. |
| A single free-text notes field | One field, no note routes | The author wants separate notes per application, as in the old app. |
| Notes deferred to a later phase | A smaller MVP | The author wants notes in the MVP. |
| Notes in a separate collection | Notes stored and queried on their own | An array inside the application gets Trash, Restore, Delete forever, the export and user scoping with no extra code, and each note change is one atomic update. A separate collection needs a cascade with no transaction. |
| No note editing, as in the old app | Fewer routes and tests | The author wants to fix typos in place. |
| No right-click menu at all | Less code; visible actions are required anyway | The menu stays as a desktop shortcut the author used in the old app. Tapping a row covers phones. |
| One form for create, edit and view, with no router | Fewer pages | Linkable pages (`/applications/:id`, `/trash`) let a URL be shared, bookmarked and tested in the checklist. |
| Bullet cleanup on paste, from a button, or at display time | No change to stored text, or cleanup under the user's control | The old app cleaned on the server at save. A paste handler breaks the browser's undo, and display-time cleanup runs on every render. |
| Importing the old data, or re-entering open or all applications | Continuity with the old app | The old app stays in use as its own system, and the new app starts fresh. |

### Architecture, hosting and security

| Alternative | What it offered | Reason for rejection |
| --- | --- | --- |
| Split hosting (client on Vercel, API on Render) | A CDN for the client | Two origins would make the session cookie third-party and require CORS. One origin avoids both. |
| A local-only app | No hosting work | Done requires the app deployed on Render and checked on production from a desktop and two phones. |
| Keep-alive ping | No cold starts | It depends on an outside scheduler and uses almost all of the free instance hours. |
| A paid Render instance (about $7 a month) | No sleep | The MVP stays free. |
| express-session's default in-memory store | No store dependency | Every sleep, restart and deploy would sign the user out. |
| A signed-cookie session | No session store | Sign out would only delete the browser's copy. A copied cookie would stay valid for up to 30 days unless the account left the allowlist, and the app holds personal job-search data. |
| Passport with the redirect flow | Widely documented | More moving parts than the Google Identity Services ID-token flow. |
| Google's consent screen in Testing mode as a second gate | Google refuses unknown accounts | With Google refusing first, the checklist's refusal step would test Google, not the app's allowlist. |
| A CSRF token library | Token-based protection | A Lax cookie, JSON-only writes and an `Origin` check cover the same attacks with less code. |
| Mongoose query middleware for automatic scoping | No filter in each function | The filter would be hidden, and some query types are not covered by middleware. |
| A shared Zod schema | One schema for client and server | It sits next to Mongoose and still describes the shape twice. Plain constants in `shared/` are enough. |
| A `@shared` alias rewritten by `tsc-alias` | Short import paths | It adds the build dependency the brief ruled out, and the build would depend on a rewrite step you can't see. |
| Node subpath imports (`#shared/*`) | Short import paths, no extra library | The mapping needs conditions (types against compiled `.js`) that are easy to get wrong on first contact. |
| Trash actions on `/api/applications` (`/:id/trash`, `/:id/restore`, `?trashed=true`) | One router | The scope rule would be coded in every handler, and one missed check would let DELETE wipe an active row. |
| Atlas limited to Render's regional ranges and a home IP | Blocks internet-wide scanners | Every Render customer in the region shares the ranges, so the gain is small. Production would lose its database whenever Render changed the ranges, and dev would break whenever the home IP changed. |
| Atlas limited to Render's ranges, with dev on a local MongoDB | The same, without a home IP | The outage risk stays, a local mongod must be run, and dev no longer exercises Atlas. |
| Redirecting `onrender.com` to the custom domain in the app | Old links keep working | Code and a test for little gain, and hits on that address still wake the service. |
| Leaving `onrender.com` on | No work | It would be a second copy of the app on which sign-in and every write fail. |
| A `users` collection now, with applications pointing to `users._id` | Ready for password sign-in | (2026-11-15) Nothing reads a user document today. A model, an upsert and a partial index would be built for a Non-Goal. A later password user can get a generated id string in the same `userId` field. |
| Atlas free-cluster backups | Daily snapshots, last four kept | Up to $3 a month with a payment method on file, and a private preview that may not be offered. The MVP stays free. |
| No HTTP security headers | Nothing for a policy to break | React escaping, the `jobUrl` check and the Lax cookie would be the only defenses, and adding a CSP after real use starts means retesting sign-in under it. |
| Storing `appliedDate` as a `YYYY-MM-DD` string | No conversion module | A native Date lets MongoDB range-query and do date math later (for example, applications sent in the last 30 days) without a migration, which matters once the add-only rule starts at done. It also matches every other date in the documents (`createdAt`, `changedAt`, `deletedAt`). |
| History written by load, change and save, with optimistic concurrency | Logic in one pure function | One atomic `$set` and `$push` update is one round trip and needs no version check. |

### Process and tooling

| Alternative | What it offered | Reason for rejection |
| --- | --- | --- |
| Build the whole MVP, then deploy | No deploy work until the end | The riskiest integration (sign-in, sessions, Render, Atlas) would surface last, when the most code exists. |
| Two weeks of real use without falling back to the old app as the definition of done | Measures real adoption | The old app stays in use, so falling back can't be measured. |
| Two weeks of parallel logging in both apps | A real-use trial | Double entry. The acceptance checklist tests the same flows. |
| Deployed and feature-complete, with no scenario test | A shorter definition of done | Nothing would confirm the app works end to end on production. |
| API-only tests | Fewer test tools | Client code such as search, filter, sort and forms would go untested. |
| No tests | Less typing | The project is built test-first (Goal 3). |
| End-to-end browser tests | Automated full flows | Real Google sign-in on a real phone can't be automated cheaply, so the manual checklist covers end to end. |
| Running tests in Render's build | One pipeline | It would spend build minutes and download mongod on every deploy. CI runs the tests and Render deploys only after CI passes. |
| Splitting Stage 6 into a list stage and a form stage | Smaller deploys | With bullet cleanup moved to Stage 3, autocomplete is the only form work left in Stage 6. |
| Writing every setup file by hand | No generated files in the repository | Generated files, reviewed line by line, fit the 2027-01-31 target date. |
| Mongoose 8, as the brief first chose | More tutorials match exactly | It starts on the previous major, and a later breaking upgrade would come after real use has started. |
| ESLint with TypeScript 6.0 | The widest rule set; matches most tutorials | It means downgrading the generated TypeScript 7 and keeping the slower compiler until typescript-eslint supports TypeScript 7. |
| npm | Matches the brief and most tutorials | The author prefers pnpm. |
| A VS Code Dev Container for both computers | The same toolchain on every machine | It needs Docker Desktop and WSL2 on Windows, file watching needs polling or the repo inside WSL, the container differs from Render's native runtime, and it is one more tool to set up before Stage 0. Version pins match the tool versions without it. |
| A private repository guarded by `.gitignore` alone | The code and the author's process stay private | Push protection is not free on private repositories, so nothing would stop a secret pasted into a tracked file. |
| A private repository with a gitleaks pre-commit hook | Blocks secrets while staying private | An extra binary to install and update on both computers, and the hook can be skipped with `--no-verify`. |
| Docker Compose with a local MongoDB | Development without Atlas | All the costs of the Dev Container, plus a development database that differs from Atlas and local data that doesn't follow the author between the two computers. |

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security and privacy

*   **Sign-in:** a Google ID token is checked on the server for audience,
    signature and expiry by `google-auth-library`, and `email_verified` is
    required. The allowlist is checked at sign-in and again on every request.
    The session id is regenerated at sign-in.
*   **Cookie:** `HttpOnly`, `SameSite=Lax`, and `secure: 'auto'`. Behind
    `trust proxy`, `secure: 'auto'` gives `Secure` on Render's HTTPS. A test
    proves the flag is set when `X-Forwarded-Proto: https` arrives.
*   **CSRF:** the Lax cookie, JSON-only bodies, an `Origin` check on every
    write, and no GET request that changes anything. There is no token library.
    Other hosts on the same domain (such as the old PHP app) count as same-site
    for `SameSite=Lax`, so the exact `Origin` check is the defense that
    matters.
*   **Headers (helmet):** `default-src 'self'`. Script, frame, connect and style
    sources also allow `https://accounts.google.com/gsi/`, the only external
    origin. `frame-ancestors 'none'`. `Cross-Origin-Opener-Policy:
    same-origin-allow-popups`, which Google's popup needs; helmet's default
    `same-origin` would break sign-in. HSTS and `nosniff` stay at helmet's
    defaults. Vite's dev server doesn't send these headers, so CSP and COOP are
    first exercised on production: a CSP mistake that blocks Google sign-in
    shows up in the Stage 2 run, and later stages' checklist lines catch the
    rest. The values are checked against Google's setup guide in Stage 2 (see
    Open Questions).
*   **XSS:** React escapes all output. `jobUrl` must be `http:` or `https:`. No
    HTML or Markdown is rendered.
*   **No leaks about other records:** another user's id, a missing id and a
    malformed id get the same 404.
*   **Atlas:** network access stays `0.0.0.0/0`. Render's outbound ranges are
    published per region, but every Render service in that region shares them,
    so limiting access to them blocks little and would cut production off
    whenever Render changes the ranges. The protection is in the database
    users: a long random password for each, `readWrite` on one database only,
    separate development and production users, and production credentials only
    in Render's environment variables.
*   **Secrets:** the repository is public, so GitHub's secret scanning and push
    protection are free and turned on. `.env` is in `.gitignore` from the first
    commit, and only `.env.example` (names, with values only for non-secret
    development settings) is tracked. Every secret,
    and `ALLOWED_EMAILS`, lives only in Render's environment and each machine's
    `.env`. `SESSION_SECRET` is generated from at least 32 random bytes, and
    startup refuses a value shorter than 32 characters.
*   **Nothing personal in the repository:** tests and docs use `example.com`
    addresses, and no export file or production data is ever committed.
*   **Logs:** cookies, `Authorization` headers and ID tokens are redacted.
    Request bodies are never logged, so job text, notes and cover letters never
    reach the logs. Logged events are `auth.signin`, `auth.refused` (with the
    reason, without the email) and `application.purged`.

### Performance and limits

*   The summary list for about 300 applications is an estimated 100 KB, more
    if many `nextStep` values are long. Long text loads only on the detail
    page.
*   Atlas Free allows 0.5 GB, 100 operations per second and 500 connections. A
    single user stays far below each: a few hundred documents of tens of KB,
    and a handful of requests per minute on one connection pool.
*   A cold start takes about a minute, and Render shows its own loading page
    meanwhile. This is accepted for the MVP.
*   Render's 750 free instance hours per workspace cover one service running
    all month (at most 744 hours), so a second free service would exceed them.

### Data safety, rollout and rollback

*   **Before done:** production holds practice data and may be wiped. Schema
    changes may rename or remove fields.
*   **From done on:** schema changes only add fields. Updates never replace a
    whole document.
*   **Backups:** `GET /api/export` (JSON, per user, built in Stage 5) is the
    only backup, taken by hand; the README asks for one a week. It holds every
    field, note and status history entry with their timestamps, so an import
    script can be written from it if a restore is ever needed. That script is
    not part of done. After done, `mongodump` with a read-only database user is
    the option for a full copy. Atlas's free-cluster backups stay off: they
    cost up to $3 a month, need a payment method, and are a private preview.
*   **Deploys:** Render deploys `main` only after CI passes, and `main` changes
    only by merging `dev`. Startup connects to Atlas before it listens, so a
    deploy with broken database settings never opens its port and the previous
    version stays live. `/healthz` answers 503 when Mongoose's `readyState` is
    not connected, which Render's health check also uses if free instances
    have one (checked in Stage 1). A Render rollback reverts code, not data.

--------------------------------------------------------------------------------

## Risks and Mitigations

*   **Free-tier sleep:** about a minute to wake. Accepted (see Non-Goals); the
    client's failed-write rule covers a Save during the wake (see "Client").
*   **Build minutes:** 500 a month on Hobby (Render's free workspace plan). If
    they ran out with no payment method on file, builds would stop for the
    rest of the month. Mitigation: only merges from `dev` into `main` deploy,
    about one per stage plus fixes.
*   **Atlas idle pause:** Atlas pauses a Free cluster after 30 days with no
    connections. It can't happen while the app is in daily use. If it does,
    the app refuses to start until the cluster is resumed by hand; Atlas
    advises exporting first if the cluster will sit idle for a long time.
*   **Open vendor checks:** the three listed under Open Questions. Each has a
    stage that settles it and a fallback (Stage 1 manual steps 2 and 4, and the
    Stage 2 manual setup).
*   **Schedule:** two checkpoints, each recorded in the decision log when it
    triggers (see "A fixed date" in The Problem).
    *   **2027-01-17:** if Stage 5 is not deployed, Stage 6 is not started; the
        remaining time goes to finishing Stage 5 and the full run of S1.1 to
        S5.5.
    *   **2027-01-24:** if Stage 6 is deployed except for `RowMenu`, only
        `RowMenu` is cut: Stage 6 ships without it, S6.6 and the two
        right-click cases in `ListPage.test.tsx` move to after done, and Goal
        9's right-click shortcut waits until then. If more than `RowMenu` is
        unfinished, all of Stage 6 moves to after done, and the full run covers
        S1.1 to S5.5.
*   **Accepted without mitigation:** changes to Render's, Atlas's or Google's
    free-tier policies, the domain or its cPanel host lapsing, and losing the
    password manager that holds every `.env` value.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### How to read this plan

*   The plan follows the stages. A stage starts only when the previous one is
    deployed, CI passes on its commit, and its checklist lines pass on
    production. Stage 0 is not deployed, so it needs only CI passing.
*   **What this plan fixes, and what it leaves to `docs/steps.md`:** the plan
    states behavior (status codes, order, what each test checks). Literal
    values that aren't given here (copy text, markup, class strings, exact
    signatures, `pnpm add` commands) are decided at the start of each stage
    and written into `docs/steps.md`.
*   **Written by** says who produces each file:
    *   **Typed:** the author writes it, in small steps. Files that hold
        behavior are written test first.
    *   **Generated:** a tool creates it (the Vite react-ts template,
        `tsc --init`, pnpm), and the author reviews it line by line. The
        lockfile is the exception: it is not reviewed line by line. Later edits
        to a generated file are typed.
    *   **Notes:** working notes, updated as each stage goes. Only
        `docs/steps.md`.
*   **Browser-only behavior** (the row menu's position, layout at 360 px,
    Google's popup, real cookies on a phone) has no automated test. The
    checklist line for it is its check.
*   A **spike** is allowed the first time a library is used. It is thrown away,
    and the feature is rebuilt test-first.
*   **Branches:** work happens on one `dev` branch, pushed from both computers;
    CI runs on every push. `dev` is merged into `main` at the end of each stage
    and for fixes, and each merge is one deploy.
*   **Commits:** Conventional Commits, made at the commit points listed in
    `docs/steps.md`.
*   At the start of each stage, its numbered steps are written into
    `docs/steps.md`. Each step is ticked off when it is done, so a session on
    either computer starts where the last one stopped.
*   **Files every stage may change:** `package.json`, `pnpm-lock.yaml`,
    `pnpm-workspace.yaml`, `docs/steps.md`, `docs/acceptance-checklist.md` and
    `docs/decision-log.md`. The stage tables don't repeat them.

### Stage 0: scaffold

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `.gitignore` | Create | Typed | Ignores `node_modules/`, `dist/`, `client/dist/`, `.env`, `coverage/` and `*.log`. `.env` is ignored before any secret exists. |
| `.gitattributes` | Create | Typed | `* text=auto eol=lf`, so both computers and CI see the same line endings. |
| `.node-version` | Create | Typed | `24`. Read by Render, and by a version manager if one is used. |
| `.env.example` | Create | Typed | Every variable name: `MONGODB_URI`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS`, `APP_ORIGIN`, `PORT`. Secrets are blank. Non-secret development values are filled in: `APP_ORIGIN=http://localhost:5173` (the Vite proxy forwards the browser's `Origin`, so any other value makes the write guard refuse every write), `PORT=3000` (the proxy's target), and a `MONGODB_URI` template with `/jobs_dev` in its path. Each has a one-line comment saying what it holds. |
| `client/` (template files) | Create | Generated | `pnpm create vite client --template react-ts`. Reviewed line by line: `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, and the `vite/client` types entry. The demo files (`src/App.css`, `src/assets/`, `public/vite.svg`) are deleted. The template's `package.json` is merged into the root one and deleted, so there is one package. Its `client/.gitignore` is merged into the root one, and `client/README.md` and its lint config are deleted (oxlint runs on its defaults). |
| `client/vite.config.ts` | Modify | Typed (from Tailwind's install guide) | Adds the `@tailwindcss/vite` plugin. Also `envDir: '..'`, so there is one `.env` at the root, and `envPrefix: ['VITE_', 'GOOGLE_CLIENT_ID']`, so the client reads the same `GOOGLE_CLIENT_ID` as the server. |
| `client/src/index.css` | Modify | Typed (from Tailwind's install guide) | Replaced by Tailwind v4's single line, `@import "tailwindcss";`. |
| `package.json` | Create | Generated, then typed | `"type": "module"`, `"private": true`, `"packageManager": "pnpm@12.18.0"`, `"engines": { "node": "24.x" }`. Scripts: `dev:server` (`tsx watch --env-file=.env server/src/index.ts`), `dev:client` (`vite client`), `build` (`vite build client`, then `tsc -p server`), `start` (`node dist/server/src/index.js`), `test` (`vitest run`), `test:watch` (`vitest`), `lint` (`oxlint`), `format` (`prettier --check .`), `format:write` (`prettier --write .`), `typecheck` (`tsc -b client`, then `tsc -p server --noEmit`, then `tsc -p tsconfig.test.json --noEmit`). `config.mongodbMemoryServer`: `version` (an 8.0 patch now; set to the same 8.0 patch as the Atlas cluster at Stage 1) and `preferGlobalPath: true`, so the binary lands in `~/.cache/mongodb-binaries` on both computers and in CI. |
| `pnpm-workspace.yaml` | Create | Typed | Only `allowBuilds`, with `mongodb-memory-server: false`. Other packages with build scripts are approved or denied with `pnpm approve-builds` when they first appear. |
| `pnpm-lock.yaml` | Create | Generated | Written by pnpm and committed. CI and Render install with `--frozen-lockfile`. |
| `.prettierrc`, `.prettierignore` | Create | Typed | Prettier's defaults, plus the ignore list (`pnpm-lock.yaml`, `dist`, `client/dist`, `*.md`). Markdown is ignored because the docs are wrapped by hand. |
| `server/tsconfig.json` | Create | Generated (`tsc --init`), then typed | `module` and `moduleResolution` `NodeNext`, `target` `es2023`, `strict`, `verbatimModuleSyntax`, `rootDir: ".."`, `outDir: "../dist"`, `include: ["src", "../shared"]`, `exclude: ["../shared/**/*.test.ts"]`, `types: ["node"]`. |
| `tsconfig.test.json` | Create | Typed | Extends `server/tsconfig.json` with `noEmit`, and sets its own `include` (`server/src`, `server/test`, `shared` and `vitest.config.ts`) and its own empty `exclude`. Including `server/src` brings in the type declarations under `server/src/types` (Stage 2), and the empty `exclude` replaces the server's exclusion of the shared tests, so the shared tests are type-checked too. Client tests are already covered by `tsc -b client`. |
| `server/src/index.ts` | Create | Typed | A one-line placeholder (`console.log("server placeholder")`), so `tsc -p server` has an input and `typecheck` and `build` pass in CI. Stage 1 replaces it. |
| `vitest.config.ts` | Create | Typed | Sets `process.env.TZ = 'America/New_York'` at the top. Two projects: `server` (Node, `server/test/**/*.test.ts` and `shared/**/*.test.ts`, `globalSetup` added in Stage 1) and `client` (jsdom, extends `client/vite.config.ts` with `root` set to `client`, so its `envDir: '..'` still points at the repository root; `client/src/**/*.test.{ts,tsx}`, setup file `client/src/test/setup.ts`). |
| `client/src/test/setup.ts` | Create | Typed | Runs Testing Library's `cleanup` after each test. Later stages add stubs for what jsdom lacks (see Stages 2, 4b and 6). |
| `server/test/tz.guard.test.ts`, `client/src/tz.guard.test.ts` | Create | Typed | The first test in each project. It proves the time zone offset is not zero in January and in July, so no test passes only because the process runs in UTC. |
| `.github/workflows/ci.yml` | Create | Typed | On every push: checkout, `pnpm/action-setup`, `actions/setup-node` (Node 24, pnpm cache), a cache for `~/.cache/mongodb-binaries`, `pnpm install --frozen-lockfile`, then `lint`, `format`, `typecheck`, `test`, `build`. Its check is the one Render waits for. |
| `README.md` | Create | Typed | What the app is, a link to the design doc, the setup steps for a new computer (from "Working from two computers"), the branch rule (work on `dev`, merge to `main` to deploy), "export once a week", and the scripts. |
| `docs/acceptance-checklist.md` | Create | Typed | A steps table (columns: #, stage, step, expected result, desktop, iPhone Safari, Android Chrome) and a run log table (date, commit reported by `/healthz`, device and browser, pass or fail per step, notes). Lines are added stage by stage, as listed in each stage below. |
| `docs/decision-log.md` | Create | Typed | Dated entries, newest first, for decisions made after this design. The first entry links the design doc. |
| `docs/steps.md` | Create | Notes | The step list for the current stage, as described under "How to read this plan". |

**Setup notes:** run `pnpm format:write` once after the template is generated
and before the first commit, so the generated files pass `format`. oxlint runs
on its defaults with no config file until a rule needs changing. Create the
`dev` branch before the first push.

**Tests:** the two time zone guard tests pass with `pnpm test`, locally on
both computers and in CI.

**Checklist lines:** none. Nothing is deployed yet.

### Stage 1: walking skeleton on Render

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `server/src/config.ts` | Create | Typed | `readConfig(env)` returns the parsed config, or throws one error naming every missing or invalid variable without printing any value. `commit` comes from `RENDER_GIT_COMMIT` (`"dev"` when unset). A missing or empty `PORT` means 3000. `clientDir` is `path.resolve('client/dist')`. Stage 1 requires only `MONGODB_URI`; Stage 2 adds the rest. |
| `server/src/http/logger.ts` | Create | Typed | The pino logger and the pino-http options. `genReqId` uses `crypto.randomUUID()` and sets the `X-Request-Id` response header. Redacts `req.headers.cookie`, `req.headers.authorization` and `res.headers["set-cookie"]`. Request bodies are never logged. The logger is silent in tests. |
| `server/src/http/errors.ts` | Create | Typed | `HttpError(status, error, fields?)`. `apiNotFound`, which answers 404 `{ error: "Not found", requestId }`. `errorHandler`, which maps `HttpError` to its status; an error that carries a 4xx `status` (express.json's 400 for malformed JSON and 413 for an oversized body) to that status with `{ error: "Invalid request body", requestId }`; a `CastError` to 404 (only ids can cause one, because `normalizeInput` checks body types); and anything else to 500 `{ error: "Something went wrong", requestId }`, logging the stack. |
| `server/src/http/health.ts` | Create | Typed | `GET /healthz`: 200 `{ status: "ok", db: "up", commit }` when `mongoose.connection.readyState` is 1, otherwise 503 `{ status: "degraded", db: "down", commit }`. No database ping. |
| `server/src/http/security.ts` | Create | Typed | `securityHeaders()`: helmet with the CSP from Non-Functional Requirements (`self` plus `https://accounts.google.com/gsi/` for script, frame, connect and style; `frame-ancestors 'none'`) and `crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }`. |
| `server/src/app.ts` | Create | Typed | `createApp({ config })` builds the pipeline from "System overview" without calling `listen` (Stage 2 adds `verifyIdToken`). Stage 1 has no `/auth` or `/api` routes yet, so `/api` and `/auth` get only the JSON 404. Static files: `/assets` with a one-year `immutable` cache and `fallthrough: false`, so a missing asset is a 404; other files from `clientDir` with `index: false`; and `GET /{*splat}` sending `index.html` with `Cache-Control: no-cache`. |
| `server/src/index.ts` | Modify | Typed | Replaces the placeholder: `readConfig(process.env)`, `mongoose.set('bufferCommands', false)`, `await mongoose.connect(uri)`, `createApp(...)`, `listen(port)`, and logs the startup with the commit. Any failure logs and exits with code 1. |
| `vitest.config.ts` | Modify | Typed | Adds `globalSetup` to the `server` project. |
| `server/test/setup/globalSetup.ts` | Create | Typed | Starts one `MongoMemoryServer`, passes its URI to the tests with Vitest's `provide`, and stops it at the end. It also declares the `provide` key in Vitest's `ProvidedContext`, so `inject()` is typed. |
| `server/test/helpers.ts` | Create | Typed | `connectTestDb()`: refuses any host other than `127.0.0.1` and any database name not starting with `test-`, then connects with `test-<random>` in the URI path. `disconnectTestDb()` drops that database. Stage 2 adds the sign-in helpers. |
| `server/test/fixtures/client/` | Create | Typed | A tiny `index.html` and `assets/test.js`, used as `clientDir` in tests, so the server tests don't need a client build (CI runs `test` before `build`). |
| `server/test/config.test.ts` | Create | Typed | Missing variables are all named in one error. No value appears in the message. `commit` defaults to `"dev"`. An empty `PORT` gives 3000. |
| `server/test/health.test.ts` | Create | Typed | 200 with `db: "up"` while connected; 503 with `status: "degraded"` and `db: "down"` after disconnecting. |
| `server/test/app.test.ts` | Create | Typed | `GET /api/anything` and `GET /auth/anything` give a JSON 404 with a `requestId`. A missing `/assets` file gives 404, not `index.html`. `/` and `/anything` give `index.html` with `Cache-Control: no-cache`, and an existing asset has the one-year cache. Every response has `X-Request-Id`. The CSP header names `accounts.google.com/gsi/`. COOP is `same-origin-allow-popups`. |
| `server/test/logger.test.ts` | Create | Typed | A request with `Cookie` and `Authorization` headers, answered with a `Set-Cookie` header, is logged with all three values redacted, and its body is not logged. |
| `client/vite.config.ts` | Modify | Typed | `server.proxy` sends `/api` and `/auth` to `http://localhost:3000`, so the browser sees one origin in development too. |
| `client/src/queryClient.ts` | Create | Typed | The one `QueryClient` that the app and the tests share. `main.tsx`, `api.ts`, `session.ts` and the test render helper all import it, so `apiFetch`'s 401 handling and the component under test see the same `['me']`. The retry rule from "Client" is an exported function, `shouldRetry(failureCount, error)`: no retry on a 4xx, one retry otherwise. Mutations never retry. |
| `client/src/queryClient.test.ts` | Create | Typed | `shouldRetry` gives false for 401, 403 and 404; true on the first failure for status 0 and for a 500; and false on the second failure. |
| `client/src/test/setup.ts` | Modify | Typed | Before each test, sets the shared client's default query `retry` to false, so a failed query in a test answers at once (the retry rule has its own test). After each test, clears the client with `queryClient.clear()`, so no cached data passes from one test to the next. |
| `client/src/main.tsx` | Modify | Typed | Wraps the app in `QueryClientProvider`, `BrowserRouter` and `ErrorBoundary`. |
| `client/src/components/ErrorBoundary.tsx` | Create | Typed | A class component (React still needs one for error boundaries). It shows "Something went wrong. Reload the page." instead of a blank screen. |
| `client/src/components/ErrorBoundary.test.tsx` | Create | Typed | A child that throws shows "Something went wrong. Reload the page." instead of a blank screen. |
| `client/src/App.tsx` | Modify | Typed | A placeholder page with the app's name, replaced in Stage 2. |
| `client/src/App.test.tsx` | Create | Typed | The placeholder renders. |

**Manual setup (no files):**

1.  **Atlas:** create the Free cluster in the AWS region matching the chosen
    Render region (Oregon and `us-west-2`, Ohio and `us-east-2`, Virginia and
    `us-east-1`, Frankfurt and `eu-central-1`, Singapore and `ap-southeast-1`;
    pick the one closest to the author). Create users `jobs-prod` and
    `jobs-dev`, each with `readWrite` on its own database (`jobs_prod` or
    `jobs_dev`) and a random password of at least 24 characters from the
    password manager's generator. The databases appear on the app's first
    write; no collection is created by hand. Set network access to
    `0.0.0.0/0`. Note the cluster's exact MongoDB version and set the same
    patch in `package.json`.
2.  **Render:** create the web service from the GitHub repo: Node from
    `.node-version`; build `corepack enable && pnpm install --frozen-lockfile &&
    pnpm build`; start `node dist/server/src/index.js`; health check path
    `/healthz`; Auto-Deploy "After CI Checks Pass" on `main`; environment
    variable `MONGODB_URI` (production, with `/jobs_prod` in its path). If
    `corepack enable` fails on Render's image, replace it with
    `npm install -g pnpm@12.18.0`.
3.  **Domain:** the six steps under "Build, deploy and domain".
4.  Confirm in Render's dashboard that the health check path is active on a free
    instance. If it is not, record that in the decision log: the deploy guard
    is then connect-before-listen alone (see "Data safety, rollout and
    rollback").
5.  Leave the service idle for at least 20 minutes, then send a write:
    `curl -i -X POST -H "Content-Type: application/json" -d "{}"
    https://jobs.<domain>/auth/idle-check`. Stage 1 has no `/auth` routes, so
    an answer from the app is its JSON 404 with a `requestId`, and the app logs
    the request. Record in the decision log which of three outcomes happened:
    *   **The app's JSON 404, after a delay:** Render held the write until the
        app woke. A Save after a sleep only takes longer.
    *   **Render's loading page, and no log line from the app:** the write
        never reached the app, so saving again can't create a duplicate.
    *   **Anything else** (a 502, a timeout, or the loading page with an app
        log line): revisit the failed-write rule in "Client" before Stage 3.

**Checklist lines (desktop):**

*   S1.1 Open `https://jobs.<domain>/healthz`. Expected: `{"status":"ok","db":"up","commit":"<sha>"}`, where `<sha>` is the commit just deployed.
*   S1.2 Open `https://jobs.<domain>`. Expected: the placeholder page, with a valid certificate.
*   S1.3 Open `http://jobs.<domain>`. Expected: redirected to `https://`.
*   S1.4 Open `https://<service>.onrender.com`. Expected: Render's 404 page.

### Stage 2: Google sign-in end to end

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `server/src/auth/allowlist.ts` | Create | Typed | `parseAllowlist(raw): Set<string>` splits on commas, trims, lowercases and drops blanks. `isAllowed(set, email)` lowercases the email before checking. |
| `server/src/auth/googleVerifier.ts` | Create | Typed | `makeGoogleVerifier(clientId)` returns `verifyIdToken(token): Promise<{ sub, email, emailVerified }>`, using `OAuth2Client.verifyIdToken({ idToken, audience })`. It throws `HttpError(401, "Invalid sign-in token")` on any failure. |
| `server/src/types/express.d.ts` | Create | Typed | Adds `userId` and `email` to express-session's `SessionData`, and `user` (`{ id, email }`) to Express's `Request`. |
| `server/src/auth/session.ts` | Create | Typed | `sessionMiddleware({ secret, client })`: express-session with connect-mongo (`collectionName: "sessions"`, `ttl` 30 days in seconds), cookie name `sid`, `httpOnly`, `sameSite: "lax"`, `secure: "auto"`, `maxAge` 30 days in milliseconds, `rolling: true`, `resave: false`, `saveUninitialized: false`, no `touchAfter`. `client` is `mongoose.connection.getClient()`, so the sessions go to the database named in `MONGODB_URI`. |
| `server/src/auth/requireAuth.ts` | Create | Typed | `requireAuth(getAllowlist)`: 401 when there is no `userId` in the session. When the session's email is no longer allowed, it destroys the session and answers 401. Otherwise it sets `req.user = { id, email }`. |
| `server/src/http/security.ts` | Modify | Typed | `writeGuard(appOrigin)`: on any method other than GET and HEAD, a missing `Origin` or one that isn't `appOrigin` gets 403 `{ error: "Forbidden" }`. On POST and PATCH, a body that isn't `application/json` gets 415 `{ error: "Send JSON" }`. |
| `server/src/auth/routes.ts` | Create | Typed | Two routers. `authRouter`: `POST /google`, the sign-in flow from "Main flows" (a missing `credential` gives 400); `POST /logout`, which destroys the session, clears `sid` and answers 204. `meRouter`: `GET /me`, answering `{ email }` from `req.user`. Logs `auth.signin` and `auth.refused` (with the reason and no email). |
| `server/src/config.ts` | Modify | Typed | `SESSION_SECRET` (at least 32 characters), `GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` and `APP_ORIGIN` become required. `ALLOWED_EMAILS` is parsed once with `parseAllowlist` into a `Set`. `APP_ORIGIN` must be a bare origin (scheme, host and optional port, with no path or trailing slash), or startup names it. |
| `server/src/app.ts` | Modify | Typed | `createApp({ verifyIdToken, config })` mounts, in this order: 1 `trust proxy` = 1; 2-4 helmet, pino-http and `/healthz`, as in Stage 1; 5 on `/auth` and `/api`, `express.json()`, the session and the write guard; 6 `authRouter` on `/auth`; 7 `requireAuth` on `/api`, then `meRouter` on `/api`; 8 the JSON 404 on `/api` and `/auth`; 9-11 static files, the client-app fallback and the error handler, as in Stage 1. |
| `server/src/index.ts` | Modify | Typed | Passes `makeGoogleVerifier(config.googleClientId)` to `createApp`. |
| `server/test/helpers.ts` | Modify | Typed | `fakeVerifier`: the token `"valid:<email>"` becomes `{ sub: "sub-<email>", email, emailVerified: true }`, `"unverified:<email>"` becomes the same with `emailVerified: false`, and anything else throws a 401. `makeTestApp(overrides?)` builds the app with the fake verifier and test config: allowlist `alice@example.com,bob@example.com`, `appOrigin` `http://localhost:5173`, a 32-character secret, and the fixture `clientDir`. The allowlist is read through a getter, so a test can remove an email mid-test. `signIn(agent, email)` signs in and makes the agent send the test `Origin` on every later request. `readSession(agent)` reads the agent's stored session from the `sessions` collection. |
| `server/test/allowlist.test.ts` | Create | Typed | Spaces, capitals and blank entries are handled. |
| `server/test/auth.test.ts` | Create | Typed | Allowed sign-in gives 200, sets `sid`, and `readSession` shows the token's `sub` as `userId`. A missing `credential` gives 400. Unverified email or an unlisted account gives 403, with no session and no `Set-Cookie`. An unauthenticated `GET /api/me` sets no cookie. A bad token gives 401. `/api/me` works after sign-in and gives 401 after logout. Removing the email from the allowlist turns the next request into a 401. The cookie has `Secure` when `X-Forwarded-Proto: https` arrives and not otherwise. The session id changes at sign-in: sign in, sign in again with the same agent, and compare the two `sid` values. A sign-in logs `auth.signin`, and a refusal logs `auth.refused` with the reason and no email. |
| `server/test/security.test.ts` | Create | Typed | A form-encoded POST gets 415. A POST with a foreign `Origin` gets 403, and so does a POST with no `Origin`. A GET with no `Origin` passes. |
| `server/test/config.test.ts` | Modify | Typed | The Stage 1 cases now pass a full valid environment, so only the variable under test is missing or changed. A 31-character secret is refused and a 32-character one accepted. An `APP_ORIGIN` with a path or a trailing slash is refused. The four new variables are named when missing. |
| `server/test/app.test.ts` | Modify | Typed | The tests build the app with `makeTestApp()`. The Stage 1 404 case changes: an anonymous `GET /api/anything` now gives 401, because `requireAuth` comes before the JSON 404; a signed-in one gives the JSON 404; `GET /auth/anything` stays a JSON 404. Malformed JSON gives 400 and a body over 100 KB gives 413, both with `{ error: "Invalid request body", requestId }`. |
| `server/test/health.test.ts` | Modify | Typed | Builds the app with `makeTestApp()` instead of `createApp({ config })`, because Stage 2 changes `createApp`'s arguments and the required config. The cases stay the same. |
| `client/src/types/gsi.d.ts` | Create | Typed | The minimal types for `window.google.accounts.id.initialize`, `renderButton` and `window.onGoogleLibraryLoad`. |
| `client/index.html` | Modify | Typed | Loads `https://accounts.google.com/gsi/client` with `async`. |
| `client/src/api.ts` | Create | Typed | `apiFetch<T>(path, { method, body })` sends JSON with credentials. A 204 resolves to `undefined`. An answer with `Content-Type: application/json` is parsed; an error status throws `ApiError { status, error, fields, requestId }` with the server's values. A rejected fetch, or any other answer without JSON, throws `ApiError { status: 0, error: "Couldn't reach the server. Try again." }`. POST and PATCH always send a JSON body, `{}` when there is none, so the write guard never answers 415. A 401 is passed to `session.ts` (see below). |
| `client/src/api.test.ts` | Create | Typed | One case per rule: a 204, a JSON success, a JSON error with `fields`, an HTML answer, a rejected fetch, and the `{}` body on a bodyless POST. |
| `client/src/session.ts` | Create | Typed | The `['me']` query function maps a 401 from `GET /api/me` to `null`, so the query's data is one of four states: `undefined` while loading; `null` when never signed in (`SignInPage` shows); `{ email }` when signed in; and `{ email, signedOut: true }` when signed out mid-session (the banner shows above the page). `useSession()` reads it. `apiFetch` calls `markSignedOut()` only for a 401 from `/api/*`, never from `/auth/*`, and `markSignedOut()` changes `['me']` only while it holds an email. `signInWithCredential(credential)` posts to `/auth/google`. On a 200 it sets `['me']` to `{ email }` and refetches the other queries. On a 403 or a 401 it leaves `['me']` alone and stores the refusal under `['signInError']` (`"refused"` or `"failed"`), which `SignInPage` and `SignedOutBanner` both read; the next attempt clears it. `signOut()` posts `/auth/logout`, clears the cache and sets `['me']` to `null`. |
| `client/src/session.test.ts` | Create | Typed | With `fetch` mocked: a first 401 on `GET /api/me` gives `null`; a 401 from `/api/*` after sign-in gives signed out mid-session, with the email kept; a 401 from `/auth/google` doesn't mark the session signed out; `signInWithCredential` sets `['me']` to the email and refetches the other queries; a 403 from `/auth/google` sets `['signInError']` to `"refused"` and leaves `['me']` unchanged, and the next attempt clears it; `signOut()` posts `/auth/logout`, clears the cache and gives `null`. |
| `client/src/components/GoogleButton.tsx` | Create | Typed | The script is ready when `window.google` exists or `window.onGoogleLibraryLoad` fires. `initialize({ client_id: import.meta.env.GOOGLE_CLIENT_ID, callback, ux_mode: "popup" })` runs once per page load, with a callback that calls `signInWithCredential`. `renderButton` runs on each mount, so `SignInPage` and `SignedOutBanner` can both show the button. |
| `client/src/components/GoogleButton.test.tsx` | Create | Typed | With the `window.google` stub present, it renders the button. Without it, it renders once `window.onGoogleLibraryLoad` fires. Two mounts call `initialize` once and `renderButton` twice. |
| `client/src/test/setup.ts` | Modify | Typed | Stubs `window.google` for `GoogleButton`. |
| `client/src/test/render.tsx` | Create | Typed | Renders a component inside `QueryClientProvider` with the shared `queryClient` (reset by `setup.ts` between tests) and a `MemoryRouter` at a given URL. Each test mocks `fetch` with `vi.spyOn`. |
| `client/src/pages/SignInPage.tsx` | Create | Typed | The app's name, the Google button, and, from `['signInError']`, the CUJ 2 text after a 403 or "Sign-in failed. Try again." after a 401. |
| `client/src/pages/SignInPage.test.tsx` | Create | Typed | After a 403 from `POST /auth/google`, it shows "This Google account is not allowed to use this app." After a 401, it shows "Sign-in failed. Try again." |
| `client/src/components/SignedOutBanner.tsx` | Create | Typed | "Signed out: sign in again" with the Google button, shown above the current page. A refused re-sign-in shows the same message as `SignInPage` inside the banner, and the banner stays open. |
| `client/src/App.tsx` | Modify | Typed | Loads `['me']`. When the first `GET /api/me` answers 401, it shows `SignInPage`. Otherwise it shows the header (email, Sign out) and the placeholder page, plus the banner when signed out mid-session. |
| `client/src/App.test.tsx` | Modify | Typed | Through the render helper, with `fetch` mocked: a 401 on `GET /api/me` shows the sign-in page, and a 200 shows the email. |

**Manual setup (no files):** a Google Cloud project, a published consent screen
with only the `openid` and `email` scopes and no logo, and one Web OAuth client
with the origins `https://jobs.<domain>`, `http://localhost:5173` and
`http://localhost`. Before pushing the Stage 2 commit, add `SESSION_SECRET`,
`GOOGLE_CLIENT_ID`, `ALLOWED_EMAILS` (the author's account and the second test
account) and `APP_ORIGIN=https://jobs.<domain>` in Render, or the new startup
check fails the deploy. Add the matching secrets to each computer's `.env`.
Check the CSP and COOP values against Google's Identity Services setup guide.

**Checklist lines (desktop, iPhone Safari, Android Chrome):**

*   S2.1 Sign in with the author's account. Expected: the header shows the email.
*   S2.2 Sign in with an account that is not on the list. Expected: the refusal message. Desktop: DevTools shows no `sid` cookie. Phones: a reload still shows the sign-in page.
*   S2.3 Sign out. Expected: the sign-in page.
*   S2.4 Sign in, redeploy from Render, wait for the deploy, then reload. Expected: still signed in.

### Stage 3: full schema, create and list

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `shared/fields.ts` | Create | Typed | `STATUSES` (an `as const` array in the order of "Data model"), `STATUS_LABELS` (Saved, Applied, Interviewing, Offer, Rejected, Withdrawn, No response), `OPEN_STATUSES`, `CLOSED_STATUSES`, `WORK_MODES` and `WORK_MODE_LABELS` (Remote, Hybrid, On-site), `LIMITS` (the length caps and `note: 2000`), `WRITABLE_FIELDS` (the eleven), `MESSAGES` (the one table of field error texts that the schema, `normalizeInput` and the tests share), and the types `Status` and `WorkMode`. No TypeScript `enum`: the client template's `erasableSyntaxOnly` forbids it. |
| `shared/bullets.ts` | Create | Typed | `cleanBullets(text)`, as in "Field rules and bullet cleanup". |
| `shared/bullets.test.ts` | Create | Typed | `a•b`, `a •b` and `a\t•b` each give `a\n•b`. A bullet at the start is unchanged. `a\n•b` is unchanged. Running it twice gives the same result. Text with no bullet is unchanged. |
| `shared/api.ts` | Create | Typed | `ApplicationInput`, `ApplicationSummary`, `ApplicationDetail` and the error body type, as in "Route table", except that `ApplicationDetail` has no `notes` until Stage 4b. It has `statusHistory` and `deletedAt` from this stage on. Later stages add `Note`, `TrashSummary`, `TrashedDetail` and the export type. |
| `server/src/lib/dates.ts` | Create | Typed | `parseDay(s, now)`: strict `YYYY-MM-DD`, a round trip through `Date.UTC` that rejects impossible dates, and a rejection of any date after tomorrow in UTC. It returns a UTC-midnight `Date` or an error message. `formatDay(date)` gives `YYYY-MM-DD` in UTC. |
| `server/test/dates.test.ts` | Create | Typed | Valid dates, `2026-02-30`, `2026-2-3` and an empty string. The boundary runs at a faked `2026-11-14T23:30` New York time, which is already `2026-11-15` in UTC: `2026-11-16` (tomorrow in UTC) is accepted and `2026-11-17` is rejected. An implementation that uses the local date instead of UTC rejects `2026-11-16`, so it fails. |
| `server/src/applications/input.ts` | Create | Typed | `normalizeInput(body, { partial })`, the three checks from "Field rules and bullet cleanup". A body that isn't a plain object gives a 400. A value that isn't a string or `null` gives a 400 for that field. Any key outside `WRITABLE_FIELDS` gives a 400 `"Not allowed"` for that field. Strings are trimmed. An empty optional field, including `appliedDate`, becomes `null`. `jobDescription` goes through `cleanBullets()`. `appliedDate` goes through `parseDay()`. `partial: false` (create) requires company and role; `partial: true` (PATCH) checks only the fields sent. It returns the fields ready for Mongoose. |
| `server/test/input.test.ts` | Create | Typed | Unknown and server-only keys are refused. A number, an array and an object each give a field error, and a body that is an array gives 400. Trimming is applied, and an empty optional string or date becomes `null`. `jobDescription` comes back with its bullets cleaned. A bad date gives a field error. |
| `server/src/applications/model.ts` | Create | Typed | The `applications` schema from "Data model", with messages from `MESSAGES` (for example "At most 150 characters"). Holds the `statusHistory` subschema (with `_id: false`), the index, and the `toJSON` transform. The notes subschema is added in Stage 4b. |
| `server/src/applications/repo.ts` | Create | Typed | The `active()` and `trashed()` filters. `listActive(userId)`, which projects the summary fields. `create(userId, input)`, which writes the first history entry for the starting status. |
| `server/src/applications/routes.ts` | Create | Typed | `GET /api/applications` and `POST /api/applications`. |
| `server/src/http/errors.ts` | Modify | Typed | Maps `ValidationError` to a 400 with `fields`. |
| `server/src/app.ts` | Modify | Typed | Mounts the applications router. |
| `server/test/applications.test.ts` | Create | Typed | Create with company and role only gives 201 with status `saved`, one history entry `{ status, changedAt }` and `appliedDate: null`, and the response has exactly the `ApplicationDetail` keys. The other fields round-trip, including the date as `YYYY-MM-DD`. A missing company, an over-long role, a `javascript:` URL, a bad work mode or a future date each give a 400 naming the field. A description whose bullets push it past 10,000 characters after cleanup gives a 400. A posted `userId` gives 400. The list returns exactly the summary keys, active rows only, for the signed-in user only. |
| `server/test/helpers.ts` | Modify | Typed | `buildInput(overrides)` returns valid `ApplicationInput` for tests. |
| `server/test/crossUser.test.ts` | Create | Typed | Bob can't see Alice's application in his list. Later stages add one case per data route, as listed under "Tests". |
| `client/src/lib/dates.ts` | Create | Typed | `todayLocal()`, `displayDay(yyyyMmDd)` and `formatTime(iso)`. |
| `client/src/lib/dates.test.ts` | Create | Typed | At a faked `2026-11-14T23:30` New York time (already 2026-11-15 in UTC), `todayLocal()` gives `2026-11-14`. `displayDay` doesn't shift the day. |
| `client/src/lib/listView.ts` | Create | Typed | `sortApplications(list)`, the default order only: empty applied dates first, then applied date newest first, with ties by created date newest first. Stage 6 extends this module. |
| `client/src/lib/listView.test.ts` | Create | Typed | The default order, including ties. |
| `client/src/components/CharCounter.tsx` | Create | Typed | Shows `n / limit`, red when over the limit. |
| `client/src/pages/ListPage.tsx` | Create | Typed | Loads `['applications']` and shows a table: company, role and status label on all widths; location, applied date and work mode from Tailwind's `sm` breakpoint. Empty state: "No job applications yet. Add one to get started." Loading and error states. A "New" link. |
| `client/src/pages/ListPage.test.tsx` | Create | Typed | Rows show company, role and status in the default order. With no applications, the empty state shows its text. |
| `client/src/pages/ApplicationFormPage.tsx` | Create | Typed | The create form: the eleven fields, status defaulting to Saved, work mode defaulting to "Not set", `noValidate` with no `maxLength`, `required` or `pattern`, the job description counter counting `cleanBullets(value).length`, field errors from `fields`, and the input kept on a 401. Save is disabled while the request is pending. On success, the client invalidates the list and returns to it. |
| `client/src/pages/NotFoundPage.tsx` | Create | Typed | "Not found" and a link to the list. |
| `client/src/App.tsx` | Modify | Typed | Routes `/`, `/applications/new` and `*`, plus the header link to New. |
| `client/src/pages/ApplicationFormPage.test.tsx` | Create | Typed | A 400 shows the field message. A 401 keeps every typed value and shows the banner. An answer that isn't JSON keeps every typed value and shows "Couldn't reach the server. Try again." Save can't be pressed twice while a request is pending. |

**Checklist lines (all three browsers):**

*   S3.1 Add an application with company and role only. Expected: it appears at the top with status Saved.
*   S3.2 Add one with a 151-character company. Expected: "At most 150 characters" under Company, and the form keeps its values.
*   S3.3 Open the list in desktop responsive mode at 360 px, then on each phone. Expected: company, role and status only, with no sideways scrolling.

### Stage 4a: detail, edit, status change, timeline and Move to Trash

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `server/src/applications/repo.ts` | Modify | Typed | `getActive(userId, id)`, `updateActive(userId, id, fields, nextStatus?)` (the update from "Main flows": one atomic status-and-history update, then a fields-only update when the status didn't change) and `trash(userId, id)`. |
| `server/src/applications/routes.ts` | Modify | Typed | `GET`, `PATCH` and `DELETE /api/applications/:id`. |
| `server/test/applications.test.ts` | Modify | Typed | Detail returns exactly the `ApplicationDetail` keys, with `deletedAt: null`. PATCH changes only the fields sent, `null` clears an optional field, `null` on company gives 400, and a non-string `company` gives 400 naming the field. A status change appends one entry with the faked time. Repeating the current status adds none. Two PATCHes with the same new status add exactly one entry. DELETE sets `deletedAt`; after it, the detail gives 404 and the list no longer has the row. Trashing adds no history entry. A malformed id gives 404. |
| `server/test/crossUser.test.ts` | Modify | Typed | Bob gets 404 on Alice's GET, PATCH and DELETE. |
| `client/src/lib/appliedDateRule.ts` | Create | Typed | `nextAppliedDate(nextStatus, currentDate, today)`. |
| `client/src/lib/appliedDateRule.test.ts` | Create | Typed | A change to applied with an empty date fills it. Every other case returns the current date unchanged, including applied back to saved. |
| `client/src/components/QuickStatus.tsx` | Create | Typed | A status select and a date input. A change to applied fills the date through `nextAppliedDate`. Save sends one PATCH, and is disabled while it is pending. |
| `client/src/components/Timeline.tsx` | Create | Typed | `statusHistory` oldest first: badge, label and local time. Until Stage 6 adds `StatusBadge`, it shows the label alone. |
| `client/src/pages/DetailPage.tsx` | Create | Typed | Loads `['application', id]`. Shows the fields (the job URL as a safe link, see "Display"; long text with `whitespace-pre-wrap`), `QuickStatus`, `Timeline`, Edit and Move to Trash (no confirmation; returns to the list). A 404 shows `NotFoundPage`. |
| `client/src/pages/ApplicationFormPage.tsx` | Modify | Typed | Edit mode: loads the detail, applies the date rule on a status change, and sends only the changed fields. With no changes it sends nothing. Either way it returns to the detail page. |
| `client/src/pages/ListPage.tsx` | Modify | Typed | Each row's company cell holds the link to `/applications/:id`, with its hit area stretched over the row (see "Display"). |
| `client/src/App.tsx` | Modify | Typed | Routes `/applications/:id` and `/applications/:id/edit`. |
| `client/src/components/QuickStatus.test.tsx` | Create | Typed | Choosing Applied with an empty date fills in today's local date, and the user can change it. |
| `client/src/pages/ApplicationFormPage.test.tsx` | Modify | Typed | In edit mode, changing one field sends a PATCH holding only that field. Saving with no changes sends no request and returns to the detail page. |
| `client/src/pages/DetailPage.test.tsx` | Create | Typed | The fields and the timeline render. A 404 shows "Not found". |
| `client/src/components/Timeline.test.tsx` | Create | Typed | Entries out of order in the data render oldest first, in local time. |

**Checklist lines (all three browsers):**

*   S4a.1 Tap a row. Expected: the detail page shows every field and the actions.
*   S4a.2 Edit the location and save. Expected: the new value shows on the detail page and in the list.
*   S4a.3 On a Saved application with no date, choose Applied in the quick status control. Expected: the date shows today's local date. Save. Expected: the row moves into date order.
*   S4a.4 Create one with a job description of `Skills: • A • B`. Expected: on the detail page, each bullet starts a new line.
*   S4a.5 Move to Trash. Expected: the list no longer shows it.
*   S4a.6 Signed in as the second account, open the author's application URL. Expected: "Not found".
*   S4a.7 Change a status twice. Expected: the timeline shows the first entry and both changes, oldest first, with local times.

### Stage 4b: notes

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `server/src/applications/repo.ts` | Modify | Typed | `addNote`, `editNote` and `deleteNote`, as in "Main flows". `addNote` and `editNote` each run one `findOneAndUpdate` with `returnDocument: "after"` and return the note with that id from the transformed document (through the notes `toJSON` rules), or `null` when nothing matched. `deleteNote` returns whether a note matched. The route turns no match into a 404. |
| `server/src/applications/notesRoutes.ts` | Create | Typed | `POST /api/applications/:id/notes`, `PATCH` and `DELETE /api/applications/:id/notes/:noteId`. The body must be `{ body }` with a string: any other key or type, a body that is empty after trimming, or one longer than 2,000 characters gives a 400. |
| `server/src/applications/model.ts` | Modify | Typed | Adds the notes subschema. The `toJSON` transform sorts notes newest first, leaves out deleted ones, and maps each note to `{ id, body, createdAt, editedAt? }`. |
| `server/src/app.ts` | Modify | Typed | Mounts the notes router. |
| `shared/api.ts` | Modify | Typed | `Note`, and `ApplicationDetail.notes`. |
| `server/test/notes.test.ts` | Create | Typed | Add gives 201 with exactly the `Note` keys. Notes come back newest first. Editing sets `editedAt` and gives 200. Delete hides the note from the detail. Deleting it again gives 404. A note id under a different application gives 404. While the parent is in Trash, every note route gives 404. After `deletedAt` is set and then cleared through the model, the notes are intact. 2,001 characters gives 400, and so does a non-string `body`, a body with any key other than `body`, and a `body` that is empty after trimming. |
| `server/test/applications.test.ts` | Modify | Typed | The expected `ApplicationDetail` key set gains `notes`, an empty array for a new application. |
| `server/test/crossUser.test.ts` | Modify | Typed | Bob gets 404 on Alice's three note routes. |
| `client/src/components/NotesPanel.tsx` | Create | Typed | A textarea with a `CharCounter`, Add, the list newest first with local times and "edited", inline edit (Save sends no PATCH when the text is unchanged), and Delete with `confirm("Delete this note? It disappears from the app.")`. |
| `client/src/test/setup.ts` | Modify | Typed | Stubs `window.confirm`, which jsdom doesn't implement. |
| `client/src/pages/DetailPage.tsx` | Modify | Typed | Shows `NotesPanel` in a section with the id `notes`. When the URL hash is `#notes`, it scrolls to that section and moves focus to it, because React Router doesn't. |
| `client/src/components/NotesPanel.test.tsx` | Create | Typed | Notes render newest first with "edited". A cancelled confirm sends no request. Saving an unchanged edit sends no request. |
| `client/src/pages/DetailPage.test.tsx` | Modify | Typed | With the URL hash `#notes`, focus moves to the notes section. |

**Checklist lines (all three browsers):**

*   S4b.1 Add two notes. Expected: the newer one shows first.
*   S4b.2 Edit one. Expected: it shows "edited".
*   S4b.3 Delete one and confirm. Expected: it disappears and does not come back after a reload.

### Stage 5: Trash, Restore, Delete forever and Export

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `server/src/applications/repo.ts` | Modify | Typed | `listTrashed(userId)` (newest `deletedAt` first), `getTrashed` (which leaves out `notes` with a projection), `restore` and `purge`, as in "Main flows". `exportAll(userId)`: every application, active and trashed, newest created first. |
| `server/src/applications/trashRoutes.ts` | Create | Typed | `GET /api/trash`, `GET /api/trash/:id`, `POST /api/trash/:id/restore` and `DELETE /api/trash/:id`. Logs `application.purged` with the note count. |
| `server/src/applications/exportRoute.ts` | Create | Typed | `GET /api/export?date=YYYY-MM-DD`: `Content-Disposition: attachment; filename="job-applications-<date>.json"`, using the client's local `date`, or the server's UTC date when `date` is missing or isn't a valid `YYYY-MM-DD`; and `{ exportedAt, applications }`. |
| `server/src/app.ts` | Modify | Typed | Mounts the trash router and the export route. |
| `shared/api.ts` | Modify | Typed | `TrashSummary`, `TrashedDetail` and the export type. |
| `client/src/lib/dates.ts` | Modify | Typed | `localDay(iso)`: the local calendar date of a timestamp. |
| `client/src/lib/dates.test.ts` | Modify | Typed | In New York, `localDay('2026-11-15T04:30:00Z')` gives 14 November 2026, not 15 November. |
| `server/test/trash.test.ts` | Create | Typed | Only trashed rows are listed, newest first, with exactly the `TrashSummary` keys. An active id gives 404 on every trash route. A trashed detail has exactly the `TrashedDetail` keys, so no `notes`. Restore gives 204 and brings the application back with its notes and history unchanged. Purge gives 204, leaves no document, and logs `application.purged` with the note count. Purging an active id gives 404, and the document survives. Restore adds no history entry. |
| `server/test/export.test.ts` | Create | Typed | It contains active and trashed applications with history and live notes, leaves out deleted notes and other users' data, and sends the attachment header. The filename uses a valid `date` and falls back to the UTC date for an invalid one. |
| `server/test/crossUser.test.ts` | Modify | Typed | Bob's trash list and export hold none of Alice's data, and Bob gets 404 on Alice's three trash id routes. That completes the cross-user cases listed under "Tests". |
| `client/src/lib/confirmText.ts` | Create | Typed | `purgeMessage(app)`: `Delete "<company> – <role>" forever? This can't be undone.`, so the Trash list and `TrashDetailPage` share one text. |
| `client/src/pages/ListPage.tsx` | Modify | Typed | Trash mode: loads `['trash']` and shows a deleted date (through `localDay`, because `deletedAt` is a timestamp). Each row links to `/trash/:id` and has visible Restore and Delete forever buttons, outside the row's link (see "Display"); both stay on `/trash`. Delete forever asks `confirm(purgeMessage(app))`. Empty state: "Trash is empty." |
| `client/src/pages/TrashDetailPage.tsx` | Create | Typed | Read-only fields and `Timeline`, with Restore (which opens `/applications/:id`) and Delete forever (which asks `confirm(purgeMessage(app))` and returns to `/trash`). No notes: showing them read-only would need a second mode of `NotesPanel`, and Trash only needs enough to choose between Restore and Delete forever. |
| `client/src/App.tsx` | Modify | Typed | Routes `/trash` and `/trash/:id`. Trash and Export links in the header; Export is a plain `<a href="/api/export?date=<todayLocal()>" download>`. If the session has ended, the browser saves the 401 body instead of an export; that is accepted, and the next request shows the banner. |
| `client/src/pages/TrashDetailPage.test.tsx` | Create | Typed | A cancelled confirm sends no request. The confirm text names the company and role. |
| `client/src/pages/ListPage.test.tsx` | Modify | Typed | Trash mode shows the deleted date in local time (a `deletedAt` of `2026-11-15T04:30:00Z` shows 14 November) and both buttons. A cancelled Delete forever confirm sends no request. The confirm text names the company and role. |

**Checklist lines (all three browsers):**

*   S5.1 Move an application with notes to Trash, then open `/trash` and tap it. Expected: the read-only page with its fields and timeline, and no notes, no Edit button and no status control.
*   S5.2 Restore it. Expected: back in the list, with its notes.
*   S5.3 Trash it again, then Delete forever and confirm. Expected: gone from Trash. Its old `/applications/:id` URL shows "Not found".
*   S5.4 Tap Export. Expected on phones: a file named `job-applications-<today's local date>.json` downloads. Expected on desktop: the file holds the active and trashed applications, with notes and history.
*   S5.5 Note a trashed application's timeline, then restore it. Expected: its timeline on `/applications/:id` is unchanged.

### Stage 6: search, filter, sort, autocomplete, badges and the row menu

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `client/src/lib/listView.ts` | Modify | Typed | `normalizeText`, `searchApplications(list, q)` (company, role and location), `filterApplications(list, filter)` (`all`, `open`, `closed` or one status) and `sortApplications(list, sort, dir)` (company, role, status in enum order, applied date with empty dates kept at the top). |
| `client/src/lib/listView.test.ts` | Modify | Typed | `sao` finds `São`. `ACME` finds `Acme`. Open returns only saved, applied and interviewing; Closed returns only offer, rejected, withdrawn and no response. Each sort gives the expected order in both directions, ties fall back to created date newest first, and empty dates stay at the top. An invalid `sort` or `status` value gives the default. |
| `client/src/lib/distinctValues.ts` | Create | Typed | As in "Client". |
| `client/src/lib/distinctValues.test.ts` | Create | Typed | `Google` (oldest), `google ` and `GOOGLE` (newest by `createdAt`) give one entry, `GOOGLE`. Blanks are dropped. The order is A to Z ignoring case and accents. |
| `client/src/lib/badges.ts` | Create | Typed | `Record<Status, string>`: saved `bg-slate-100 text-slate-800`, applied `bg-blue-100 text-blue-800`, interviewing `bg-amber-100 text-amber-900`, offer `bg-green-100 text-green-800`, rejected `bg-red-100 text-red-800`, withdrawn `bg-zinc-200 text-zinc-700`, no_response `bg-purple-100 text-purple-800`. A missing status fails the type check. |
| `client/src/components/StatusBadge.tsx` | Create | Typed | The label from `STATUS_LABELS` in the badge classes. |
| `client/src/components/RowMenu.tsx` | Create | Typed | Built last in Stage 6, and the first part of Stage 6 to be cut (see the 2027-01-24 checkpoint under "Risks and Mitigations"). A `popover="auto"` list of buttons: View opens the detail page; Edit opens the edit page; Notes opens `/applications/:id#notes`, where the notes section takes focus; Move to Trash acts as on the detail page and stays on the list. It is placed at the pointer, or at the row when opened from the keyboard (a `contextmenu` event with no pointer position, `clientX` and `clientY` both 0). It focuses View when it opens and returns focus to the row's link when it closes. |
| `client/src/pages/ListPage.tsx` | Modify | Typed | In active mode: the search box, the filter select and sortable column headers, all kept in `?q=&status=&sort=&dir=` with `useSearchParams`, following the URL rules under "Choices made in this draft" (each update replaces the history entry). Each row's link gets `onContextMenu`, which opens `RowMenu`. The no-match state says "No applications match your filters." Trash mode gets none of these. Both modes show `StatusBadge`. |
| `client/src/pages/ApplicationFormPage.tsx` | Modify | Typed | `<datalist>` elements for company, role and location, filled from `distinctValues` over `['applications']`. |
| `client/src/pages/DetailPage.tsx` | Modify | Typed | Shows `StatusBadge`. |
| `client/src/components/Timeline.tsx` | Modify | Typed | Shows `StatusBadge` next to each entry's time. |
| `client/src/test/setup.ts` | Modify | Typed | Stubs `showPopover` and `hidePopover`, in case jsdom lacks the Popover API. |
| `client/src/pages/ListPage.test.tsx` | Modify | Typed | The URL query drives the shown rows. A right-click opens the menu with four items, with focus on View. Escape closes it and returns focus to the row's link. In trash mode, a right-click opens no menu. |
| `client/src/pages/ApplicationFormPage.test.tsx` | Modify | Typed | The `<datalist>` holds the distinct values. |

**Checklist lines:**

*   S6.1 (all) Search `sao` with a company named `São Paulo Tech`. Expected: it is found.
*   S6.2 (all) Filter Open, then Closed, then Offer. Expected: only matching rows.
*   S6.3 (all) Sort by company both ways. On desktop, also sort by applied date both ways. Expected: A to Z then Z to A for company, newest first then oldest first for applied date, with undated rows on top both times.
*   S6.4 (all) In New, type the start of an existing company. Expected: it is suggested once.
*   S6.5 (all) With one practice application per status (seven in all), open the list. Expected: seven different badge colors.
*   S6.6 (desktop) Right-click a row, then press Escape. Tab to a row and press Shift+F10. Expected: the menu opens with four items and closes on Escape.

### Done check

| File | Action | Written by | What and why |
| --- | --- | --- | --- |
| `docs/acceptance-checklist.md` | Modify | Typed | Adds the final full run to the log. |
| `docs/decision-log.md` | Modify | Typed | Records the wipe and the start of real use, from which point schema changes only add fields. |

**Checklist lines:** run every line from S1.1 to S6.6 again, in the columns
each line names, and log the run. If the 2027-01-24 checkpoint moved Stage 6
to after done, the run covers S1.1 to S5.5; if it cut only `RowMenu`, the run
covers S1.1 to S6.5. Also
compare the Atlas cluster's MongoDB version with the test pin.

**After the final run (no files):** drop the `applications` and `sessions`
collections in `jobs_prod` from Atlas's Data Explorer, then restart the service
from Render, because Mongoose and connect-mongo build their indexes only at
startup. Check in Atlas's Indexes tab that both indexes exist again. Remove the
second account from `ALLOWED_EMAILS` in Render. Real use starts.

Any checklist write step run after done (for example Stage 6 under the
fixed-date rule) uses the second account, added back to `ALLOWED_EMAILS` for
that run and removed afterwards, so real data gets no test rows or history
entries.

### Verification Plan

*   **Build:** `pnpm build`, run locally on both computers, in CI, and in
    Render's build.
*   **Static analysis:** `pnpm lint` (oxlint), `pnpm format` (Prettier check)
    and `pnpm typecheck` (`tsc` for the client and the server).
*   **Tests:** `pnpm test` (Vitest: the `server` project, which also runs the
    `shared/` tests, and the `client` project). It runs in New York time, with a
    guard test in each project.
*   **CI:** `.github/workflows/ci.yml` must pass on every pushed commit. Render
    deploys only commits whose checks passed.
*   **Coverage:** there is no percentage target. The bar is that every
    automated test listed under "Tests" in the Technical Plan exists, and that
    each feature started with a failing test: `docs/steps.md` records each red
    step.
*   **Production:** each stage's checklist lines pass on production for the
    deployed commit (as reported by `/healthz`), on desktop and, from Stage 2
    on, both phones. The run is logged in `docs/acceptance-checklist.md`.
*   **Done:** the whole checklist (or the range the 2027-01-24 checkpoint
    set) passes in one logged run, with CI passing on the same commit, by
    2027-01-31.

--------------------------------------------------------------------------------

## Additional Resources

*   Old app (behavior reference only): the author's PHP MVC app, a local copy
    that is not in this repository.
*   Vendor facts, checked on 2026-11-14:
    *   [Render: free instances](https://render.com/docs/free): 15-minute
        spin-down, about one minute to wake, 750 hours per workspace, custom
        domains supported.
    *   [Render: custom domains](https://render.com/docs/custom-domains): Hobby
        includes two; the `onrender.com` subdomain can be disabled (404); no
        built-in redirect; remove `AAAA`; `CAA` must allow `letsencrypt.org` and
        `pki.goog`.
    *   [Render: TLS](https://render.com/docs/tls): free certificates, renewed
        automatically.
    *   [Render: health checks](https://render.com/docs/health-checks): the Host
        is the custom domain once verified; 2xx or 3xx within 5 seconds counts
        as healthy. The page does not say whether the free tier is excluded;
        Stage 1 confirms in the dashboard (see Open Questions).
    *   [Render: outbound IPs](https://render.com/docs/outbound-ip-addresses):
        ranges per region, shared by every service in the region.
    *   [Render: deploys](https://render.com/docs/deploys): "After CI Checks
        Pass" skips the deploy when no check runs or any check fails.
    *   [Render: build pipeline](https://render.com/docs/build-pipeline): 500
        minutes per month on Hobby.
    *   [Render: environment variables](https://render.com/docs/environment-variables):
        `RENDER_GIT_COMMIT`.
    *   [Render: pinning versions](https://render.com/articles/pinning-nodejs-python-ruby-versions):
        `packageManager`, `.node-version`; Node 25 and later don't ship
        Corepack. Render does not document its Corepack version, so the first
        Stage 1 build is the check.
    *   [Atlas: Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/):
        0.5 GB, 100 operations per second, 500 connections, pause after 30 idle
        days; `mongodump` and `mongorestore` supported.
    *   [Atlas: Free cluster backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/):
        a paid subscription ($0.10 a day, up to $3.00 a month) that needs a
        payment method, in private preview.
    *   [Google: app audience](https://support.google.com/cloud/answer/15549945?hl=en)
        and [verification](https://support.google.com/cloud/answer/13461325?hl=en):
        a published app with only identity scopes needs no verification.
    *   [Mongoose: migrating to 9](https://mongoosejs.com/docs/migrating_to_9.html):
        none of the 9.x breaking changes affect the APIs this design uses.
    *   [pnpm: approve-builds](https://pnpm.io/cli/approve-builds) and
        [build settings](https://pnpm.io/settings/build): `allowBuilds`;
        unreviewed build scripts fail the install by default.
    *   [Node: TZ on Windows](https://github.com/nodejs/node/issues/4230):
        setting `process.env.TZ` works on Windows in Node 24.
    *   [mongodb-memory-server: config options](https://typegoose.github.io/mongodb-memory-server/docs/api/config-options):
        download folder and version settings.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with the Elephant-Goldfish Model (EGM) review workflow*
