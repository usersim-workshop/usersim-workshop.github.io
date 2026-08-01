# UserSim @ NeurIPS 2026 — workshop website

Source for <https://usersim-workshop.org> (also served at
<https://usersim-workshop.github.io>).

Plain static HTML and CSS. There is no build step: whatever is committed to
`main` is what gets served, usually within a minute or two.

## Editing

Everything you are likely to change lives in [`index.html`](index.html), which is
divided into clearly commented sections — hero, key dates, about, pillars,
artifacts, call for papers, FAQ, speakers, program, organizers, contact.

To make a small change without cloning anything, open `index.html` on GitHub,
press `.` (or use the pencil icon), edit, and commit to `main`.

To work locally:

```bash
git clone https://github.com/usersim-workshop/usersim-workshop.github.io.git
cd usersim-workshop.github.io
python3 -m http.server 8000   # then open http://localhost:8000
```

## Before publicising the site

Two things are deliberately unfinished while the draft is under review:

1. **Remove the `noindex` tag.** In `index.html`, delete the
   `<meta name="robots" content="noindex, nofollow">` line. Until then, search
   engines will not index the site.
2. **Enable the OpenReview link.** The submit button in the call for papers is
   an inert `<span>` reading "opening shortly". Swap it for a real `<a>` once the
   submission site exists, and update the "Submission site" row in the spec list.

Also worth doing as soon as people reply: **swap the monogram avatars for real
headshots.** Each organizer currently has a `<span class="avatar">` with their
initials. Replace it with `<img class="avatar" src="assets/people/xx.jpg" alt="">`
— the sizing, shape and cropping are already handled in CSS. Ask each organizer
for a photo rather than taking one from their institutional page or LinkedIn,
which is both a copyright and a consent question.

## Social card

`assets/og-image.png` (1200x630) is generated from `og-image.svg`, which lives
with the other generation scripts in the workshop scratch repo under
`.geobuild/` rather than here, since it is 700KB of source the site never
serves. To regenerate:

```bash
npx --yes @resvg/resvg-js-cli \
  --font-serif-family "Georgia" --font-sans-serif-family "Helvetica" \
  .geobuild/og-image.svg assets/og-image.png
```

Keep the SVG pure ASCII and use numeric entities such as `&#8211;` for dashes.
Stray UTF-8 in the source will make the renderer fail.

## Graphics

Three canvas pieces live in [`graphics.js`](graphics.js): the hero globe, a
turn-by-turn divergence figure in the problem section, and a population
sampling figure in the pillars section. All three honour
`prefers-reduced-motion` by settling on a representative static frame.

The globe is drawn from [`geo-data.js`](geo-data.js), an equal-area cloud of
13,215 land points sampled from Natural Earth (public domain) and projected
orthographically at runtime. As Africa rotates through the center, the land
dots that fall inside the letterforms turn orange and spell USER SIM. The
lettering uses a 5x7 bitmap face rather than a real font, because at this dot
spacing a rasterised font's strokes catch roughly one dot each and read as
speckle rather than letters.

If you need to regenerate or re-densify the point cloud, the scripts are in the
workshop scratch repo under `.geobuild/`.

## Design conventions

The palette is semantic rather than decorative:

- `--human` (warm) always means real people or real behavior
- `--sim` (cool) always means simulated

Every graphic uses that pairing, including the hero motif and the pillar marks.
Please keep it consistent when adding diagrams.

Type currently uses a system font stack so the site makes zero third-party
requests, which also keeps it clean under EU privacy rules. If self-hosted
`woff2` faces are added later, only `--font-display` and `--font-body` in
[`styles.css`](styles.css) need to change.

The brand mark in `assets/mark.svg` and `assets/favicon.svg` is generated from
the same Natural Earth points as the hero: Africa and Europe, sampled and drawn
at a radius where the dots merge into solid continents. Points within about 0.16 of the limb are culled, otherwise they bead into a
ring that fights the outline. Note that the threshold is measured from the
centre of the disc, so it bites at the top and bottom as well as the sides:
too high a value silently deletes the polar regions.

The mark is drawn with the camera raised 18 degrees north, which keeps the host
dot clear of the rim and brings Greenland and the British Isles into view. The
hero globe is deliberately untilted; this applies only to the mark.

The warm dot marks the host city. It is Paris for this edition; to move it for a
future one, change `HOST` at the top of `.geobuild/mark-files.mjs` and
regenerate. The script throws if the city would fall on the far side of the
globe at the current camera longitude.

`.nojekyll` stops GitHub Pages from running the files through Jekyll.
