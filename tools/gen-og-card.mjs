import { readFileSync, writeFileSync } from "node:fs";
global.window={}; new Function(readFileSync("../geo-data.js","utf8")).call(global);
const G=global.window.GEO, RAD=Math.PI/180;
const unit=(lo,la)=>{const l=lo*RAD,p=la*RAD,cp=Math.cos(p);return[cp*Math.cos(l),cp*Math.sin(l),Math.sin(p)];};
const view=(v,L)=>{const s=Math.sin(L),c=Math.cos(L);return[-s*v[0]+c*v[1],v[2],c*v[0]+s*v[1]];};
const W=1200,H=630, cx=910, cy=315, R=250, L=18*RAD;   // Africa facing
let dots="";
const d=Math.max(1.05,R/78);
for(const [lo,la] of G.SPHERE){const v=view(unit(lo,la),L); if(v[2]<=0) continue;
  dots+=`<rect x="${(cx+R*v[0]-d/2).toFixed(1)}" y="${(cy-R*v[1]-d/2).toFixed(1)}" width="${d.toFixed(1)}" height="${d.toFixed(1)}" fill="#96a8c4" fill-opacity="${(0.3+0.62*v[2]).toFixed(2)}"/>`;}
// a few live populations with ripples
let marks="";
const picks=[[ -3.0,8.0],[37.9,0.2],[2.2,46.2],[30.8,26.8],[18,-22]];
picks.forEach((p,i)=>{const v=view(unit(p[0],p[1]),L); if(v[2]<=0) return;
  const x=cx+R*v[0], y=cy-R*v[1], ph=(i%3)/3;
  marks+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#e2673c"/>`;
  marks+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(8+ph*R*0.34).toFixed(1)}" fill="none" stroke="#2e9bb8" stroke-opacity="${(0.65*(1-ph)).toFixed(2)}" stroke-width="1.8"/>`;});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="body" cx="0.36" cy="0.32" r="0.75">
<stop offset="0%" stop-color="#2e9bb8" stop-opacity="0.16"/><stop offset="100%" stop-color="#2e9bb8" stop-opacity="0.03"/>
</radialGradient></defs>
<rect width="${W}" height="${H}" fill="#0b0f1a"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#body)"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#2e9bb8" stroke-opacity="0.3"/>
${dots}${marks}
<text x="80" y="150" fill="#7fcbdc" font-size="23" font-weight="600" letter-spacing="3.2" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">NEURIPS 2026 &#183; PARIS &#183; 12&#8211;13 DECEMBER</text>
<text x="80" y="252" fill="#ffffff" font-size="74" font-weight="600" font-family="Georgia, serif">UserSim</text>
<text x="80" y="336" fill="#ffffff" font-size="74" font-weight="600" font-family="Georgia, serif">@ NeurIPS 2026</text>
<rect x="80" y="392" width="3" height="110" fill="#e2673c"/>
<text x="106" y="428" fill="#eef0f4" font-size="26" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">Simulated users now drive AI evaluation and</text>
<text x="106" y="466" fill="#eef0f4" font-size="26" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">training, but can we trust them?</text>
<text x="106" y="504" fill="#a2abbd" font-size="22" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">Diverse, faithful, and trustworthy user simulation.</text>
</svg>
`;
writeFileSync("../assets/og-image.svg",svg);
