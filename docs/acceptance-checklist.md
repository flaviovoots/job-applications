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

## Run log

One row per device and browser in each run. Dates are `YYYY-MM-DD`, and the
commit is the short SHA from `/healthz`. Results lists each step run, for
example `S1.1 pass, S1.2 fail`.

| Date | Commit | Device and browser | Results | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-19 | 111beb2 | Desktop (Windows 11), Brave | S1.1 pass, S1.2 pass, S1.3 pass, S1.4 pass | Stage 1 lines only. |
