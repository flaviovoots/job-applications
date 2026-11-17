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

## Run log

One row per device and browser in each run. Dates are `YYYY-MM-DD`, and the
commit is the short SHA from `/healthz`. Results lists each step run, for
example `S1.1 pass, S1.2 fail`.

| Date | Commit | Device and browser | Results | Notes |
| --- | --- | --- | --- | --- |
