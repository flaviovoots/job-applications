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

## Run log

One row per device and browser in each run. Dates are `YYYY-MM-DD`, and the
commit is the short SHA from `/healthz`. Results lists each step run, for
example `S1.1 pass, S1.2 fail`.

| Date | Commit | Device and browser | Results | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-19 | 111beb2 | Desktop (Windows 11), Brave | S1.1 pass, S1.2 pass, S1.3 pass, S1.4 pass | Stage 1 lines only. |
| 2026-11-24 | 25b7557 | Desktop (Windows 11), Brave | S2.1 pass, S2.2 pass, S2.3 pass, S2.4 pass | Stage 2 lines only. |
| 2026-11-24 | 25b7557 | Android (Pixel 9), Brave | S2.1 pass, S2.2 pass, S2.3 pass, S2.4 pass | Stage 2 lines only. Brave, not Chrome: the Android Chrome and iPhone Safari runs come before Stage 3's merge to `main`. |
