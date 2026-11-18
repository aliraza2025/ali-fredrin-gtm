---
name: verify-app
description: Launch, health-check, drive and collect evidence for Ali's static Fredrin application page (index.html + capture.js + app.js).
---

# verify-app

Static site, no build. Port 8765 is used below; kill only what you start.

## Launch
1. `python3 -m http.server 8765 & echo $! > /tmp/verify-app.pid` from the repo root.
2. Ready means usable: `curl -sf http://127.0.0.1:8765/ | grep -q 'id="reset-demo"'` AND, in a fresh browser context (empty sessionStorage), `#event-log` shows exactly one `page_view`.

## Doctor (read-only)
- Files: `test -f index.html -a -f styles.css -a -f app.js -a -f capture.js -a -f README.md`
- Tests: `node --test`
- Links: every `https://` / `mailto:` URL in index.html must match the brief (see features/contact-cv.md).
- Forbidden content: `! grep -rniE 'phone|\.pdf|visa|sponsor|api[_-]?key|secret' index.html app.js capture.js README.md` and `! git ls-files | grep -i '\.pdf$'`
- No root-absolute asset paths: `! grep -nE '(src|href)="/[^/]' index.html`

## Drive
`PLAYWRIGHT_PATH=<dir with playwright> EVIDENCE_DIR=/tmp/evidence node tools/drive.js` (set `BASE` to override the URL). Playwright is not a project dependency: install it in a scratch dir (`npm i playwright && npx playwright install chromium`). If Chromium misses system libs and there is no root, `apt-get download` them, `dpkg -x` into a scratch dir and set `LD_LIBRARY_PATH`.

Selectors: `#cta-email`, `#cta-crediclip`, `#demo-link`, `#reset-demo`, `#event-log li`, `#count-email`, `#count-crediclip`, `#v-utm_source|utm_medium|utm_campaign|referrer_host`, skip link `.skip` -> `#main`.
URLs: `/` and `/?utm_source=hackernews&utm_medium=application&utm_campaign=fredrin`.

## Evidence
Record per step: the action, the resulting panel state (printed by drive.js), side effects (requests list shows only the 4 local files; sessionStorage keys; no cookies). Screenshots land in EVIDENCE_DIR (phone/desktop top and full page, focus state).

## Cleanup
`kill $(cat /tmp/verify-app.pid)`; remove only the pid file. Keep EVIDENCE_DIR.

## Feature map
- features/attribution-demo.md
- features/event-flow-plan.md
- features/selected-work.md
- features/contact-cv.md
