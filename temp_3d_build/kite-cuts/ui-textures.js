// Canvas-drawn screen content for the Kite-match render.
// Content is deliberately decoupled from motion: swapping these does not touch the cuts.
import * as THREE from "three";

export function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 16;
  t.needsUpdate = true;
  return t;
}

function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function rr(x, w, y, h, r) {
  // rounded rect path on ctx `x` (ctx passed first for brevity at call sites)
  return null;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------------------------------------------------------------- wallpaper
// macOS Ventura-style warm ribbon wallpaper (the ORANGE in the reference is
// on-screen wallpaper, never a room colour — see checklist M1).
export function makeVentura(w = 2560, h = 1600) {
  const [c, g] = cv(w, h);
  // Base: bright amber through the middle-right, deep plum in the lower-left —
  // the reference wallpaper is much brighter and smoother than a stripe stack.
  const bg = g.createLinearGradient(w * 0.1, h, w * 0.9, 0);
  bg.addColorStop(0.00, "#2a0a2b");
  bg.addColorStop(0.22, "#6d1430");
  bg.addColorStop(0.48, "#c2371f");
  bg.addColorStop(0.70, "#f2701c");
  bg.addColorStop(0.88, "#f7a52b");
  bg.addColorStop(1.00, "#b8331f");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);

  // three WIDE smooth ribbons sweeping lower-left -> upper-right
  const ribbons = [
    { a: "#ffb347", b: "#ef5f22", o: 0.55, y: 0.16, amp: 0.30, th: 0.34 },
    { a: "#f8842a", b: "#8f1b2e", o: 0.50, y: 0.52, amp: 0.26, th: 0.40 },
    { a: "#7c1533", b: "#33093a", o: 0.72, y: 0.86, amp: 0.22, th: 0.46 },
  ];
  for (const r of ribbons) {
    const grd = g.createLinearGradient(0, h, w, 0);
    grd.addColorStop(0, r.a); grd.addColorStop(1, r.b);
    g.globalAlpha = r.o; g.fillStyle = grd;
    g.beginPath();
    g.moveTo(-0.08 * w, (r.y + r.amp) * h);
    g.bezierCurveTo(0.34 * w, (r.y - r.amp * 0.5) * h, 0.62 * w, (r.y + r.amp * 0.35) * h, 1.08 * w, (r.y - r.amp) * h);
    g.lineTo(1.08 * w, (r.y - r.amp + r.th) * h);
    g.bezierCurveTo(0.62 * w, (r.y + r.amp * 0.35 + r.th) * h, 0.34 * w, (r.y - r.amp * 0.5 + r.th) * h, -0.08 * w, (r.y + r.amp + r.th) * h);
    g.closePath(); g.fill();
  }
  g.globalAlpha = 1;

  // broad warm bloom so the centre-right reads bright amber, not muddy red
  const bloom = g.createRadialGradient(w * 0.66, h * 0.40, 0, w * 0.66, h * 0.40, w * 0.62);
  bloom.addColorStop(0, "rgba(255,190,90,0.42)");
  bloom.addColorStop(0.55, "rgba(255,150,60,0.16)");
  bloom.addColorStop(1, "rgba(255,150,60,0)");
  g.fillStyle = bloom; g.fillRect(0, 0, w, h);

  // deepen the lower-left corner (the reference's dark plum anchor)
  const dark = g.createRadialGradient(0, h, 0, 0, h, w * 0.62);
  dark.addColorStop(0, "rgba(30,6,38,0.80)");
  dark.addColorStop(1, "rgba(30,6,38,0)");
  g.fillStyle = dark; g.fillRect(0, 0, w, h);
  return c;
}

function menubar(g, w, label = "Weather") {
  g.fillStyle = "rgba(18,14,20,0.42)"; g.fillRect(0, 0, w, 34);
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "600 20px -apple-system,system-ui,sans-serif";
  g.fillText("", 22, 24);
  g.font = "600 19px -apple-system,system-ui,sans-serif";
  g.fillText(label, 46, 23);
  g.font = "400 18px -apple-system,system-ui,sans-serif";
  ["File", "Edit", "View", "Window", "Help"].forEach((s, i) => {
    g.fillStyle = "rgba(255,255,255,0.80)";
    g.fillText(s, 130 + i * 74, 23);
  });
  g.textAlign = "right";
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.fillText("Mon 3:21 PM", w - 24, 23);
  g.textAlign = "left";
}

// ------------------------------------------------------- weather app window
// Drawn as a standalone surface so it can be composited onto a desktop or used
// full-bleed as a floating panel.
function drawWeather(g, x, y, w, h, opt = {}) {
  const r = opt.radius ?? 18;
  g.save();
  roundRect(g, x, y, w, h, r); g.clip();

  // lighter / more frosted than a saturated blue — matches the reference window
  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, "#a9cbec");
  sky.addColorStop(0.45, "#7ea9d8");
  sky.addColorStop(1, "#5a83b9");
  g.fillStyle = sky; g.fillRect(x, y, w, h);

  // cloud band across the top
  for (let i = 0; i < 7; i++) {
    const cxx = x + w * (0.05 + i * 0.16), cyy = y + h * (0.06 + (i % 3) * 0.03);
    const rad = w * (0.06 + (i % 4) * 0.02);
    const cg = g.createRadialGradient(cxx, cyy, 0, cxx, cyy, rad);
    cg.addColorStop(0, "rgba(255,255,255,0.55)");
    cg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(cxx, cyy, rad, 0, 7); g.fill();
  }

  const s = w / 1000; // layout scale
  g.textAlign = "center";
  g.fillStyle = "#fff";
  g.font = `300 ${34 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Mission Dolores", x + w / 2, y + 62 * s);
  g.font = `100 ${104 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText(`${opt.temp ?? 57}°`, x + w / 2, y + 168 * s);
  g.font = `400 ${26 * s}px -apple-system,system-ui,sans-serif`;
  g.fillStyle = "rgba(255,255,255,0.88)";
  g.fillText("Partly Cloudy", x + w / 2, y + 206 * s);
  g.font = `400 ${22 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("H:64°  L:48°", x + w / 2, y + 238 * s);
  g.textAlign = "left";

  // hourly strip
  const hy = y + 268 * s, hh = 118 * s;
  g.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(g, x + 26 * s, hy, w - 52 * s, hh, 16 * s); g.fill();
  const hrs = ["Now", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM", "12AM", "1AM"];
  hrs.forEach((hlab, i) => {
    const cxx = x + 26 * s + (w - 52 * s) * ((i + 0.5) / hrs.length);
    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = `500 ${18 * s}px -apple-system,system-ui,sans-serif`;
    g.fillText(hlab, cxx, hy + 30 * s);
    g.font = `400 ${17 * s}px -apple-system,system-ui,sans-serif`;
    g.fillText("☁", cxx, hy + 62 * s);
    g.fillStyle = "#fff";
    g.font = `400 ${24 * s}px -apple-system,system-ui,sans-serif`;
    g.fillText(`${57 - Math.floor(i / 2)}°`, cxx, hy + 98 * s);
    g.textAlign = "left";
  });

  // 10-day forecast card (left) + air-quality / map cards (right)
  const by = hy + hh + 18 * s, bh = h - (by - y) - 26 * s;
  const lw = (w - 52 * s) * 0.52;
  g.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(g, x + 26 * s, by, lw, bh, 16 * s); g.fill();
  g.fillStyle = "rgba(255,255,255,0.62)";
  g.font = `600 ${15 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("10-DAY FORECAST", x + 46 * s, by + 26 * s);
  const days = ["Today", "Sat", "Sun", "Mon", "Tue", "Wed"];
  days.forEach((d, i) => {
    const ry = by + 48 * s + i * ((bh - 60 * s) / days.length);
    g.fillStyle = "#fff";
    g.font = `500 ${19 * s}px -apple-system,system-ui,sans-serif`;
    g.fillText(d, x + 46 * s, ry + 20 * s);
    g.font = `400 ${18 * s}px -apple-system,system-ui,sans-serif`;
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillText(`${48 + i}°`, x + 46 * s + lw * 0.42, ry + 20 * s);
    // temperature range bar
    const bx = x + 46 * s + lw * 0.55, bw2 = lw * 0.3;
    g.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(g, bx, ry + 12 * s, bw2, 6 * s, 3 * s); g.fill();
    const gr = g.createLinearGradient(bx, 0, bx + bw2, 0);
    gr.addColorStop(0, "#63c5f0"); gr.addColorStop(1, "#f2c14e");
    g.fillStyle = gr;
    roundRect(g, bx + bw2 * 0.15, ry + 12 * s, bw2 * 0.6, 6 * s, 3 * s); g.fill();
    g.fillStyle = "#fff";
    g.fillText(`${62 + i}°`, x + 46 * s + lw * 0.88, ry + 20 * s);
  });

  const rx = x + 26 * s + lw + 18 * s, rw = (w - 52 * s) - lw - 18 * s;
  const cardH = (bh - 16 * s) / 2;
  g.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(g, rx, by, rw, cardH, 16 * s); g.fill();
  g.fillStyle = "rgba(255,255,255,0.62)";
  g.font = `600 ${15 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("AIR QUALITY", rx + 20 * s, by + 26 * s);
  g.fillStyle = "#fff";
  g.font = `300 ${46 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("31", rx + 20 * s, by + 74 * s);
  g.font = `400 ${20 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Good", rx + 20 * s, by + 100 * s);
  const agr = g.createLinearGradient(rx + 20 * s, 0, rx + rw - 20 * s, 0);
  agr.addColorStop(0, "#4ad07a"); agr.addColorStop(0.5, "#f2d24e"); agr.addColorStop(1, "#e2593f");
  g.fillStyle = agr;
  roundRect(g, rx + 20 * s, by + 116 * s, rw - 40 * s, 6 * s, 3 * s); g.fill();
  g.fillStyle = "rgba(255,255,255,0.72)";
  g.font = `400 ${14 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Air quality index is 31, similar to yesterday.", rx + 20 * s, by + 142 * s);

  // radar map card
  const my = by + cardH + 16 * s;
  g.fillStyle = "rgba(40,52,70,0.85)";
  roundRect(g, rx, my, rw, cardH, 16 * s); g.fill();
  g.save(); roundRect(g, rx, my, rw, cardH, 16 * s); g.clip();
  g.fillStyle = "#2c3a4e"; g.fillRect(rx, my, rw, cardH);
  g.strokeStyle = "rgba(150,180,210,0.35)"; g.lineWidth = 2 * s;
  g.beginPath();
  g.moveTo(rx + rw * 0.1, my + cardH * 0.85);
  g.bezierCurveTo(rx + rw * 0.3, my + cardH * 0.5, rx + rw * 0.5, my + cardH * 0.7, rx + rw * 0.95, my + cardH * 0.25);
  g.stroke();
  g.fillStyle = "rgba(90,140,200,0.35)";
  g.beginPath(); g.ellipse(rx + rw * 0.55, my + cardH * 0.55, rw * 0.3, cardH * 0.28, 0.3, 0, 7); g.fill();
  g.fillStyle = "#5aa9ff";
  g.beginPath(); g.arc(rx + rw * 0.42, my + cardH * 0.6, 5 * s, 0, 7); g.fill();
  g.restore();
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = `500 ${14 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Sacramento", rx + rw * 0.6, my + cardH * 0.3);
  g.fillText("My Location", rx + rw * 0.2, my + cardH * 0.9);

  g.restore();
  // window chrome stroke
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 2;
  roundRect(g, x, y, w, h, r); g.stroke();
}

// full-bleed weather (used for the floating panel shots)
export function makeWeatherPanel(w = 2200, h = 1400) {
  const [c, g] = cv(w, h);
  drawWeather(g, 0, 0, w, h, { radius: 0 });
  return c;
}

// moon / conditions detail panel — the sky-background full-bleed shot
export function makeMoonPanel(w = 2200, h = 1400) {
  const [c, g] = cv(w, h);
  drawWeather(g, 0, 0, w, h, { radius: 0 });
  // dark "Moon" card overlaying the left half, as in the reference
  const s = w / 1000;
  // reference keeps this as one card in a dense widget grid, not a hero element
  const cw = w * 0.21, ch = h * 0.58, cx = w * 0.06, cy = h * 0.21;
  g.fillStyle = "rgba(46,48,52,0.94)";
  roundRect(g, cx, cy, cw, ch, 20 * s); g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.font = `600 ${20 * s}px -apple-system,system-ui,sans-serif`;
  g.textAlign = "center";
  g.fillText("☾ Moon", cx + cw / 2, cy + 36 * s);
  // moon disc, waning gibbous
  const mr = cw * 0.33, mx = cx + cw / 2, my = cy + ch * 0.42;
  g.save();
  g.beginPath(); g.arc(mx, my, mr, 0, 7); g.clip();
  g.fillStyle = "#c9c6bf"; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
  // craters
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399, rad = mr * (0.15 + 0.6 * ((i * 37) % 100) / 100);
    const px = mx + Math.cos(a) * rad, py = my + Math.sin(a) * rad;
    g.fillStyle = `rgba(120,116,108,${0.18 + (i % 4) * 0.06})`;
    g.beginPath(); g.arc(px, py, mr * (0.05 + (i % 5) * 0.025), 0, 7); g.fill();
  }
  // terminator shadow
  g.fillStyle = "rgba(18,18,20,0.94)";
  g.beginPath(); g.ellipse(mx - mr * 0.62, my, mr * 0.78, mr, 0, 0, 7); g.fill();
  g.restore();
  g.fillStyle = "#fff";
  g.font = `500 ${22 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Waning Gibbous", mx, cy + ch * 0.78);
  g.font = `400 ${17 * s}px -apple-system,system-ui,sans-serif`;
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.fillText("April 15 at 10 AM", mx, cy + ch * 0.83);
  // day scrubber
  g.fillStyle = "rgba(255,255,255,0.25)";
  roundRect(g, cx + 20 * s, cy + ch * 0.88, cw - 40 * s, 3 * s, 2); g.fill();
  ["SUN", "MON", "TUE", "WED", "THU"].forEach((d, i) => {
    const dx = cx + 30 * s + (cw - 60 * s) * (i / 4);
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.font = `500 ${13 * s}px -apple-system,system-ui,sans-serif`;
    g.fillText(d, dx, cy + ch * 0.94);
  });
  g.textAlign = "left";
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.font = `400 ${14 * s}px -apple-system,system-ui,sans-serif`;
  g.fillText("Illumination", cx + 20 * s, cy + ch * 0.985);
  g.textAlign = "right";
  g.fillStyle = "#fff";
  g.fillText("93%", cx + cw - 20 * s, cy + ch * 0.985);
  g.textAlign = "left";
  return c;
}

// ------------------------------------------------------------- Kite editor
// Layout mirrors the reference editor: menu bar, narrow icon rail, a settings
// column with a blue CTA, a large dark preview carrying the kite.video mark,
// and a timeline strip along the bottom.
export function makeKiteEditor(w = 2560, h = 1600) {
  const [c, g] = cv(w, h);
  const F = (s, sz) => { g.font = `${s} ${sz}px -apple-system,system-ui,sans-serif`; };
  g.fillStyle = "#0b0c10"; g.fillRect(0, 0, w, h);

  // ---- menu bar
  g.fillStyle = "#1a1b21"; g.fillRect(0, 0, w, 46);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
    g.fillStyle = col; g.beginPath(); g.arc(30 + i * 26, 23, 8, 0, 7); g.fill();
  });
  g.fillStyle = "rgba(255,255,255,0.75)"; F("600", 17);
  g.fillText("Kite", 128, 29);
  g.fillStyle = "rgba(255,255,255,0.55)"; F("400", 16);
  ["File", "Edit", "View", "Window", "Help"].forEach((s, i) => g.fillText(s, 186 + i * 66, 29));
  g.fillStyle = "rgba(255,255,255,0.42)"; F("400", 16);
  g.textAlign = "center"; g.fillText("Untitled Project — Kite", w / 2, 29); g.textAlign = "left";
  g.fillStyle = "#3b6df5"; roundRect(g, w - 150, 10, 118, 26, 7); g.fill();
  g.fillStyle = "#fff"; F("600", 15);
  g.textAlign = "center"; g.fillText("Export", w - 91, 28); g.textAlign = "left";

  // ---- narrow icon rail
  const RAIL = 92;
  g.fillStyle = "#131419"; g.fillRect(0, 46, RAIL, h - 46);
  for (let i = 0; i < 9; i++) {
    const y = 96 + i * 74;
    if (i === 0) { g.fillStyle = "rgba(59,109,245,0.22)"; roundRect(g, 16, y - 20, 60, 52, 12); g.fill(); }
    g.strokeStyle = i === 0 ? "#6f95ff" : "rgba(255,255,255,0.34)";
    g.lineWidth = 2.4;
    roundRect(g, 32, y - 6, 28, 24, 5); g.stroke();
  }

  // ---- settings column
  const COL = RAIL, CW = 470;
  g.fillStyle = "#16171d"; g.fillRect(COL, 46, CW, h - 46);
  g.fillStyle = "rgba(255,255,255,0.9)"; F("600", 22);
  g.fillText("Scene", COL + 34, 108);
  const rows = ["Background", "Layout", "Zoom", "Cursor", "Camera", "Audio"];
  rows.forEach((s, i) => {
    const y = 168 + i * 62;
    g.fillStyle = "rgba(255,255,255,0.62)"; F("400", 18);
    g.fillText(s, COL + 34, y);
    g.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(g, COL + 250, y - 20, 180, 30, 8); g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)"; F("400", 15);
    g.fillText(["Gradient", "16:9", "Auto", "Default", "Off", "On"][i], COL + 266, y);
  });
  // blue CTA
  g.fillStyle = "#2f5bd8";
  roundRect(g, COL + 30, 566, CW - 60, 46, 10); g.fill();
  g.fillStyle = "#fff"; F("600", 17);
  g.textAlign = "center"; g.fillText("Add screen recording", COL + CW / 2, 595); g.textAlign = "left";
  g.fillStyle = "rgba(255,255,255,0.35)"; F("400", 15);
  g.textAlign = "center"; g.fillText("or drop a file to import", COL + CW / 2, 640); g.textAlign = "left";
  // media thumbnails
  for (let i = 0; i < 4; i++) {
    const y = 700 + i * 108;
    g.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(g, COL + 30, y, CW - 60, 88, 10); g.fill();
    g.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(g, COL + 44, y + 12, 108, 64, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)"; F("500", 16);
    g.fillText(`Clip ${i + 1}`, COL + 172, y + 40);
    g.fillStyle = "rgba(255,255,255,0.28)"; F("400", 14);
    g.fillText(`00:0${i + 2}`, COL + 172, y + 64);
  }

  // ---- preview area
  const PX = COL + CW, TY = h - 420;
  g.fillStyle = "#08090d"; g.fillRect(PX, 46, w - PX, TY - 46);
  const pv = { x: PX + 90, y: 128, w: w - PX - 180, h: TY - 250 };
  const pg = g.createLinearGradient(pv.x, pv.y, pv.x + pv.w, pv.y + pv.h);
  pg.addColorStop(0, "#2a3350"); pg.addColorStop(0.55, "#1b2237"); pg.addColorStop(1, "#10141f");
  g.fillStyle = pg; roundRect(g, pv.x, pv.y, pv.w, pv.h, 16); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
  roundRect(g, pv.x, pv.y, pv.w, pv.h, 16); g.stroke();
  // mock recording inside the preview, so this shot is not a dead black frame
  const mk = { x: pv.x + pv.w * 0.14, y: pv.y + pv.h * 0.14, w: pv.w * 0.72, h: pv.h * 0.66 };
  const mg = g.createLinearGradient(mk.x, mk.y, mk.x + mk.w, mk.y + mk.h);
  mg.addColorStop(0, "#4a5c86"); mg.addColorStop(1, "#232b42");
  g.fillStyle = mg; roundRect(g, mk.x, mk.y, mk.w, mk.h, 12); g.fill();
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(mk.x, mk.y, mk.w, 26);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `rgba(255,255,255,${0.16 - i * 0.02})`;
    roundRect(g, mk.x + 40, mk.y + 66 + i * 46, mk.w * (0.62 - i * 0.08), 26, 6); g.fill();
  }
  g.fillStyle = "rgba(120,160,255,0.35)";
  roundRect(g, mk.x + mk.w * 0.60, mk.y + 70, mk.w * 0.30, mk.h * 0.52, 10); g.fill();
  g.fillStyle = "rgba(255,255,255,0.9)"; F("600", 38);
  g.textAlign = "right";
  g.fillText("kite.video", pv.x + pv.w - 46, pv.y + pv.h - 44);
  g.textAlign = "left";
  // transport
  g.fillStyle = "rgba(255,255,255,0.45)"; F("400", 15);
  g.fillText("00:00 / 00:14", pv.x, pv.y + pv.h + 40);

  // ---- timeline
  g.fillStyle = "#101119"; g.fillRect(PX, TY, w - PX, h - TY);
  g.fillStyle = "rgba(255,255,255,0.42)"; F("500", 16);
  g.fillText("Scene 1", PX + 40, TY + 40);
  g.strokeStyle = "rgba(255,255,255,0.10)"; g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const x = PX + 40 + i * 110;
    g.beginPath(); g.moveTo(x, TY + 56); g.lineTo(x, TY + 68); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.22)"; F("400", 12);
    g.fillText(`0:0${i}`, x + 4, TY + 52);
  }
  g.fillStyle = "#2f5bd8"; roundRect(g, PX + 40, TY + 82, 330, 78, 9); g.fill();
  g.strokeStyle = "#7ba0ff"; g.lineWidth = 3;
  roundRect(g, PX + 40, TY + 82, 330, 78, 9); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.30)";
  for (let i = 1; i < 6; i++) g.fillRect(PX + 40 + i * 55, TY + 82, 2, 78);
  g.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(g, PX + 390, TY + 82, 220, 78, 9); g.fill();
  // playhead
  g.strokeStyle = "#e8edff"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(PX + 258, TY + 56); g.lineTo(PX + 258, h - 90); g.stroke();
  // action buttons
  g.fillStyle = "rgba(255,255,255,0.62)"; F("500", 17);
  g.fillText("+  Add clip", PX + 40, h - 44);
  g.fillText("+  Add voiceover", PX + 210, h - 44);
  g.fillStyle = "rgba(255,255,255,0.32)";
  g.fillText("Import image or video", PX + 430, h - 44);
  return c;
}

// ---------------------------------------------- macOS desktop compositions
function desktopBase(g, w, h, wall) {
  g.drawImage(wall, 0, 0, w, h);
  menubar(g, w);
}

// desktop with the Weather window open + screen-record toolbar (reference cuts 3-4)
export function makeDesktopWeather(wall, w = 2560, h = 1600) {
  const [c, g] = cv(w, h);
  desktopBase(g, w, h, wall);
  const ww = w * 0.74, wh = h * 0.74, wx = (w - ww) / 2, wy = h * 0.12;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 60; g.shadowOffsetY = 24;
  g.fillStyle = "#000";
  roundRect(g, wx, wy, ww, wh, 18); g.fill();
  g.restore();
  drawWeather(g, wx, wy, ww, wh, { radius: 18 });
  // screen-record floating toolbar
  const tw = 420, th = 60, tx = (w - tw) / 2, ty = h - 150;
  g.fillStyle = "rgba(30,30,34,0.92)";
  roundRect(g, tx, ty, tw, th, 14); g.fill();
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = i === 2 ? "#fff" : "rgba(255,255,255,0.6)";
    g.lineWidth = 2.5;
    const bx = tx + 34 + i * 62;
    if (i < 2) { g.strokeRect(bx - 12, ty + 20, 24, 20); }
    else { roundRect(g, bx - 12, ty + 20, 24, 20, 4); g.stroke(); }
  }
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = "500 17px -apple-system,system-ui,sans-serif";
  g.fillText("Options", tx + tw - 110, ty + 36);
  return c;
}

// desktop showing the "Record iPhone" panel with a mirrored iPhone (reference cut 10)
export function makeDesktopPhone(wall, phoneScreen, w = 2560, h = 1600) {
  const [c, g] = cv(w, h);
  // this shot reads near-black in the reference: dim wallpaper heavily
  g.drawImage(wall, 0, 0, w, h);
  g.fillStyle = "rgba(6,6,10,0.80)"; g.fillRect(0, 0, w, h);
  menubar(g, w, "Kite");
  // left settings column
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.font = "500 22px -apple-system,system-ui,sans-serif";
  ["Camera", "Microphone", "Quality", "Frame rate"].forEach((s, i) => {
    g.fillText(s, 120, 320 + i * 78);
    g.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(g, 420, 300 + i * 78, 120, 30, 15); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)";
  });
  // right panel
  g.fillStyle = "rgba(255,255,255,0.72)";
  g.font = "600 24px -apple-system,system-ui,sans-serif";
  g.fillText("Record iPhone", w - 620, 320);
  g.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(g, w - 620, 360, 260, 54, 12); g.fill();
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = "500 20px -apple-system,system-ui,sans-serif";
  g.fillText("Start recording", w - 596, 394);
  // mirrored iPhone in the centre
  const ph = h * 0.70, pw = ph * (1320 / 2868), px = (w - pw) / 2, py = (h - ph) / 2;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = 70; g.shadowOffsetY = 20;
  g.fillStyle = "#0a0a0c";
  roundRect(g, px - 14, py - 14, pw + 28, ph + 28, 62); g.fill();
  g.restore();
  g.save();
  roundRect(g, px, py, pw, ph, 50); g.clip();
  g.drawImage(phoneScreen, px, py, pw, ph);
  g.restore();
  // dynamic island
  g.fillStyle = "#000";
  roundRect(g, px + pw / 2 - 52, py + 16, 104, 30, 15); g.fill();
  return c;
}

// ------------------------------------------------------------- iOS screens
export function makePhoneHome(w = 1320, h = 2868) {
  const [c, g] = cv(w, h);
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#3a1020"); bg.addColorStop(0.5, "#8d2033"); bg.addColorStop(1, "#1a0812");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const grd = g.createLinearGradient(0, h * (0.2 + i * 0.2), w, h * (0.35 + i * 0.2));
    grd.addColorStop(0, ["#ff9d3d", "#e2452a", "#ff7a2f", "#c8322c"][i]);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.5; g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, h * (0.22 + i * 0.19));
    g.bezierCurveTo(w * 0.4, h * (0.12 + i * 0.19), w * 0.7, h * (0.34 + i * 0.19), w, h * (0.18 + i * 0.19));
    g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  // status bar
  g.fillStyle = "#fff";
  g.font = `600 ${34}px -apple-system,system-ui,sans-serif`;
  g.fillText("3:21", 96, 96);
  g.textAlign = "right";
  g.fillText("▮▮▮", w - 96, 96);
  g.textAlign = "left";
  // icon grid
  const cols = 4, rows = 6, pad = 86, gap = (w - pad * 2 - cols * 190) / (cols - 1);
  const palette = ["#4e9bf5", "#3ec46d", "#f5b83e", "#f0603e", "#a267f0", "#f05c9c",
    "#2fc4c0", "#f58b3e", "#6c7ef5", "#3ec4a6", "#f0d13e", "#8c5cf0"];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      const ix = pad + cc * (190 + gap), iy = 260 + r * 250;
      const col = palette[k % palette.length];
      const ig = g.createLinearGradient(ix, iy, ix + 190, iy + 190);
      ig.addColorStop(0, col); ig.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = ig;
      roundRect(g, ix, iy, 190, 190, 46); g.fill();
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.font = `500 ${26}px -apple-system,system-ui,sans-serif`;
      g.textAlign = "center";
      g.fillText("App", ix + 95, iy + 232);
      g.textAlign = "left";
      k++;
    }
  }
  // dock
  g.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(g, 70, h - 400, w - 140, 300, 68); g.fill();
  for (let i = 0; i < 4; i++) {
    const ix = 140 + i * 265;
    const col = palette[(i * 3) % palette.length];
    const ig = g.createLinearGradient(ix, h - 340, ix + 190, h - 150);
    ig.addColorStop(0, col); ig.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = ig;
    roundRect(g, ix, h - 340, 190, 190, 46); g.fill();
  }
  return c;
}

export function makePhoneWeather(w = 1320, h = 2868) {
  const [c, g] = cv(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#84b6ea"); sky.addColorStop(0.45, "#5286c6"); sky.addColorStop(1, "#27508f");
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const cxx = w * (0.1 + i * 0.18), cyy = h * (0.05 + (i % 3) * 0.02), rad = w * (0.16 + (i % 3) * 0.06);
    const cg = g.createRadialGradient(cxx, cyy, 0, cxx, cyy, rad);
    cg.addColorStop(0, "rgba(255,255,255,0.55)"); cg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(cxx, cyy, rad, 0, 7); g.fill();
  }
  g.fillStyle = "#fff";
  g.font = "600 34px -apple-system,system-ui,sans-serif";
  g.fillText("3:21", 96, 96);
  g.textAlign = "center";
  g.font = "300 62px -apple-system,system-ui,sans-serif";
  g.fillText("Mission Dolores", w / 2, 300);
  g.font = "100 200px -apple-system,system-ui,sans-serif";
  g.fillText("57°", w / 2, 500);
  g.font = "400 44px -apple-system,system-ui,sans-serif";
  g.fillStyle = "rgba(255,255,255,0.88)";
  g.fillText("Partly Cloudy", w / 2, 570);
  g.font = "400 40px -apple-system,system-ui,sans-serif";
  g.fillText("H:64°  L:48°", w / 2, 636);
  g.textAlign = "left";
  // hourly
  g.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(g, 60, 720, w - 120, 300, 34); g.fill();
  ["Now", "4PM", "5PM", "6PM", "7PM"].forEach((hh, i) => {
    const cxx = 60 + (w - 120) * ((i + 0.5) / 5);
    g.textAlign = "center";
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "500 36px -apple-system,system-ui,sans-serif";
    g.fillText(hh, cxx, 790);
    g.font = "400 44px -apple-system,system-ui,sans-serif";
    g.fillText("☁", cxx, 880);
    g.fillStyle = "#fff";
    g.font = "400 46px -apple-system,system-ui,sans-serif";
    g.fillText(`${57 - i}°`, cxx, 970);
    g.textAlign = "left";
  });
  // daily list
  g.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(g, 60, 1060, w - 120, 1180, 34); g.fill();
  ["Today", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"].forEach((d, i) => {
    const y = 1130 + i * 160;
    g.fillStyle = "#fff";
    g.font = "500 42px -apple-system,system-ui,sans-serif";
    g.fillText(d, 110, y);
    g.font = "400 44px -apple-system,system-ui,sans-serif";
    g.fillText("☁", 400, y);
    g.fillStyle = "rgba(255,255,255,0.65)";
    g.fillText(`${48 + i}°`, 560, y);
    const bx = 680, bw = 380;
    g.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(g, bx, y - 16, bw, 12, 6); g.fill();
    const gr = g.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, "#63c5f0"); gr.addColorStop(1, "#f2c14e");
    g.fillStyle = gr;
    roundRect(g, bx + bw * 0.15, y - 16, bw * 0.6, 12, 6); g.fill();
    g.fillStyle = "#fff";
    g.fillText(`${62 + i}°`, 1130, y);
  });
  // bottom cards
  g.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(g, 60, 2290, (w - 150) / 2, 300, 34); g.fill();
  roundRect(g, 60 + (w - 150) / 2 + 30, 2290, (w - 150) / 2, 300, 34); g.fill();
  return c;
}

// dark "Conditions" detail sheet used on the landscape + outro phone shots
export function makePhoneWeatherDark(w = 1320, h = 2868) {
  const [c, g] = cv(w, h);
  g.fillStyle = "#0e1116"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff";
  g.font = "600 34px -apple-system,system-ui,sans-serif";
  g.fillText("3:21", 96, 96);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = "600 46px -apple-system,system-ui,sans-serif";
  g.fillText("☁ Conditions", 96, 230);
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.font = "400 34px -apple-system,system-ui,sans-serif";
  g.fillText("Friday, April 25, 2025", 96, 300);
  g.fillStyle = "#fff";
  g.font = "200 130px -apple-system,system-ui,sans-serif";
  g.fillText("57°", 96, 450);
  g.font = "400 40px -apple-system,system-ui,sans-serif";
  g.fillStyle = "rgba(255,255,255,0.6)";
  g.fillText("58°/48°  Feels like 55°", 96, 520);
  // day strip
  ["24", "25", "26", "27", "28", "29", "30"].forEach((d, i) => {
    const dx = 120 + i * 160;
    g.fillStyle = i === 1 ? "#fff" : "rgba(255,255,255,0.35)";
    g.font = "500 36px -apple-system,system-ui,sans-serif";
    g.textAlign = "center";
    g.fillText(d, dx, 180);
    g.textAlign = "left";
  });
  // area chart
  const cy = 900, chh = 700;
  const grad = g.createLinearGradient(0, cy, 0, cy + chh);
  grad.addColorStop(0, "rgba(90,190,200,0.55)");
  grad.addColorStop(1, "rgba(90,190,200,0.02)");
  g.beginPath();
  g.moveTo(60, cy + chh);
  const pts = [0.55, 0.62, 0.48, 0.40, 0.52, 0.72, 0.85, 0.70, 0.58];
  pts.forEach((p, i) => {
    const px = 60 + (w - 120) * (i / (pts.length - 1));
    g.lineTo(px, cy + chh * (1 - p));
  });
  g.lineTo(w - 60, cy + chh); g.closePath();
  g.fillStyle = grad; g.fill();
  g.strokeStyle = "#7fdce6"; g.lineWidth = 5;
  g.beginPath();
  pts.forEach((p, i) => {
    const px = 60 + (w - 120) * (i / (pts.length - 1));
    const py = cy + chh * (1 - p);
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  });
  g.stroke();
  // rows
  ["Precipitation", "Wind", "UV Index", "Humidity"].forEach((s, i) => {
    const y = 1780 + i * 150;
    g.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(g, 60, y - 60, w - 120, 120, 24); g.fill();
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.font = "500 40px -apple-system,system-ui,sans-serif";
    g.fillText(s, 110, y + 14);
    g.textAlign = "right";
    g.fillStyle = "#fff";
    g.fillText(["0%", "8 mph", "4", "62%"][i], w - 110, y + 14);
    g.textAlign = "left";
  });
  return c;
}
