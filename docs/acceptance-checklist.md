# Acceptance checklist

Manual checks on production, against the commit that `/healthz` reports. Each
stage adds its lines when it ships, and they must pass before the next stage
starts. Stage 0 isn't deployed, so it has none. Done is one logged run of the
whole checklist on a desktop browser, iPhone Safari and Android Chrome.

## Steps

In the device columns, "yes" means the step is run on that device, and "—"
means it isn't.

| # | Stage | Step | Expected result | Desktop | iPhone Safari | Android Chrome |
| --- | --- | --- | --- | --- | --- | --- |
| S1.1 | 1 | Open `https://jobs.<domain>/healthz`. | `{"status":"ok","db":"up","commit":"<sha>"}`, where `<sha>` is the commit just deployed. | yes | — | — |
| S1.2 | 1 | Open `https://jobs.<domain>`. | The placeholder page, with a valid certificate. | yes | — | — |
| S1.3 | 1 | Open `http://jobs.<domain>`. | Redirected to `https://`. | yes | — | — |
| S1.4 | 1 | Open `https://<service>.onrender.com`. | Render's 404 page. | yes | — | — |
| S2.1 | 2 | Sign in with the author's account. | The header shows the email. | yes | yes | yes |
| S2.2 | 2 | Sign in with an account that is not on the list. | The refusal message. Desktop: DevTools shows no `sid` cookie. Phones: a reload still shows the sign-in page. | yes | yes | yes |
| S2.3 | 2 | Sign out. | The sign-in page. | yes | yes | yes |
| S2.4 | 2 | Sign in, redeploy from Render, wait for the deploy, then reload. | Still signed in. | yes | yes | yes |
| S3.1 | 3 | Add an application with company and role only, with a company that says "Test". | It appears at the top of the list with status Saved. | yes | yes | yes |
| S3.2 | 3 | Add one with a 151-character company. | "At most 150 characters" under Company, and the form keeps its values. | yes | yes | yes |
| S3.3 | 3 | Open the list. Desktop: DevTools' responsive mode at 360 px. | Company, role and status only, with no sideways scrolling. | yes | yes | yes |
| S4a.1 | 4a | Tap a row on its role, not its company. Desktop: click it. | The detail page shows every field ("Not set" for an empty one), the quick status control, the timeline, Edit and Move to Trash. | yes | yes | yes |
| S4a.2 | 4a | Edit the location and save. Phones: turn the phone sideways before checking the list. | The new location shows on the detail page and in the list. | yes | yes | yes |
| S4a.3 | 4a | On a Saved application with no date, choose Applied in the quick status control, then Save status. | Choosing Applied fills in today's local date. After Save status, the row moves into date order in the list. | yes | yes | yes |
| S4a.4 | 4a | Add one with a company that says "Test" and the job description `Skills: • A • B`. | On the detail page, each bullet starts a new line. | yes | yes | yes |
| S4a.5 | 4a | Move a "Test" application to Trash. | Back on the list, which no longer shows it. | yes | yes | yes |
| S4a.6 | 4a | Copy the URL of one of the author's applications, then sign in with the second account and open it. | "Not found". | yes | yes | yes |
| S4a.7 | 4a | Change an application's status twice in the quick status control. | The timeline shows the first entry and both changes, oldest first, in local time. | yes | yes | yes |

## Run log

One row per device and browser in each run. Dates are `YYYY-MM-DD`, and the
commit is the short SHA from `/healthz`. Results lists each step run, for
example `S1.1 pass, S1.2 fail`.

| Date | Commit | Device and browser | Results | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-19 | 111beb2 | Desktop (Windows 11), Brave | S1.1 pass, S1.2 pass, S1.3 pass, S1.4 pass | Stage 1 lines only. |
| 2026-11-24 | 25b7557 | Desktop (Windows 11), Brave | S2.1 pass, S2.2 pass, S2.3 pass, S2.4 pass | Stage 2 lines only. |
| 2026-11-24 | 25b7557 | Android (Pixel 9), Brave | S2.1 pass, S2.2 pass, S2.3 pass, S2.4 pass | Stage 2 lines only. Brave, not Chrome: the Android Chrome and iPhone Safari runs come before Stage 3's merge to `main`. |
| 2026-11-26 | 97f27d0 | Desktop (Windows 11), Brave | S3.1 pass, S3.2 pass, S3.3 pass | Stage 3 lines only. No phone was available: the iPhone Safari and Android Chrome runs of S2.1 to S2.4 and S3.1 to S3.3 come before Stage 4a's merge to `main`. |
