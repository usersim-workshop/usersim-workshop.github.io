# UserSim @ NeurIPS 2026

Website for **Grounded User Simulation for Model Evaluation and Training:
Diversity, Fidelity, and Validity**, a workshop at NeurIPS 2026 in Paris,
on December 12 or 13, 2026 (exact day to be confirmed).

Live at <https://usersim-workshop.github.io>.

## Running it locally

Plain static HTML, CSS and vanilla JavaScript. No build step, no dependencies,
no framework. Whatever is on `main` is what gets served.

```bash
git clone https://github.com/usersim-workshop/usersim-workshop.github.io.git
cd usersim-workshop.github.io
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Layout

```
index.html      the entire page, in commented sections
styles.css      design tokens at the top, then components in page order
graphics.js     three canvas figures
geo-data.js     land geometry for the globe (generated)
assets/         mark, favicon and social card
tools/          scripts that regenerate the generated assets
```

To change copy, edit [`index.html`](index.html). Its sections are commented and
appear in the order they render: hero, key dates, mission, why now, who it's
for, pillars, debate, artifacts, call for papers, responsible use, FAQ,
speakers, program, organizers, contact.
Small edits can be made from GitHub's web editor without cloning.

## Graphics

Three canvas figures live in [`graphics.js`](graphics.js): the hero globe, a
turn-by-turn divergence figure in the problem section, and a population sampling
figure in the pillars section. All three honor `prefers-reduced-motion` by
settling on a representative static frame.

The globe is drawn from [`geo-data.js`](geo-data.js), an equal-area cloud of
13,215 land points sampled from [Natural Earth](https://www.naturalearthdata.com/)
and projected orthographically at runtime. As Africa rotates through the center,
the land dots falling inside the letterforms turn orange and spell USER SIM. The
lettering uses a 5x7 bitmap face rather than a real font: at this dot spacing a
rasterized font's strokes catch roughly one dot each and read as speckle.

## Design conventions

**The palette is semantic, not decorative.** `--human` (warm) always means real
people or real behavior; `--sim` (cool) always means simulated. Every graphic
uses that pairing, including the hero motif and the pillar marks. Please keep it
consistent when adding diagrams.

**Type uses a system font stack**, so the site makes no third-party requests.
If self-hosted `woff2` faces are added, only `--font-display` and `--font-body`
in [`styles.css`](styles.css) need to change.

**Do not put `.prose` on the same element as `.wrap`.** They have equal
specificity, so the later declaration silently overrides the container width.

## Regenerating assets

The scripts in [`tools/`](tools) reproduce everything under `assets/` and
`geo-data.js`. They need Node and a one-off install:

```bash
cd tools
npm install world-atlas@2 topojson-client@3 d3-geo@3
```

**Land geometry** (slow; only needed if you change the sampling density):

```bash
node gen-geo-base.mjs > ../geo-data.js   # base pass
node gen-geo-densify.mjs                 # ~2 min, raises the point count
node gen-geo-outline.mjs                 # swaps in a lighter coastline outline
```

**Brand mark and favicon:**

```bash
node gen-mark.mjs
```

The warm dot marks the host city. To move it for a future edition, change `HOST`
at the top of `gen-mark.mjs` and rerun; the script fails loudly if the city would
fall on the far side of the globe at the current camera longitude, in which case
`VIEW_LON` needs adjusting too.

Two things about the mark that are easy to get wrong. Points within about 0.16
of the limb are culled, because otherwise they bead into a ring that fights the
outline circle, but that threshold is measured from the center of the disc, so
it bites at the top and bottom as well as the sides, and too high a value
silently deletes the polar regions. And the mark is drawn with the camera raised
18 degrees north, which keeps the host dot clear of the rim and brings Greenland
and the British Isles into view; the hero globe is deliberately untilted.

**Social card** (1200×630, generated in two steps):

```bash
node gen-og-card.mjs
npx --yes @resvg/resvg-js-cli \
  --font-serif-family "Georgia" --font-sans-serif-family "Helvetica" \
  ../assets/og-image.svg ../assets/og-image.png
```

Keep that SVG pure ASCII and use numeric entities such as `&#8211;` for dashes;
stray UTF-8 makes the renderer fail.

## Credits and licensing

Coastline geometry is from [Natural Earth](https://www.naturalearthdata.com/),
which is in the public domain.

Site content is © the workshop organizers. The code is available for reuse; if
you are building a workshop site and find any of it useful, please help yourself.

`.nojekyll` stops GitHub Pages from running these files through Jekyll.
