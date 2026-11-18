# Ali Raza - application page for Fredrin (GTM Engineer)

A single-page static site: semantic HTML, one CSS file, two small vanilla JS files. No framework, no build step, no external fonts, no CDN, no analytics, no network requests at runtime.

Status: **not deployed.** Nobody has enabled GitHub Pages for this repository and nothing has been sent to anyone.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

Demo link to try: `http://localhost:8000/?utm_source=hackernews&utm_medium=application&utm_campaign=fredrin`

## Tests

```sh
node --test
```

Dependency-free (node built-ins only). Covers the source-capture logic in `capture.js`: sanitizer and 80-char limit, hostname-only referrer, direct fallback, malicious and malformed input, blocked storage fallback, reset.

## Files

- `index.html`, `styles.css`, `app.js` - the page and DOM wiring
- `capture.js` - source-capture logic (UMD, testable in node)
- `test/capture.test.js` - tests
- `.github/workflows/pages.yml` - optional Pages deploy action (manual trigger only)
- `.claude/skills/verify-app/` - project verification skill

All URLs are relative, so the site works under a project subpath such as `/ali-fredrin-gtm/`.

## Deploying to GitHub Pages (not done yet)

No-build option: Settings > Pages > Build and deployment > Deploy from a branch > `main` / `(root)`.

Optional action: set Settings > Pages > Source to "GitHub Actions", then run the "Deploy static site to Pages" workflow manually. It only runs on `workflow_dispatch`, so merging this repo deploys nothing.

## Privacy notes for the demo

- Captures only `utm_source`, `utm_medium`, `utm_campaign` and the referrer **hostname** (never the full referrer URL).
- Every captured string is stripped of control characters, trimmed and limited to 80 characters; all output uses `textContent`.
- State lives in `sessionStorage` under one key, falling back to memory if storage is blocked. "Reset demo" removes only that key.
- No cookies, fingerprinting, IP or personal identifiers. Nothing leaves the browser, and there is no shared visitor dashboard.

## CV requests

The CV is available on request: [email Ali](mailto:axraza55@gmail.com?subject=Fredrin%20GTM%20Engineer%20CV).
