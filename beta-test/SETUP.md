# MoBud v0.000.006 Beta 1 — manual upload

## GitHub
1. Export a JSON backup from the current beta and production app.
2. Open the `MoBud` repository and then the `beta-test` folder.
3. Upload the files from this ZIP directly into `beta-test`, replacing matching files.
4. Do not create an extra nested folder.
5. Commit as `Upload MoBud v0.000.006 beta 1`.
6. Wait for GitHub Pages, then open `https://studiosampersand.github.io/MoBud/beta-test/`.
7. Apply the update banner or close and reopen the beta.

## Cloudflare
The frontend update does not require a new Worker deployment if the v0.000.005 Worker is already active.

Verify under Worker settings:
- Secret `ORS_API_KEY`
- Secret `GITHUB_TOKEN`
- Variable `GITHUB_REPO=studiosampersand/MoBud`

The existing public Worker URL may remain:
`https://vialego-api.studiosampersand.workers.dev`

You can rename it later, but then also change `API_BASE` in `config.js`.

## Test
1. Confirm the version reads `v0.000.006 beta 1`.
2. Test System, Dark and Light under More → Setup → Appearance.
3. Change language and confirm Dashboard, Garage, Reports and common forms update.
4. Save your name, reload, and confirm the greeting retains it.
5. Export JSON and confirm the file contains `settings`, `vehicles`, `trips` and `expenses`.
6. Confirm existing v0.000.005 beta data was copied into v0.000.006.
7. Test address search, route calculation and one support form.
8. Install the PWA through the orange banner.

## Google Drive
Leave `GOOGLE_CLIENT_ID` empty for now. The visible Drive button is not yet a completed conflict-safe backup/sync solution.
