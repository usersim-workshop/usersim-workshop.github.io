import { readFileSync, writeFileSync } from "node:fs";

global.window = {};
new Function(readFileSync("../geo-data.js", "utf8")).call(global);
const G = global.window.GEO, RAD = Math.PI / 180;

/* ---------------------------------------------------------------------------
   The warm dot marks where the workshop is being held. Change HOST for a future
   edition and regenerate; everything else follows.
   --------------------------------------------------------------------------- */
const HOST = { name: "Paris", lon: 2.3522, lat: 48.8566 };
const VIEW_LON = 10;   // camera longitude: the Atlantic face, Europe and Africa
const VIEW_TILT = 18;  // camera raised north, so Paris sits clear of the rim
                       // and Greenland and the British Isles come into view.
                       // The hero globe stays untilted; this applies only here.

const unit = (lo, la) => {
  const l = lo * RAD, p = la * RAD, cp = Math.cos(p);
  return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
};
const view = (v, L, T) => {
  const s = Math.sin(L * RAD), c = Math.cos(L * RAD);
  const x = -s * v[0] + c * v[1];        // eastward component
  const yN = v[2];                       // northward component
  const d = c * v[0] + s * v[1];         // depth toward the viewer
  const st = Math.sin(T * RAD), ct = Math.cos(T * RAD);
  return [x, ct * yN - st * d, st * yN + ct * d];
};

function build({ cx, cy, R, step, w, dotR, bg }) {
  // A single path of zero-length segments with a round linecap draws every dot
  // at a fraction of the bytes individual <circle> elements would cost, which
  // is what makes this dot count affordable.
  let d = "", n = 0;
  for (let i = 0; i < G.SPHERE.length; i += step) {
    const v = view(unit(G.SPHERE[i][0], G.SPHERE[i][1]), VIEW_LON, VIEW_TILT);
    // Cull only the very edge of the limb, where points bead into a ring that
    // fights the outline circle. This threshold is measured from the centre of
    // the disc, so it bites at the top and bottom as well as the sides: at 0.28
    // it was deleting everything above 73N and below 73S, which clipped
    // northern Europe and removed Antarctica entirely, leaving dead space under
    // Africa. 0.16 keeps land to about 80 degrees either side.
    if (v[2] <= 0.16) continue;
    d += `M${(cx + R * v[0]).toFixed(1)} ${(cy - R * v[1]).toFixed(1)}h.01`;
    n++;
  }

  const h = view(unit(HOST.lon, HOST.lat), VIEW_LON, VIEW_TILT);
  if (h[2] <= 0) throw new Error(`${HOST.name} is on the far side at VIEW_LON=${VIEW_LON}`);
  const hx = +(cx + R * h[0]).toFixed(1), hy = +(cy - R * h[1]).toFixed(1);

  return {
    n, hx, hy,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="UserSim">
${bg ? `  <rect width="100" height="100" rx="22" fill="#0b0f1a"/>\n` : ""}  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#2e9bb8" stroke-width="${bg ? 3.4 : 4}" opacity=".55"/>
  <path d="${d}" fill="none" stroke="#8fa4c0" stroke-width="${w}" stroke-linecap="round"/>
  <!-- ${HOST.name}: the host city -->
  <circle cx="${hx}" cy="${hy}" r="${dotR}" fill="#e2673c"/>
</svg>
`,
  };
}

const mark = build({ cx: 50, cy: 50, R: 46, step: 5, w: 2.5, dotR: 6, bg: false });
const favicon = build({ cx: 50, cy: 50, R: 37, step: 5, w: 2.1, dotR: 5, bg: true });
writeFileSync("../assets/mark.svg", mark.svg);
writeFileSync("../assets/favicon.svg", favicon.svg);
console.error(`${HOST.name} at mark (${mark.hx}, ${mark.hy}) / favicon (${favicon.hx}, ${favicon.hy}); ${mark.n} land points`);
