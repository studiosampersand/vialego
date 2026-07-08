# MoBud v0.000.004 beta setup

## GitHub beta branch / site

Recommended safe test setup: keep production in `vialego` and publish this beta from a separate public repository named `mobud-beta` (or `vialego-beta`). Upload the app files from this ZIP to the repository root. Do not upload `CLOUDFLARE-WORKER.js` to the public app repository if you prefer to keep infrastructure code separate; it contains no secret, but is only deployment source.

In the beta repository: Settings → Pages → Deploy from a branch → `main` → `/root`. The expected URL is `https://studiosampersand.github.io/mobud-beta/`.

## Cloudflare Worker

Open Cloudflare → Compute → Workers & Pages → `vialego-api` → Edit code. Replace the Worker code with `CLOUDFLARE-WORKER.js` and deploy.

Under Settings → Variables and Secrets, keep:

- `ORS_API_KEY` — Secret — your openrouteservice key.

Add:

- `GITHUB_TOKEN` — Secret — a fine-grained GitHub personal access token.
- `GITHUB_REPO` — ordinary variable — `studiosampersand/vialego` (or the repository where issues should be created).

Create the fine-grained GitHub token at GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Restrict it to the chosen repository and grant only: **Issues: Read and write** and **Metadata: Read-only**. Do not place the token in GitHub, `config.js`, or the ZIP.

The Worker and GitHub API both have free tiers. This remains free for normal beta volumes, subject to their published usage limits.

## Test support forms

Open MoBud → Setup → Feedback → Report bug. Submit a harmless test. Confirm a new issue appears in the configured GitHub repository. Delete the test issue afterwards.

## Reminders

Daily/weekly commute reminders are included as an in-app beta feature. They trigger when MoBud is open or becomes visible after the configured time. Guaranteed delivery while the app is fully closed requires Web Push and is not part of this build.

## Public transport

Setup includes official SNCB/NMBS and De Lijn links for ticket purchase and subscription management. MoBud only records the trip and optional supporting document.

## Data safety

The beta continues using the isolated storage key `vialego-beta-data-v0.000.004`, preserving separation from production. Code/service-worker updates do not clear logs or attachments. Google Drive remains optional and is not a production-ready sync backend in this build.
