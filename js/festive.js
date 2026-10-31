// Festive layer — snow, string lights, swinging baubles, countdown, sleigh, bursts and bells.
// Everything is decorative: pointer-events stay off except on the decorations themselves,
// and the whole layer can be switched off (remembered per browser) or is calmed by reduced-motion.
const KEY = 'bcm.festive';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch {} } };
export const festiveOn = () => (store.get() ?? (reduced ? 'off' : 'on')) === 'on';
import { theme, themeId, hangSVG, heroSVG, flyerSVG, particleDrawer } from './themes.js';
const COLORS = new Proxy([], { get: (t, k) => k === 'length' ? theme().party.length : theme().party[k] });
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

// ---------- sound: a small synthesized sleigh bell ----------
let actx = null;
export function jingle(pitch = 0) {
  if (!festiveOn() || !soundOn()) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 987.8, 1174.7, 1318.5, 1568, 1760];
    const f = notes[(pitch >= 0 ? pitch : Math.floor(Math.random() * notes.length)) % notes.length];
    const t = actx.currentTime, out = actx.createGain();
    out.gain.value = 0.12; out.connect(actx.destination);
    for (const [m, a, d] of [[1, 1, 1.2], [2.76, .45, .6], [5.4, .25, .35], [8.9, .12, .2]]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
    }
  } catch {}
}

// ---------- confetti / star burst ----------
export function burst(x, y, n = 22) {
  if (!festiveOn()) return;
  if (x == null) { x = innerWidth / 2; y = innerHeight / 3; }
  const glyphs = { snow: ['✦', '❄', '★', '●', '✧'], hearts: ['❤', '✦', '♥', '✧'], notes: ['♪', '♫', '✦', '★'], stars: ['✦', '★', '✧', '●'], eid: ['☾', '✦', '★', '✧'], confetti: ['■', '●', '▲', '★'], bubbles: ['●', '○', '✦'], petals: ['❀', '✿', '●', '✦'] }[theme().particles] || ['✦', '★', '●'];
  for (let i = 0; i < n; i++) {
    const p = el('span', 'fx-p', glyphs[i % glyphs.length]);
    p.style.cssText = `left:${x}px;top:${y}px;color:${COLORS[i % COLORS.length]};font-size:${10 + Math.random() * 14}px`;
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
    p.animate([
      { transform: 'translate(-50%,-50%) scale(.4) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 60}px)) scale(1) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
  }
}
// celebrate a success (booking saved, payment recorded…)
export function celebrate() { burst(); jingle(0); setTimeout(() => jingle(2), 140); setTimeout(() => jingle(4), 280); }

// ---------- snow ----------
let snow = null;
function startSnow(density) {
  // falling particles across the screen belong to the Christmas market only
  if (snow || !festiveOn() || themeId() !== 'christmas') return;
  const c = el('canvas', 'fx-snow'); c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  let W, H, flakes = [], wind = 0, windT = 0, raf, mx = -1, my = -1;
  let kk = 0; const draw = particleDrawer(theme().particles), up = theme().particles === 'bubbles';
  const make = top => ({ x: Math.random() * W, y: top ? (up ? H + 10 : -10) : Math.random() * H, r: .8 + Math.random() * 2.6, s: (.35 + Math.random() * .9) * (up ? -.7 : 1), o: .35 + Math.random() * .55, p: Math.random() * 6.28, k: kk++ });
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.round(density * Math.min(1.6, (W * H) / (1280 * 800)));
    while (flakes.length < want) flakes.push(make(false));
    flakes.length = want;
  };
  const onMove = e => { const nx = e.clientX; if (mx >= 0) windT = Math.max(-3, Math.min(3, (nx - mx) * .08)); mx = nx; my = e.clientY; };
  const tick = () => {
    wind += (windT - wind) * .03; windT *= .97;
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      f.p += .01; f.y += f.s; f.x += Math.sin(f.p) * .35 + wind * f.r * .4;
      if (mx >= 0) { const dx = f.x - mx, dy = f.y - my, d2 = dx * dx + dy * dy; if (d2 < 3600) { const k = (3600 - d2) / 3600 * 1.6; f.x += dx / 60 * k; f.y += dy / 60 * k; } }
      if (f.y > H + 12 || f.y < -14) Object.assign(f, make(true));
      if (f.x > W + 6) f.x = -6; else if (f.x < -6) f.x = W + 6;
      ctx.globalAlpha = f.o; draw(ctx, f);
    }
    raf = requestAnimationFrame(tick);
  };
  const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(tick); };
  size(); addEventListener('resize', size); addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('visibilitychange', vis);
  raf = requestAnimationFrame(tick);
  snow = { stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', vis); c.remove(); snow = null; } };
}

// ---------- string lights (garland) ----------
export function garland(host, { count } = {}) {
  const wrap = el('div', 'fx-garland'); wrap.setAttribute('aria-hidden', 'true');
  const svg = sv('svg', { class: 'fx-garland-svg' }); wrap.append(svg); host.append(wrap);
  let hue = 0;
  const draw = () => {
    const W = wrap.clientWidth || host.clientWidth || 800, sag = 16, step = count ? W / count : 54;
    const n = Math.max(4, Math.floor(W / step));
    svg.setAttribute('viewBox', `0 0 ${W} 46`); svg.setAttribute('width', W); svg.setAttribute('height', 46);
    svg.replaceChildren();
    const seg = W / n; let d = 'M0,4';
    for (let i = 0; i < n; i++) d += ` Q${seg * i + seg / 2},${4 + sag} ${seg * (i + 1)},4`;
    svg.append(sv('path', { d, class: 'fx-wire' }));
    const kind = theme().garland;
    if (kind !== 'lights') {
      for (let i = 0; i < n * (kind === 'bunting' ? 2 : 1); i++) {
        const per = kind === 'bunting' ? seg / 2 : seg, x = per * i + per / 2, t = (x % seg) / seg, y = 4 + 4 * sag * t * (1 - t) * .5 + 1, col = COLORS[(i + hue) % COLORS.length];
        const g = sv('g', { class: 'fx-bulb fx-item', transform: `translate(${x},${y})`, style: `--c:${col};--d:${(i % 7) * .37}s`, tabindex: '-1' });
        if (kind === 'bunting') g.innerHTML = `<path d="M-11 0 H11 L0 20z" fill="${col}" stroke="rgba(0,0,0,.12)"/><path d="M-6 3 H6 L0 13z" fill="#fff" opacity=".18"/>`;
        else if (kind === 'hearts') g.innerHTML = `<path d="M0 18 C-12 9 -14 3 -14 0 a7 7 0 0 1 14 -3 a7 7 0 0 1 14 3 c0 3 -2 9 -14 18z" class="fx-glass" fill="${col}"/>`;
        else g.innerHTML = `<g transform="translate(-9 -2) scale(.3)">${hangSVG('lantern', i, 60).replace(/<\/?svg[^>]*>/g, '')}</g><circle cx="0" cy="12" r="6" class="fx-glass" fill="${theme().c.goldHi}" opacity=".35"/>`;
        g.addEventListener('pointerdown', e => { e.stopPropagation(); g.classList.remove('pop'); void g.getBBox(); g.classList.add('pop'); jingle(i); const r = g.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 8); });
        svg.append(g);
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const x = seg * i + seg / 2, y = 4 + sag / 2 + 1, col = COLORS[(i + hue) % 5];
      const g = sv('g', { class: 'fx-bulb', transform: `translate(${x},${y}) rotate(${(i % 2 ? 1 : -1) * 8})`, style: `--c:${col};--d:${(i % 7) * .37}s`, tabindex: '-1' });
      g.append(sv('rect', { x: -3.2, y: -1, width: 6.4, height: 5, rx: 1.2, class: 'fx-cap' }));
      g.append(sv('ellipse', { cx: 0, cy: 11, rx: 5.6, ry: 8.4, class: 'fx-glass' }));
      g.append(sv('ellipse', { cx: -1.8, cy: 8, rx: 1.4, ry: 2.6, class: 'fx-shine' }));
      g.addEventListener('pointerdown', e => { e.stopPropagation(); g.classList.remove('pop'); void g.getBBox(); g.classList.add('pop'); jingle(i); const r = g.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 8); });
      svg.append(g);
    }
  };
  draw();
  const ro = new ResizeObserver(draw); ro.observe(wrap);
  // double-click anywhere on the string → rotate all colours
  wrap.addEventListener('dblclick', () => { hue++; draw(); });
  return wrap;
}

// ---------- swinging baubles ----------
const BAUBLE_STYLES = [
  ['#d8333a', '#8c161d'], ['#e8b84a', '#a87618'], ['#2f7d47', '#14452a'], ['#f5f0e6', '#c9bfae'], ['#b3212a', '#5f0d12'],
];
let baubleId = 0;
function baubleSVG(i, size) {
  const [a, b] = BAUBLE_STYLES[i % BAUBLE_STYLES.length], id = 'bg' + (++baubleId), pat = i % 3;
  const deco = pat === 0 ? `<path d="M6 34 Q30 26 54 34" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none"/><path d="M6 42 Q30 50 54 42" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>`
    : pat === 1 ? `<g fill="#fff" fill-opacity=".75"><circle cx="18" cy="32" r="2.2"/><circle cx="30" cy="27" r="2.2"/><circle cx="42" cy="32" r="2.2"/><circle cx="24" cy="44" r="2.2"/><circle cx="36" cy="44" r="2.2"/></g>`
    : `<path d="M30 22 l3 7 7 .6 -5.4 4.6 1.8 7 -6.4-4 -6.4 4 1.8-7 -5.4-4.6 7-.6z" fill="#fff" fill-opacity=".8"/>`;
  return `<svg viewBox="0 0 60 72" width="${size}" height="${size * 1.2}" aria-hidden="true"><defs><radialGradient id="${id}" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".18" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
<path d="M26 4h8v8h-8z" fill="#d4a73c"/><path d="M27 4 q3 -6 6 0" stroke="#d4a73c" stroke-width="2" fill="none"/><rect x="24" y="9" width="12" height="5" rx="1.5" fill="#b88a2a"/>
<circle cx="30" cy="40" r="26" fill="url(#${id})"/>${deco}<ellipse cx="21" cy="29" rx="5" ry="8" fill="#fff" fill-opacity=".35" transform="rotate(30 21 29)"/></svg>`;
}
export function baubles(host, items) {
  // items: [{ x: '12%', len: 60, size: 46 }]
  const layer = el('div', 'fx-baubles'); host.append(layer);
  const all = items.map((it, i) => {
    const b = el('button', 'fx-bauble'); b.type = 'button'; b.setAttribute('aria-label', 'زينة');
    b.style.cssText = `inset-inline-start:${it.x};--len:${it.len}px`;
    b.innerHTML = `<span class="fx-string"></span>${theme().hang === 'bauble' ? baubleSVG(i + (it.style || 0), it.size || 46) : hangSVG(theme().hang, i + (it.style || 0), it.size || 46)}`;
    layer.append(b);
    const st = { a: (Math.random() - .5) * .2, v: 0, spin: 0, el: b };
    b.addEventListener('pointerenter', e => { st.v += (e.movementX || (Math.random() - .5) * 6) * .004 + (Math.random() - .5) * .04; });
    b.addEventListener('click', e => { st.v += (Math.random() > .5 ? 1 : -1) * .12; st.spin = 1; jingle(i); burst(e.clientX, e.clientY, 14); });
    return st;
  });
  let raf, last = performance.now();
  let seen = false;
  const tick = now => {
    if (layer.isConnected) seen = true; else if (seen) { clearInterval(breeze); return; }
    const dt = Math.min(32, now - last) / 16.7; last = now;
    for (const s of all) {
      s.v += -s.a * .012 * dt; s.v *= Math.pow(.985, dt); s.a += s.v * dt;
      if (s.spin) { s.spin = Math.max(0, s.spin - .02 * dt); }
      s.el.style.transform = `rotate(${s.a}rad)`;
      s.el.lastElementChild.style.transform = s.spin ? `rotateY(${(1 - s.spin) * 720}deg)` : '';
    }
    raf = requestAnimationFrame(tick);
  };
  if (!reduced) raf = requestAnimationFrame(tick);
  // gentle breeze
  const breeze = setInterval(() => { if (festiveOn()) all[Math.floor(Math.random() * all.length)].v += (Math.random() - .5) * .03; }, 2500);
  return { el: layer, stop() { cancelAnimationFrame(raf); clearInterval(breeze); layer.remove(); } };
}

// ---------- countdown ----------
export function countdown(startISO, endISO, time = null) {
  const box = el('div', 'fx-count'); box.setAttribute('role', 'timer');
  const start = new Date(startISO + 'T' + (/^\d{1,2}:\d{2}$/.test(time || '') ? time.padStart(5, '0') : '00:00') + ':00+03:00').getTime();
  const end = new Date(endISO + 'T23:59:59+03:00').getTime();
  const units = [['d', 'يوم', 86400], ['h', 'ساعة', 3600], ['m', 'دقيقة', 60], ['s', 'ثانية', 1]];
  const cells = {};
  const head = el('span', 'fx-count-h');
  const grid = el('span', 'fx-count-g');
  for (const [k, l] of units) { const c = el('span', 'fx-cell'); c.innerHTML = `<b class="num">0</b><small>${l}</small>`; cells[k] = c.firstChild; grid.append(c); }
  box.append(head, grid);
  let seen = false, lastH = '';
  const setH = t => { if (t !== lastH) { lastH = t; head.textContent = t; } };
  const upd = () => {
    if (box.isConnected) seen = true; else if (seen) return clearInterval(iv);
    const now = Date.now();
    if (now < start) {
      setH(theme().countdown);
      let t = Math.floor((start - now) / 1000);
      for (const [k, , s] of units) { const v = Math.floor(t / s); t -= v * s; const txt = String(v).padStart(k === 'd' ? 1 : 2, '0'); if (cells[k].textContent !== txt) { cells[k].textContent = txt; cells[k].classList.remove('tick'); void cells[k].offsetWidth; cells[k].classList.add('tick'); } }
      grid.hidden = false;
    } else if (now <= end) {
      const day = Math.floor((now - start) / 86400000) + 1, all = Math.round((end - start) / 86400000), T = theme();
      setH(all <= 1 ? `${T.icon} ${T.noun} اليوم — أهلاً بكم` : `${T.icon} ${T.noun} قائم الآن — اليوم ${day} من ${all}`); grid.hidden = true;
    } else { setH('شكراً لكم — نلقاكم في المناسبة القادمة ✨'); grid.hidden = true; }
  };
  upd(); const iv = setInterval(upd, 1000);
  box._stop = () => clearInterval(iv);
  return box;
}

// ---------- interactive tree ----------
export function tree(size = 120) {
  const b = el('button', 'fx-tree fx-hero-' + theme().hero); b.type = 'button'; b.setAttribute('aria-label', themeId() === 'christmas' ? 'شجرة الميلاد — اضغط لإضاءتها' : 'زينة — اضغط عليها');
  if (theme().hero !== 'tree') {
    b.innerHTML = `<svg viewBox="0 0 120 170" width="${size}" height="${size * 1.42}" aria-hidden="true">${heroSVG(theme().hero)}</svg>`;
    let mode = 0;
    b.addEventListener('click', e => { mode = (mode + 1) % 3; b.dataset.mode = mode; jingle(mode * 2); burst(e.clientX, e.clientY - 40, 18); });
    return b;
  }
  const lights = [[44, 52], [70, 60], [56, 80], [36, 92], [82, 96], [60, 112], [30, 124], [92, 128], [48, 136], [74, 140]];
  b.innerHTML = `<svg viewBox="0 0 120 170" width="${size}" height="${size * 1.42}" aria-hidden="true">
<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9a5a"/><stop offset="1" stop-color="#16452a"/></linearGradient></defs>
<rect x="52" y="146" width="16" height="18" rx="3" fill="#7a4a24"/>
<path d="M60 18 L88 62 H74 L100 102 H82 L112 148 H8 L38 102 H20 L46 62 H32Z" fill="url(#tg)"/>
<path d="M34 70 Q60 84 86 66 M26 110 Q60 126 94 106" stroke="#e8b84a" stroke-width="2.4" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/>
${lights.map(([x, y], i) => `<circle class="fx-tl" cx="${x}" cy="${y}" r="4.2" style="--c:${COLORS[i % 5]};--d:${(i % 5) * .3}s"/>`).join('')}
<path class="fx-star" d="M60 2 l4.7 10 11 1.2 -8.2 7.4 2.3 10.8 -9.8-5.6 -9.8 5.6 2.3-10.8 -8.2-7.4 11-1.2z"/>
<g class="fx-gifts"><rect x="14" y="150" width="22" height="16" rx="2" fill="#d8333a"/><rect x="23" y="150" width="4" height="16" fill="#e8b84a"/><rect x="84" y="146" width="24" height="20" rx="2" fill="#2f7d47"/><rect x="94" y="146" width="4" height="20" fill="#fff4d6"/></g></svg>`;
  let mode = 0;
  b.addEventListener('click', e => { mode = (mode + 1) % 3; b.dataset.mode = mode; jingle(mode * 2); burst(e.clientX, e.clientY - 40, 18); });
  return b;
}

// ---------- Santa's sleigh: flies around the whole screen ----------
const SLEIGH_SVG = `<svg viewBox="0 0 300 120" width="230" height="92" aria-hidden="true">
<defs><linearGradient id="slr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e23b42"/><stop offset="1" stop-color="#9e1b22"/></linearGradient>
<linearGradient id="slg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b88a2a"/><stop offset=".5" stop-color="#f3d27a"/><stop offset="1" stop-color="#b88a2a"/></linearGradient></defs>
<g class="sl-deer sl-d2"><path d="M196 70c8-10 26-12 36-6l6-10 6 3-5 10c4 2 6 6 6 10" fill="none"/>
<ellipse cx="214" cy="72" rx="20" ry="9" fill="#8b5a2b"/><path d="M200 78l-8 14M206 79l-2 16M224 78l6 14M230 76l10 12" stroke="#6b4220" stroke-width="3.5" stroke-linecap="round"/>
<path d="M230 66q6-14 14-16l4 4q-2 8-10 14z" fill="#8b5a2b"/><circle cx="246" cy="55" r="6" fill="#8b5a2b"/><circle cx="252" cy="56" r="2.6" fill="#2b1a0e"/>
<path d="M243 50l-4-12M239 42l-6-3M241 46l6-6M247 49l3-12M249 41l5-3" stroke="#d9b98a" stroke-width="2" stroke-linecap="round"/><circle cx="244" cy="54" r="1.2" fill="#fff"/></g>
<g class="sl-deer sl-d1"><ellipse cx="258" cy="58" rx="19" ry="8.5" fill="#9a6532"/><path d="M245 64l-8 13M251 65l-2 15M267 64l6 13M273 62l10 11" stroke="#6b4220" stroke-width="3.5" stroke-linecap="round"/>
<path d="M272 52q6-13 14-15l4 4q-2 8-10 13z" fill="#9a6532"/><circle cx="288" cy="42" r="6" fill="#9a6532"/><circle cx="294.5" cy="43" r="3.4" fill="#ff3b3b" class="sl-nose"/>
<path d="M285 37l-4-12M281 29l-6-3M283 33l6-6M289 36l3-12M291 28l5-3" stroke="#d9b98a" stroke-width="2" stroke-linecap="round"/><circle cx="286" cy="41" r="1.2" fill="#fff"/></g>
<path d="M150 74 Q200 66 238 60 M150 78 Q200 74 252 66" stroke="url(#slg)" stroke-width="1.6" fill="none"/>
<circle cx="236" cy="63" r="2.4" fill="#f3d27a"/><circle cx="270" cy="56" r="2.4" fill="#f3d27a"/>
<path d="M58 46 q-14 -20 4 -30 q18 -8 30 6 q8 12 -4 24z" fill="#3f7d47"/><rect x="66" y="22" width="14" height="12" rx="2" fill="#e8b84a"/><rect x="72" y="22" width="3" height="12" fill="#d8333a"/>
<circle cx="112" cy="44" r="16" fill="url(#slr)"/><rect x="98" y="52" width="28" height="5" fill="#2b1a0e"/><rect x="109" y="51.5" width="6" height="6" rx="1" fill="#f3d27a"/>
<circle cx="116" cy="24" r="9" fill="#f6d2b4"/><path d="M106 26 q10 18 20 0 q-2 12 -10 14 q-8 -2 -10 -14z" fill="#fff"/><circle cx="119" cy="22" r="1.3" fill="#2b1a0e"/><circle cx="121" cy="27" r="2" fill="#f08f8f"/>
<path d="M106 20 q8 -18 26 -6 l-4 6 q-10 -6 -22 0z" fill="#d8333a"/><circle cx="133" cy="14" r="4" fill="#fff"/><rect x="104" y="17" width="22" height="5" rx="2.5" fill="#fff"/>
<path d="M124 44 q10 4 14 14" stroke="#d8333a" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="139" cy="59" r="3.5" fill="#fff"/>
<path d="M40 52 H150 q8 0 6 10 l-6 18 H62 q-22 0 -22 -28z" fill="url(#slr)"/><path d="M46 58 H148" stroke="#f3d27a" stroke-width="2.5"/>
<path d="M62 70 q10 -8 20 0 q10 8 20 0 q10 -8 20 0" stroke="#f3d27a" stroke-width="1.8" fill="none"/>
<path d="M30 96 H160 q14 0 14 -12" stroke="url(#slg)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 96 q-10 0 -10 -8 q0 -6 6 -6" stroke="url(#slg)" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M72 80 v16 M136 80 v16" stroke="url(#slg)" stroke-width="3"/></svg>`;

// "Ho ho ho" — spoken by the browser's voice when available, otherwise a synthesized deep "ho".
function hoHoHo() {
  if (!soundOn()) return 1200;
  try {
    const synth = window.speechSynthesis, voices = synth?.getVoices() || [];
    if (synth && voices.length) {
      const u = new SpeechSynthesisUtterance('Ho! Ho! Ho! Merry Christmas!');
      u.voice = voices.find(v => /en[-_](US|GB)/i.test(v.lang) && /male|daniel|david|george|fred|alex/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang)) || null;
      u.lang = u.voice?.lang || 'en-US'; u.pitch = 0.1; u.rate = 0.72; u.volume = 1;
      synth.cancel(); synth.speak(u); return 2600;
    }
  } catch {}
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.42, o = actx.createOscillator(), g = actx.createGain(), out = actx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(92, t + .32);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .34);
      out.gain.value = .35; o.connect(g);
      for (const [f, q, a] of [[480, 6, 1], [820, 8, .5], [2600, 10, .08]]) { const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const ga = actx.createGain(); ga.gain.value = a; g.connect(bp).connect(ga).connect(out); }
      out.connect(actx.destination); o.start(t); o.stop(t + .4);
    }
  } catch {}
  return 1500;
}

// Jingle Bells (traditional, public domain) — bell melody, bass and sleigh-bell shaker.
let music = null;
export function stopMusic() { if (music) { music.stop(); music = null; } }
export function jingleBells() {
  stopMusic();
  if (!soundOn()) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, C3: 130.81, F3: 174.61, G3: 196, D3: 146.83 };
    const A = 'E4 1,E4 1,E4 2,E4 1,E4 1,E4 2,E4 1,G4 1,C4 1.5,D4 .5,E4 4,F4 1,F4 1,F4 1.5,F4 .5,F4 1,E4 1,E4 1,E4 .5,E4 .5';
    const tune = (A + ',E4 1,D4 1,D4 1,E4 1,D4 2,G4 2,' + A + ',G4 1,G4 1,F4 1,D4 1,C4 4').split(',').map(x => { const [n, d] = x.split(' '); return [N[n], +d]; });
    const bass = ['C3', 'C3', 'C3', 'C3', 'F3', 'C3', 'D3', 'G3', 'C3', 'C3', 'C3', 'C3', 'F3', 'C3', 'G3', 'C3'];
    const beat = 0.3, t0 = actx.currentTime + 0.08;
    const master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination);
    const nodes = [];
    const bell = (f, t, d, vol = .22) => {
      for (const [m, a, dec] of [[2, 1, 1], [4, 0.35, .6], [5.95, 0.18, .35], [8.1, 0.08, .2]]) {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(.25, d * beat * dec + .15));
        o.connect(g).connect(master); o.start(t); o.stop(t + d * beat + .5); nodes.push(o);
      }
    };
    const bassNote = (f, t, d) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(master); o.start(t); o.stop(t + d + .05); nodes.push(o); };
    const noise = actx.createBuffer(1, actx.sampleRate * .12, actx.sampleRate); { const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); }
    const shaker = t => { const src = actx.createBufferSource(), hp = actx.createBiquadFilter(), g = actx.createGain(); src.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 6500; g.gain.value = .22; src.connect(hp).connect(g).connect(master); src.start(t); nodes.push(src); };
    let t = t0;
    for (const [f, d] of tune) { bell(f, t, d); t += d * beat; }
    const total = t - t0;
    for (let i = 0; i < bass.length; i++) bassNote(N[bass[i]], t0 + i * 4 * beat, 4 * beat * .9);
    for (let b = 0; b < total / beat * 2; b++) shaker(t0 + b * beat / 2);
    const end = setTimeout(() => { music = null; }, total * 1000 + 800);
    music = { stop() { clearTimeout(end); const now = actx.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(0, now + .25); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch {} }), 300); } };
  } catch {}
}

// ---------- original short tunes for the other themes ----------
const NOTE = n => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (m[3] - 4) * 12; return 440 * Math.pow(2, i / 12); };
const TUNES = {
  pop: { beat: .22, inst: 'pluck', drums: 'pop', notes: 'E5 1,G5 1,A5 1,G5 1,E5 1,D5 1,C5 1,D5 1,E5 1,E5 1,G5 1,E5 1,D5 1,C5 1,D5 2,C5 1,D5 1,E5 1,G5 1,A5 2,G5 2,E5 1,D5 1,C5 4' },
  maqam: { beat: .3, inst: 'oud', drums: 'darbuka', notes: 'D4 1,Eb4 1,F#4 1,G4 2,A4 1,Bb4 1,A4 2,G4 1,F#4 1,G4 2,F#4 1,Eb4 1,D4 3,A4 1,Bb4 1,C5 1,Bb4 1,A4 2,G4 1,F#4 1,Eb4 1,D4 4' },
  love: { beat: .3, inst: 'harp', notes: 'A4 1,C#5 1,E5 1,A5 2,G#5 1,E5 1,F#5 3,D5 1,F#5 1,A5 1,B5 2,A5 1,F#5 1,E5 3,C#5 1,E5 1,A5 1,G#5 1,F#5 1,E5 1,A4 4' },
  eid: { beat: .24, inst: 'bell', drums: 'darbuka', notes: 'G4 1,G4 1,A4 1,Bb4 1,A4 1,G4 1,F#4 1,G4 2,D5 1,C5 1,Bb4 1,A4 1,G4 2,Bb4 1,C5 1,D5 2,Eb5 1,D5 1,C5 1,Bb4 1,A4 1,G4 4' },
  fanfare: { beat: .26, inst: 'brass', drums: 'march', notes: 'G4 1,C5 1,E5 1,G5 2,E5 1,G5 1,C6 3,A5 1,G5 1,F5 1,E5 1,D5 1,C5 1,D5 2,E5 1,F5 1,G5 2,C6 4' },
  happy: { beat: .2, inst: 'bell', drums: 'pop', notes: 'C5 1,E5 1,G5 1,E5 1,F5 1,A5 1,G5 2,E5 1,G5 1,C6 1,B5 1,A5 1,G5 2,F5 1,E5 1,D5 1,E5 1,C5 4' },
};
function intro(name) {
  if (!soundOn()) return 600;
  if (name === 'stadium') { stadium(true); return 1600; }
  SFX.magic(); return 700;
}
function stadium(short) {
  const a = ac(); if (!a) return;
  // referee whistle trill, crowd roar and air-horn blasts
  for (let i = 0; i < 3; i++) tone(2900, i * .16, .12, { vol: .05, f2: 3100 });
  noiseSweep(.2, short ? 1.4 : 3.2, 300, 1100, .12, .4);
  for (let i = 0; i < 3; i++) { tone(233, .5 + i * .45, .32, { type: 'sawtooth', vol: .05, filter: 1400 }); tone(294, .5 + i * .45, .32, { type: 'sawtooth', vol: .04, filter: 1400 }); }
}
export function playTune(name) {
  stopMusic(); if (!soundOn()) return;
  if (name === 'jingle') return jingleBells();
  const a = ac(); if (!a) return;
  const master = a.createGain(); master.connect(a.destination); routeTo = master;
  const stopper = () => { const n = a.currentTime; master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0, n + .2); };
  if (name === 'stadium') {
    stadium(false); routeTo = null;
    const t0 = a.currentTime; [0, .3, .6, .75, .9, 1.4, 1.7, 2.0, 2.15, 2.3].forEach(d => noiseSweep(d + .2, .07, 1800, 1200, .09, 2));
    const end = setTimeout(() => { music = null; }, 3600); music = { stop() { clearTimeout(end); stopper(); } }; void t0; return;
  }
  const T = TUNES[name] || TUNES.happy, seq = T.notes.split(',').map(x => { const [n, d] = x.split(' '); return [NOTE(n), +d]; });
  let at = .05; const timers = [];
  for (const [f, d] of seq) {
    const dur = d * T.beat;
    if (T.inst === 'bell') bellTone(f, at, .06, Math.max(.4, dur * 1.6));
    else if (T.inst === 'pluck') { tone(f, at, Math.max(.25, dur * 1.2), { type: 'triangle', vol: .08 }); tone(f * 2, at, .15, { vol: .02 }); }
    else if (T.inst === 'oud') { tone(f, at, Math.max(.35, dur * 1.3), { type: 'sawtooth', vol: .05, filter: 1800 }); tone(f * 1.003, at, .3, { type: 'triangle', vol: .04 }); }
    else if (T.inst === 'harp') { tone(f, at, Math.max(.6, dur * 2), { vol: .07 }); tone(f * 2, at, .4, { vol: .02 }); }
    else if (T.inst === 'brass') tone(f, at, Math.max(.2, dur * .95), { type: 'sawtooth', vol: .05, attack: .03, filter: 2200 });
    at += dur;
  }
  if (T.drums) for (let b = 0, t = .05; t < at; b++, t += T.beat * 2) {
    if (T.drums === 'darbuka') { if (b % 4 === 0) tone(110, t, .18, { vol: .14, f2: 70 }); else noiseSweep(t, .06, 3200, 2200, .06, 3); }
    else if (T.drums === 'march') { if (b % 2 === 0) tone(90, t, .16, { vol: .12, f2: 60 }); else noiseSweep(t, .08, 2400, 1600, .05, 1.5); }
    else { if (b % 2 === 0) tone(80, t, .14, { vol: .13, f2: 50 }); else noiseSweep(t, .07, 2600, 1800, .05, 1.2); }
  }
  routeTo = null;
  const end = setTimeout(() => { music = null; }, at * 1000 + 600);
  music = { stop() { clearTimeout(end); stopper(); } };
}

export function sleigh({ first = 2500, every = [24000, 50000], when = () => true } = {}) {
  const xmas = theme().flyer === 'sleigh';
  const s = el('button', 'fx-sleigh fx-fly-' + theme().flyer); s.type = 'button'; s.setAttribute('aria-label', xmas ? 'زلاجة بابا نويل — اضغط عليها' : 'اضغط عليّ');
  s.innerHTML = `<span class="sl-in">${xmas ? SLEIGH_SVG : flyerSVG(theme().flyer)}</span>`;
  document.body.append(s);
  let tmo, anim = null, trail = null, busy = false;
  const schedule = () => { clearTimeout(tmo); tmo = setTimeout(fly, every[0] + Math.random() * (every[1] - every[0])); };
  const fly = () => {
    if (!festiveOn() || document.hidden || anim || !when()) return schedule();
    const W = innerWidth, H = innerHeight, sw = Math.min(230, W * .5), ltr = Math.random() < .5;
    s.style.setProperty('--sw', sw + 'px');
    const x0 = ltr ? -sw - 20 : W + 20, x1 = ltr ? W + 20 : -sw - 20;
    const ys = Array.from({ length: 6 }, () => H * (.08 + Math.random() * .7));
    const frames = ys.map((y, i) => {
      const p = i / (ys.length - 1), x = x0 + (x1 - x0) * p;
      const tilt = i < ys.length - 1 ? Math.max(-14, Math.min(14, (ys[i + 1] - y) / 14)) : 0;
      return { transform: `translate(${x}px, ${y}px) rotate(${ltr ? tilt : -tilt}deg) scaleX(${ltr ? 1 : -1})`, offset: p };
    });
    s.classList.add('go');
    anim = s.animate(frames, { duration: Math.max(9000, W * 9), easing: 'linear' });
    trail = setInterval(() => {
      if (!busy && !music && !when()) { anim.cancel(); clearInterval(trail); s.classList.remove('go'); anim = null; schedule(); return; }
      const r = s.getBoundingClientRect(); if (!r.width) return;
      const p = el('span', 'fx-p', Math.random() < .5 ? '✦' : '✧');
      const x = ltr ? r.left + 10 : r.right - 10;
      p.style.cssText = `left:${x}px;top:${r.top + r.height * .75}px;color:${COLORS[Math.floor(Math.random() * 3) + 1]};font-size:${8 + Math.random() * 8}px`;
      document.body.append(p);
      p.animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: `translate(-50%, calc(-50% + ${20 + Math.random() * 30}px)) scale(.3)` }], { duration: 1100 }).onfinish = () => p.remove();
    }, 90);
    anim.onfinish = () => { clearInterval(trail); s.classList.remove('go'); anim = null; schedule(); };
  };
  s.addEventListener('click', e => {
    if (music) { stopMusic(); return; }
    if (busy) return; busy = true;
    const t = el('span', 'fx-ho', theme().say); t.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`; document.body.append(t); setTimeout(() => t.remove(), 2200);
    burst(e.clientX, e.clientY, 26);
    anim?.pause(); s.classList.add('hohoho');
    const wait = xmas ? hoHoHo() : intro(theme().music);
    setTimeout(() => {
      s.classList.remove('hohoho'); anim?.play(); busy = false;
      playTune(theme().music);
      const n = el('span', 'fx-ho fx-music', xmas ? '🎶 Jingle Bells — اضغط على الزلاجة لإيقافها' : '🎶 اضغط مرة أخرى لإيقاف النغمة'); n.style.cssText = `left:${innerWidth / 2}px;top:${innerHeight - 40}px`; document.body.append(n); setTimeout(() => n.remove(), 3500);
    }, wait);
  });
  tmo = setTimeout(fly, first);
  return s;
}

// ---------- sound settings ----------
const SKEY = 'bcm.sound';
const sstore = { get() { try { return localStorage.getItem(SKEY); } catch { return null; } }, set(v) { try { localStorage.setItem(SKEY, v); } catch {} } };
export const soundOn = () => (sstore.get() ?? 'on') === 'on';
let routeTo = null;
const ac = () => { try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } };
function tone(f, at, dur, { type = 'sine', vol = .08, attack = .006, f2 = null, filter = null } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let node = o.connect(g);
  if (filter) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; node = node.connect(fl); }
  node.connect(routeTo || a.destination); o.start(t); o.stop(t + dur + .05);
}
function bellTone(f, at, vol = .07, dur = .9) { for (const [m, v, d] of [[1, 1, 1], [2.76, .4, .55], [5.4, .18, .3]]) tone(f * m, at, dur * d, { vol: vol * v }); }
function noiseSweep(at, dur, from, to, vol = .05, q = 1.2) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at, len = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
  const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.value = vol; src.connect(bp).connect(g).connect(routeTo || a.destination); src.start(t);
}
// a small palette of interface sounds; each window type gets its own
export const SFX = {
  open: () => { bellTone(1318.5, 0, .05); bellTone(1975.5, .07, .045); },
  close: () => { bellTone(1567.98, 0, .035, .5); bellTone(1046.5, .06, .03, .5); },
  booking: () => [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bellTone(f, i * .07, .045)),
  money: () => { tone(988, 0, .08, { type: 'square', vol: .035, filter: 3500 }); tone(1319, .07, .38, { type: 'square', vol: .035, filter: 3500 }); },
  danger: () => { tone(330, 0, .22, { type: 'triangle', vol: .09 }); tone(262, .14, .32, { type: 'triangle', vol: .09 }); },
  paper: () => { noiseSweep(0, .22, 900, 3800, .07); noiseSweep(.12, .18, 2600, 1200, .04); },
  magic: () => [2093, 2637, 3136, 3951, 4186].forEach((f, i) => tone(f, i * .045, .35, { vol: .025 })),
  swap: () => { tone(520, 0, .18, { type: 'triangle', vol: .06, f2: 880 }); tone(880, .16, .18, { type: 'triangle', vol: .06, f2: 520 }); },
  success: () => { bellTone(1568, 0, .05); bellTone(2093, .09, .05); noiseSweep(0, .25, 6000, 9000, .03, 4); },
  error: () => { tone(196, 0, .16, { type: 'triangle', vol: .08 }); tone(185, .12, .22, { type: 'triangle', vol: .08 }); },
  nav: () => noiseSweep(0, .18, 400, 1600, .035, .8),
  pick: (hi = true) => tone(hi ? 1174.7 : 784, 0, .16, { type: 'triangle', vol: .06 }),
  click: () => tone(1800, 0, .035, { type: 'sine', vol: .02 }),
};
export function sfx(name, ...args) { if (!soundOn()) return; try { SFX[name]?.(...args); } catch {} }
function soundForTitle(t) {
  if (/المساعد/.test(t)) return 'magic';
  if (/تبديل/.test(t)) return 'swap';
  if (/حذف|لا يمكن|إلغاء الحجز/.test(t)) return 'danger';
  if (/دفعة|تسديد|استرجاع|تصحيح|أقساط/.test(t)) return 'money';
  if (/حجز|مساحة|كشك جديد/.test(t)) return 'booking';
  if (/عقد|تقرير|تصدير|استيراد|قيد|يومية|تاريخ|الخريطة/.test(t)) return 'paper';
  return 'open';
}

// ---------- rainbow pointer trail ----------
let trail = null;
// each occasion has its own pointer trail
const TRAIL_OF = { christmas: 'snow', spring: 'rainbow', concert: 'notes', evening: 'notes', valentine: 'hearts', eid_adha: 'eid', eid_fitr: 'eid',
  national: 'flag', classico: 'ball', worldcup: 'ball', gulf: 'ball', iraq_match: 'ball', summer: 'summer', general: 'confetti' };
export const trailKind = () => TRAIL_OF[themeId()] || 'confetti';
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const FLAG = ['#ce1126', '#ffffff', '#111111', '#007a3d'];
// particle factories: x,y → particle {vx, vy, g (gravity), life, r, draw(ctx,p,age)}
const PART = {
  snow: (x, y) => ({ x: x + rnd(-6, 6), y: y + rnd(-4, 4), vx: rnd(-.5, .5), vy: rnd(.5, 1.3), g: .012, life: rnd(1400, 2200), r: rnd(5, 12), rot: rnd(0, 6.28), vr: rnd(-.04, .04),
    draw(c, p, k) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = k; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, p.r / 7); c.lineCap = 'round'; c.shadowColor = 'rgba(160,210,255,.9)'; c.shadowBlur = 6;
      for (let j = 0; j < 6; j++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -p.r); c.moveTo(0, -p.r * .55); c.lineTo(p.r * .28, -p.r * .78); c.moveTo(0, -p.r * .55); c.lineTo(-p.r * .28, -p.r * .78); c.stroke(); }
      c.restore(); } }),
  rainbow: (x, y, hue) => ({ x, y, vx: rnd(-.6, .6), vy: rnd(.3, 1.1), g: 0, life: 900, r: rnd(2, 4.5), h: hue,
    draw(c, p, k, age) { c.fillStyle = `hsla(${(p.h + age * 120) % 360},95%,60%,${k})`; const r = p.r * (1 - age * .5); c.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? r * .4 : r * 1.6; c.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); } c.closePath(); c.fill(); } }),
  notes: (x, y) => glyph(x, y, ['♪', '♫', '♬', '♩'], theme().party, -1),
  hearts: (x, y) => glyph(x, y, ['❤︎', '♥'], ['#ff2d6f', '#ff7aa8', '#e0115f', '#ffc2d6'], -1),
  eid: (x, y) => glyph(x, y, ['✦', '☾', '★', '✧'], ['#f3d27a', '#e5b94a', '#fff4c9'], .35),
  flag: (x, y) => glyph(x, y, ['★', '✦'], FLAG.slice(0, 1).concat(['#007a3d', '#ffffff']), .5),
  ball: (x, y) => ({ x, y, vx: rnd(-1.6, 1.6), vy: rnd(-2.6, -1), g: .14, life: 1500, r: rnd(7, 12), rot: 0, vr: rnd(-.15, .15), bounce: true,
    draw(c, p, k) { c.save(); c.globalAlpha = k; c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(0, 0, p.r, 0, 6.28); c.fill(); c.stroke(); c.fillStyle = '#222';
      const pent = (cx, cy, rr) => { c.beginPath(); for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + j * 2 * Math.PI / 5; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.closePath(); c.fill(); };
      pent(0, 0, p.r * .38); for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + j * 2 * Math.PI / 5; pent(Math.cos(a) * p.r * .86, Math.sin(a) * p.r * .86, p.r * .25); }
      c.restore(); } }),
  summer: (x, y) => ({ x, y, vx: rnd(-.4, .4), vy: rnd(-1.4, -.6), g: -.004, life: rnd(1100, 1700), r: rnd(4, 10),
    draw(c, p, k) { c.globalAlpha = k; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.4; c.fillStyle = 'rgba(120,210,255,.18)'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 6.28); c.fill(); } }),
  confetti: (x, y) => ({ x, y, vx: rnd(-1.4, 1.4), vy: rnd(-1.8, -.4), g: .08, life: 1300, r: rnd(3, 6), rot: rnd(0, 6), vr: rnd(-.25, .25), col: pick(theme().party),
    draw(c, p, k) { c.save(); c.globalAlpha = k; c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.r, -p.r * .4, p.r * 2, p.r * .8); c.restore(); } }),
};
function glyph(x, y, chars, colors, dir) {
  return { x: x + rnd(-5, 5), y: y + rnd(-5, 5), vx: rnd(-.6, .6), vy: dir < 0 ? rnd(-1.4, -.6) : rnd(.2, .9) * dir, g: dir < 0 ? -.006 : .004, life: rnd(1000, 1600), r: rnd(12, 20),
    ch: pick(chars), col: pick(colors), rot: rnd(-.4, .4), vr: rnd(-.02, .02),
    draw(c, p, k, age) { c.save(); c.globalAlpha = k; c.translate(p.x, p.y); c.rotate(p.rot); const sc = .6 + Math.min(1, age * 4) * .4; c.scale(sc, sc);
      c.font = `700 ${p.r}px "Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 4; c.fillStyle = p.col; c.fillText(p.ch, 0, 0); c.restore(); } };
}
// colour of the ribbon that follows the pointer
function lineStyle(kind, i, k, hue) {
  const C = theme().c;
  switch (kind) {
    case 'snow': return [`rgba(235,246,255,${k * .7})`, 1 + k * 5, 'rgba(150,205,255,.9)'];
    case 'rainbow': return [`hsla(${(hue + i * 9) % 360},95%,58%,${k * .85})`, 1.5 + k * 7];
    case 'flag': return [hexA(FLAG[Math.floor(i / 3) % 4], k * .85), 2 + k * 6];
    case 'ball': return [hexA(i % 6 < 3 ? '#2e9e4f' : '#ffffff', k * .8), 1.5 + k * 6];
    case 'summer': return [`hsla(${35 + (i * 4) % 25},100%,58%,${k * .8})`, 1.5 + k * 7];
    case 'eid': return [hexA(C.gold, k * .8), 1 + k * 5, C.goldHi || C.gold];
    case 'hearts': return [`hsla(${335 + (i * 3) % 20},90%,65%,${k * .8})`, 1.5 + k * 6];
    default: return [hexA(theme().party[i % theme().party.length], k * .8), 1.5 + k * 6];
  }
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

function startTrail() {
  if (trail || reduced || !festiveOn()) return;
  const kind = trailKind(), make = PART[kind] || PART.confetti;
  const c = el('canvas', 'fx-trail'); c.setAttribute('aria-hidden', 'true'); c.dataset.kind = kind; document.body.append(c);
  const ctx = c.getContext('2d');
  let W, H, pts = [], parts = [], raf = 0, hue = 0, dist = 0;
  const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  const LIFE = 520, every = { snow: 10, ball: 46, notes: 26, hearts: 24, eid: 18, flag: 20, summer: 22, confetti: 16, rainbow: 14 }[kind] || 20;
  const move = e => {
    if (document.documentElement.classList.contains('fx-off')) return;
    const now = performance.now(), last = pts[pts.length - 1];
    pts.push({ x: e.clientX, y: e.clientY, t: now });
    if (last) dist += Math.hypot(e.clientX - last.x, e.clientY - last.y);
    while (dist > every && parts.length < 140) { dist -= every; const p = make(e.clientX, e.clientY, hue); p.t = now; parts.push(p); }
    if (!raf) raf = requestAnimationFrame(draw);
  };
  const draw = () => {
    const now = performance.now();
    pts = pts.filter(p => now - p.t < LIFE); parts = parts.filter(p => now - p.t < p.life);
    ctx.clearRect(0, 0, W, H);
    hue = (hue + 2.2) % 360;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], k = 1 - (now - b.t) / LIFE;
      const [col, w, glow] = lineStyle(kind, i, k, hue);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.shadowBlur = glow ? 8 : 0; ctx.shadowColor = glow || 'transparent';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (const p of parts) {
      const age = (now - p.t) / p.life;
      p.vy += p.g; p.x += p.vx; p.y += p.vy; if (p.vr) p.rot += p.vr;
      if (kind === 'snow') p.x += Math.sin((now - p.t) / 260 + p.r) * .35;
      if (p.bounce && p.y > H - p.r) { p.y = H - p.r; p.vy *= -.6; }
      p.draw(ctx, p, Math.max(0, 1 - age), age);
    }
    ctx.globalAlpha = 1;
    raf = pts.length || parts.length ? requestAnimationFrame(draw) : 0;
  };
  size(); addEventListener('resize', size); addEventListener('pointermove', move, { passive: true });
  trail = { stop() { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', move); c.remove(); trail = null; } };
}

// ---------- interactive polish: sounds for windows, ripples, page transitions, map picks ----------
let interactions = false;
function startInteractions() {
  if (interactions) return; interactions = true;
  // windows (modals) and messages (toasts)
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList.contains('scrim')) sfx(soundForTitle(n.querySelector('.modal header h2')?.textContent || ''));
        else if (n.classList.contains('toast')) {
          if (n.classList.contains('err')) sfx('error');
          else if (/تم|✓|أُعيد|نجاح/.test(n.textContent)) sfx('success');
        }
      }
      for (const n of m.removedNodes) if (n instanceof HTMLElement && n.classList.contains('scrim')) sfx('close');
    }
  }).observe(document.body, { childList: true, subtree: true });
  // button ripple
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest?.('.btn, .tabs button, .seg button, .fx-toggle');
    if (!b || reduced) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6;
    const s = el('span', 'fx-ripple'); s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden'; b.append(s); setTimeout(() => s.remove(), 650);
    if (b.matches('.tabs button, .seg button')) sfx('click');
  }, { passive: true });
  // page change
  addEventListener('hashchange', () => {
    sfx('nav');
    const v = document.getElementById('view'); if (!v || reduced) return;
    v.classList.remove('fx-enter'); void v.offsetWidth; v.classList.add('fx-enter');
  });
  // picking a kiosk on any map
  document.addEventListener('pointerup', e => {
    const k = e.target.closest?.('.mapbox .k'); if (!k) return;
    const fill = k.querySelector('.shape')?.getAttribute('fill') || '';
    sfx('pick', !/c0392b|e67e22|9e9e9e/i.test(fill));
    if (festiveOn() && !reduced) burst(e.clientX, e.clientY, 10);
  });
  // stat cards follow the pointer with a soft tilt
  document.addEventListener('pointermove', e => {
    const card = e.target.closest?.('.stat, .fx-cell'); if (!card || reduced) return;
    const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = `perspective(600px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-3px)`;
    card.style.setProperty('--mx', (x + .5) * 100 + '%'); card.style.setProperty('--my', (y + .5) * 100 + '%');
    card.onpointerleave = () => { card.style.transform = ''; };
  }, { passive: true });
}

// ---------- toggles ----------
export function toggleButton(cls = '') {
  const b = el('button', 'fx-toggle ' + cls); b.type = 'button';
  const paint = () => { const on = festiveOn(); b.textContent = on ? '❄ الزينة: تعمل' : '❄ الزينة: متوقفة'; b.setAttribute('aria-pressed', on); document.documentElement.classList.toggle('fx-off', !on); };
  b.onclick = () => { store.set(festiveOn() ? 'off' : 'on'); paint(); if (festiveOn()) { startSnow(document.documentElement.dataset.snow || 40); startTrail(); celebrate(); } else { snow?.stop(); trail?.stop(); stopMusic(); try { speechSynthesis.cancel(); } catch {} } };
  paint();
  return b;
}
export function soundButton(cls = '') {
  const b = el('button', 'fx-toggle ' + cls); b.type = 'button';
  const paint = () => { const on = soundOn(); b.textContent = on ? '🔔 الأصوات: تعمل' : '🔕 الأصوات: متوقفة'; b.setAttribute('aria-pressed', on); };
  b.onclick = () => { sstore.set(soundOn() ? 'off' : 'on'); paint(); if (soundOn()) sfx('success'); else { stopMusic(); try { speechSynthesis.cancel(); } catch {} } };
  paint();
  return b;
}

export function initFestive({ density = 40 } = {}) {
  document.documentElement.dataset.snow = density;
  document.documentElement.classList.toggle('fx-off', !festiveOn());
  startSnow(density);
  startTrail();
  startInteractions();
}
