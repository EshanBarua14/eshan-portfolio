# Eshan Barua: portfolio

Personal site of **Eshan Barua**, founder of AIPG (Adbhik Innovation & Product Group) and software engineer.
Live: https://eshan-portfolio-five.vercel.app

Static site, no framework, no npm dependencies at runtime. English and Bangla.

## Layout
| Path | What |
|---|---|
| `src/index.template.html` | The page. English text lives here (single source). Every visible string has a `data-i18n` key. |
| `src/i18n/bn.json` | Bangla for every key. |
| `src/i18n/en.extra.json` | English strings that are not in the HTML (terminal answers, "Show fewer"). Also need Bangla. |
| `src/data/certs.json` | The 38 certifications (issuer, month, title, ID, verify link). |
| `src/shader/hero.glsl` | Hero background shader source (Shadertoy `mainImage` style). |
| `src/shader/hero.bundled.glsl` | Same shader with its library functions inlined. |
| `src/hero-shader.template.js` | WebGL2 host for the shader. |
| `scripts/build.py` | Builds `index.html`, `assets/js/i18n.js` and `assets/js/hero-shader.js`. Fails if any string is missing in either language. |
| `scripts/screenshots.js` | Review screenshots with Playwright. |
| `assets/` | CSS, JS, images. `index.html` and the two generated JS files are build output; commit them, do not edit them by hand. |
| `docs/screenshots/` | Screenshots from the latest redesign. |

## Edit
1. Change text in `src/index.template.html` (English) and the same key in `src/i18n/bn.json` (Bangla).
   A new element needs a new `data-i18n="key"` (plain text), `data-i18n-html="key"` (text with `<strong>`),
   or `data-i18n-attr="attr:key"` (alt, aria-label, placeholder, content).
2. `python3 scripts/build.py` (or `--check` to validate only).
3. Preview: `python3 -m http.server 8765`, open http://localhost:8765 (`?lang=bn` for Bangla).
4. Screenshots: `node scripts/screenshots.js docs/screenshots` while the server runs.

Rules for this site:
- Nothing ships in one language only. The build refuses to write if a key is missing.
- Facts only from the product repos and their verified status (see AIPG Brain `knowledge/REPOS.md`). No invented numbers.
- Most product repos are private, so cards show "Private repo · walkthrough on request" instead of a dead GitHub link.
- Certificate titles and paper titles stay in their original English (they are official names); everything around them is translated.
- The page shows no prices. If prices are ever added, convert at the current market exchange rate.

## Company logos
Experience entries and the "Where I have worked" strip use `assets/img/logos/<key>.svg|png|webp|jpg`
(keys: `bonusly`, `xpert`, `aipg`, `gp`, `zenith`). If a file is missing, the build shows a monogram tile instead.
`aipg.png` and `xpert.png` (from the Xpert Fintech site's own `brand/xpert-logo.png`) are in the repo. Add the others (square, transparent or white background, at least 96 px) and run `python3 scripts/build.py`.

## Hero shader
Built with the shader-art-coding skill's tested GLSL library (MIT, `github.com/gokayfem/shader-skills`):
`warpedFbm` flow field, `tonemapAgX`, `linearToSrgb`, `ditherTPDF`, plus a perspective grid.
To change it, edit `src/shader/hero.glsl`, then from the AIPG Brain repo:
```bash
cd .claude/skills/shader-art-coding
python3 scripts/glsl_tools.py bundle <portfolio>/src/shader/hero.glsl -o <portfolio>/src/shader/hero.bundled.glsl
python3 scripts/glsl_tools.py check <portfolio>/src/shader/hero.bundled.glsl
```
and rebuild. Guards in the host: renders at ≤0.75 device pixel and ≤1280 px wide, pauses off screen and in hidden tabs,
drops resolution then freezes on slow devices, draws one still frame under `prefers-reduced-motion`, and falls back to a
CSS gradient without WebGL2.

## Deploy
Vercel serves the repo root as static files. No build step on Vercel: run `scripts/build.py` locally and commit the output.
