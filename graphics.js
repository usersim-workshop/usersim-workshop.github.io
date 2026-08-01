/* ==========================================================================
   UserSim @ NeurIPS 2026 — canvas graphics

   Three pieces:
     [data-globe]  the hero. A rotating Earth drawn from Natural Earth land
                   samples; populations ignite and, as Africa comes round, the
                   land dots themselves spell USER SIM.
     [data-bloom]  a real and a simulated conversation diverging over turns.
     [data-swarm]  a population field against the slice a simulator covers.

   Palette is semantic: warm is real, cool is simulated. Keep it that way.
   Everything honours prefers-reduced-motion by settling on a static frame.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var RAD = Math.PI / 180, TAU = Math.PI * 2;
  var SANS = getComputedStyle(document.body).fontFamily;
  var HUMAN = '#e2673c', SIM = '#2e9bb8';

  /* --- responsive sizing: canvases fill their column and keep an aspect --- */
  function fit(cv) {
    var aspect = parseFloat(cv.dataset.aspect) || 1.5;
    var parent = cv.parentElement;
    var w = Math.max(200, Math.round(parent.clientWidth));
    var h = Math.round(w / aspect);
    cv.width = w * DPR; cv.height = h * DPR;
    cv.style.width = '100%'; cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }
  function responsive(cv, onResize) {
    var s = fit(cv);
    var timer;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var next = fit(cv);
        s.ctx = next.ctx; s.w = next.w; s.h = next.h;
        if (onResize) onResize(s);
      }, 150);
    });
    return s;
  }

  /* ======================================================= hero globe === */
  var globeEl = document.querySelector('[data-globe]');
  if (globeEl && window.GEO && window.GEO.SPHERE) {
    var PTS = window.GEO.SPHERE;

    /* Orthographic projection, camera at longitude lam0, north up, no tilt.
       Axes: X toward (0E,0N), Y toward (90E,0N), Z toward the north pole.
       Screen x is the eastward component, screen y the northward one, and the
       third term is depth toward the viewer. */
    function unit(lonDeg, latDeg) {
      var l = lonDeg * RAD, p = latDeg * RAD, cp = Math.cos(p);
      return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
    }
    function view(v, lam0) {
      var s = Math.sin(lam0), c = Math.cos(lam0);
      return [-s * v[0] + c * v[1], v[2], c * v[0] + s * v[1]];
    }

    // Antarctica contributes many samples and no users.
    var INHABITED = PTS.filter(function (p) { return p[1] > -55; });

    /* --- Africa, for the lettering --- */
    var AFRICA_POLY = [
      [-17.5, 14.7], [-16.5, 21.5], [-13, 27.7], [-9.8, 30.5], [-6, 35.9],
      [0.5, 36.6], [10, 37.3], [16, 31.5], [20, 32.8], [25, 31.6], [32.5, 31.3],
      [33.5, 28], [35, 23], [37, 18], [39.5, 15], [43, 12.3], [51.5, 11.5],
      [48, 2], [41, -2], [40.5, -10], [35, -20], [33, -26], [28, -33],
      [20, -34.9], [14, -22], [12, -15], [9, -2], [5, 4], [-5, 5], [-13, 8]
    ];
    function inPoly(x, y, poly) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    var AFRICA_IDX = [];
    for (var ai = 0; ai < PTS.length; ai++) {
      if (inPoly(PTS[ai][0], PTS[ai][1], AFRICA_POLY)) AFRICA_IDX.push(ai);
    }

    /* A 5x7 bitmap face. A rasterised system font gives strokes a few pixels
       wide, which at this dot spacing catches barely one dot each and reads as
       speckle. Cells let stroke weight be controlled instead. */
    var FONT = {
      U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
      S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
      E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
      R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
      I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
      M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001']
    };
    function wordCells(word) {
      var on = {}, col = 0;
      for (var i = 0; i < word.length; i++) {
        var g = FONT[word[i]];
        for (var r = 0; r < 7; r++) {
          for (var c = 0; c < 5; c++) if (g[r][c] === '1') on[(col + c) + ',' + r] = 1;
        }
        col += 6;
      }
      return { on: on, cols: col - 1 };
    }
    var LINES = [
      { w: wordCells('USER'), top: 0.16, bot: 0.36 },
      { w: wordCells('SIM'), top: 0.41, bot: 0.61 }
    ];

    var lit = new Uint8Array(PTS.length);
    var litList = [];
    var sxArr = new Float32Array(PTS.length), syArr = new Float32Array(PTS.length);
    var revealNoise = new Float32Array(PTS.length);
    for (var rn = 0; rn < revealNoise.length; rn++) revealNoise[rn] = Math.random();

    var g = responsive(globeEl);
    var events = [], t0 = performance.now(), nextAt = 900;
    var RATE = 0.18;                    // rad/s, a full turn about every 35s
    var skew = 300 * RAD;               // open over South America

    function geom() {
      return {
        R: Math.min(g.w, g.h) * 0.47,
        cx: g.w / 2,
        cy: g.h / 2
      };
    }

    /* Marks the African dots inside a letter cell. Each word is fitted to the
       run of land common to all seven of its glyph rows, which is what stops a
       letter overrunning the coast when a peninsula widens a single row. Both
       words share one cell size so neither outweighs the other. */
    function layoutWord(lam0, G) {
      lit.fill(0); litList.length = 0;
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, n = 0, i, k;
      for (i = 0; i < AFRICA_IDX.length; i++) {
        k = AFRICA_IDX[i];
        var v = view(unit(PTS[k][0], PTS[k][1]), lam0);
        if (v[2] <= 0) { sxArr[k] = NaN; continue; }
        var px = G.cx + G.R * v[0], py = G.cy - G.R * v[1];
        sxArr[k] = px; syArr[k] = py; n++;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      if (n < 200) return;
      var bh = maxY - minY, fits = [];

      for (var L = 0; L < LINES.length; L++) {
        var ln = LINES[L];
        var yLo = minY + bh * ln.top, yHi = minY + bh * ln.bot;
        var rowH = (yHi - yLo) / 7, rows = [];
        for (var r0 = 0; r0 < 7; r0++) rows.push([]);
        for (i = 0; i < AFRICA_IDX.length; i++) {
          k = AFRICA_IDX[i];
          if (isNaN(sxArr[k])) continue;
          var rIdx = Math.floor((syArr[k] - yLo) / rowH);
          if (rIdx >= 0 && rIdx < 7) rows[rIdx].push(sxArr[k]);
        }
        var lo = -Infinity, hi = Infinity, ok = true;
        for (var r1 = 0; r1 < 7; r1++) {
          if (rows[r1].length < 8) { ok = false; break; }
          rows[r1].sort(function (a, b) { return a - b; });
          lo = Math.max(lo, rows[r1][Math.floor(rows[r1].length * 0.03)]);
          hi = Math.min(hi, rows[r1][Math.floor(rows[r1].length * 0.97)]);
        }
        if (!ok || hi - lo < 24) continue;
        var inset = (hi - lo) * 0.04;
        lo += inset; hi -= inset;
        fits.push({
          w: ln.w, lo: lo, hi: hi, yLo: yLo, yHi: yHi,
          cell: Math.min((hi - lo) / ln.w.cols, (yHi - yLo) / 7)
        });
      }
      if (!fits.length) return;
      var cell = Infinity;
      for (var f0 = 0; f0 < fits.length; f0++) cell = Math.min(cell, fits[f0].cell);
      if (cell < 1.8) return;

      for (var f1 = 0; f1 < fits.length; f1++) {
        var F = fits[f1], cols = F.w.cols;
        var ox = F.lo + (F.hi - F.lo - cell * cols) / 2;
        var oy = F.yLo + (F.yHi - F.yLo - cell * 7) / 2;
        for (i = 0; i < AFRICA_IDX.length; i++) {
          var idx = AFRICA_IDX[i];
          if (isNaN(sxArr[idx])) continue;
          var cc = Math.floor((sxArr[idx] - ox) / cell);
          var rr = Math.floor((syArr[idx] - oy) / cell);
          if (cc >= 0 && cc < cols && rr >= 0 && rr < 7 && F.w.on[cc + ',' + rr]) {
            lit[idx] = 1; litList.push(idx);
          }
        }
      }
    }

    function globeFrame(now) {
      var G = geom(), ctx = g.ctx, R = G.R, cx = G.cx, cy = G.cy;
      var t = (now - t0) / 1000;
      var lam0 = REDUCED ? 18 * RAD : t * RATE + skew;
      var deg = ((lam0 / RAD) % 360 + 360) % 360;
      var dot = Math.max(1, R / 78);

      // "approach" opens before "wordAmt" so ignitions concentrate on the
      // letters first and the word assembles out of activity in progress.
      var approach = 0, wordAmt = 0;
      var d = Math.abs(deg - 18); if (d > 180) d = 360 - d;
      approach = d < 34 ? Math.min(1, (34 - d) / 14) : 0;
      wordAmt = d < 24 ? Math.min(1, (24 - d) / 10) : 0;
      if (REDUCED) { approach = 1; wordAmt = 1; }
      if (approach > 0) layoutWord(lam0, G); else { lit.fill(0); litList.length = 0; }

      ctx.clearRect(0, 0, g.w, g.h);

      var grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
      grad.addColorStop(0, 'rgba(46,155,184,0.13)');
      grad.addColorStop(1, 'rgba(46,155,184,0.03)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(46,155,184,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();

      for (var i = 0; i < PTS.length; i++) {
        var v = view(unit(PTS[i][0], PTS[i][1]), lam0);
        if (v[2] <= 0) continue;
        var px = cx + R * v[0], py = cy - R * v[1];
        var shown = 0;
        if (wordAmt > 0 && lit[i]) {
          var thr = 0.08 + 0.7 * revealNoise[i];
          if (wordAmt > thr) shown = Math.min(1, (wordAmt - thr) / 0.22);
        }
        if (shown > 0) {
          var sz = dot * (1 + 0.9 * shown);
          ctx.fillStyle = 'rgba(226,103,60,' + (0.3 + 0.65 * shown * v[2]).toFixed(3) + ')';
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        } else {
          ctx.fillStyle = 'rgba(150,168,196,' + (0.3 + 0.62 * v[2]).toFixed(3) + ')';
          ctx.fillRect(px - dot / 2, py - dot / 2, dot, dot);
        }
      }

      if (!REDUCED && now - t0 > nextAt) {
        // interspersed rather than metronomic, so ripples cluster and thin out
        nextAt += 260 * (0.35 + Math.random() * 1.6);
        var p;
        if (approach > 0 && litList.length && Math.random() < approach * 0.9) {
          p = PTS[litList[(Math.random() * litList.length) | 0]];
        } else {
          p = INHABITED[(Math.random() * INHABITED.length) | 0];
        }
        events.push({ lon: p[0], lat: p[1], born: now });
      }
      events = events.filter(function (e) { return now - e.born < 4200; });

      events.forEach(function (e) {
        var age = (now - e.born) / 1000;
        var v = view(unit(e.lon, e.lat), lam0);
        if (v[2] <= 0) return;
        var x = cx + R * v[0], y = cy - R * v[1], facing = v[2], fade = 1 - wordAmt;
        var ig = Math.max(0, 1 - age / 1.1);
        if (ig > 0) {
          ctx.fillStyle = 'rgba(226,103,60,' + (ig * facing * 0.85 * fade).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, dot * 2.2 + ig * 2.4, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(226,103,60,' + (0.8 * facing * fade).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, dot * 1.35, 0, TAU); ctx.fill();
        for (var k = 0; k < 2; k++) {
          var ra = age - 0.3 - k * 0.5;
          if (ra <= 0 || ra > 1.7) continue;
          var pr = ra / 1.7;
          ctx.strokeStyle = 'rgba(46,155,184,' + ((1 - pr) * 0.6 * facing * fade).toFixed(3) + ')';
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(x, y, dot * 2 + pr * R * 0.36, 0, TAU); ctx.stroke();
        }
      });

      requestAnimationFrame(globeFrame);
    }
    requestAnimationFrame(globeFrame);
  }

  /* ======================================================== turn bloom === */
  var bloomEl = document.querySelector('[data-bloom]');
  if (bloomEl) {
    var b = responsive(bloomEl);
    var bt0 = performance.now();
    (function bloom(now) {
      var ctx = b.ctx, w = b.w, h = b.h;
      var t = REDUCED ? 6 : ((now - bt0) / 1000) % 10;
      var cx = 74, cy = h / 2, step = (w - 150) / 6;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '600 10px ' + SANS;
      ctx.fillStyle = 'rgba(92,100,116,0.95)';
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill();
      ctx.fillText('SAME OPENING TURN', cx - 24, cy + 30);
      var turns = Math.min(6, Math.floor(t / 0.8));
      for (var k = 1; k <= turns; k++) {
        var x = cx + k * step, px = cx + (k - 1) * step;
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = 'rgba(226,103,60,0.8)';
        ctx.beginPath(); ctx.moveTo(px, cy - (k - 1) * 4); ctx.lineTo(x, cy - k * 4); ctx.stroke();
        ctx.strokeStyle = 'rgba(46,155,184,0.8)';
        ctx.beginPath(); ctx.moveTo(px, cy + (k - 1) * 11); ctx.lineTo(x, cy + k * 11); ctx.stroke();
        ctx.fillStyle = HUMAN; ctx.beginPath(); ctx.arc(x, cy - k * 4, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = SIM; ctx.beginPath(); ctx.arc(x, cy + k * 11, 4.5, 0, TAU); ctx.fill();
      }
      if (turns >= 1) {
        var lx = cx + turns * step + 12;
        ctx.fillStyle = HUMAN; ctx.fillText('REAL', lx, cy - turns * 4 + 4);
        ctx.fillStyle = SIM; ctx.fillText('SIMULATED', lx, cy + turns * 11 + 4);
      }
      requestAnimationFrame(bloom);
    })(performance.now());
  }

  /* ===================================================== sampling swarm === */
  var swarmEl = document.querySelector('[data-swarm]');
  if (swarmEl) {
    var s = responsive(swarmEl);
    var N = 520, pop = [];
    for (var pi = 0; pi < N; pi++) {
      pop.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 1.8, sel: 0 });
    }
    var st0 = performance.now(), sNext = 0;
    (function swarm(now) {
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);
      if (!REDUCED && now - st0 > sNext) {
        sNext += 2800;
        pop.forEach(function (p) { p.sel = 0; });
        for (var k = 0; k < 26; k++) pop[(Math.random() * N) | 0].sel = now;
      } else if (REDUCED && !sNext) {
        sNext = 1;
        for (var k2 = 0; k2 < 26; k2++) pop[(Math.random() * N) | 0].sel = now;
      }
      pop.forEach(function (p) {
        var x = 26 + p.x * (w - 52), y = 20 + p.y * (h - 56);
        if (p.sel) {
          var a = REDUCED ? 1 : Math.max(0, 1 - (now - p.sel) / 2400);
          ctx.fillStyle = 'rgba(46,155,184,' + (0.4 + a * 0.55).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, p.r + 1.6 + a * 2, 0, TAU); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(226,103,60,0.32)';
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
        }
      });
      ctx.font = '600 11px ' + SANS;
      ctx.fillStyle = HUMAN; ctx.fillText('THE REAL POPULATION', 26, h - 12);
      ctx.fillStyle = SIM; ctx.fillText('WHAT THE SIMULATOR COVERS', 200, h - 12);
      requestAnimationFrame(swarm);
    })(performance.now());
  }

  /* ========================================================== reveals === */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ============================================================== nav === */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
