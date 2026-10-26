// Festive layer — snow, string lights, swinging baubles, countdown, sleigh, bursts and bells.
// Everything is decorative: pointer-events stay off except on the decorations themselves,
// and the whole layer can be switched off (remembered per browser) or is calmed by reduced-motion.
const KEY = 'bcm.festive';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch {} } };
export const festiveOn = () => (store.get() ?? (reduced ? 'off' : 'on')) === 'on';
const COLORS = ['#d8333a', '#e8b84a', '#3f9a5a', '#fff4d6', '#c2185b', '#4fa3d9'];
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

// ---------- sound: a small synthesized sleigh bell ----------
let actx = null;
export function jingle(pitch = 0) {
  if (!festiveOn()) return;
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
  const glyphs = ['✦', '❄', '★', '●', '✧'];
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
  if (snow || !festiveOn()) return;
  const c = el('canvas', 'fx-snow'); c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  let W, H, flakes = [], wind = 0, windT = 0, raf, mx = -1, my = -1;
  const make = top => ({ x: Math.random() * W, y: top ? -10 : Math.random() * H, r: .8 + Math.random() * 2.6, s: .35 + Math.random() * .9, o: .35 + Math.random() * .55, p: Math.random() * 6.28 });
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
      if (f.y > H + 6) Object.assign(f, make(true));
      if (f.x > W + 6) f.x = -6; else if (f.x < -6) f.x = W + 6;
      ctx.globalAlpha = f.o; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill();
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
    b.innerHTML = `<span class="fx-string"></span>${baubleSVG(i + (it.style || 0), it.size || 46)}`;
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
export function countdown(startISO, endISO) {
  const box = el('div', 'fx-count'); box.setAttribute('role', 'timer');
  const start = new Date(startISO + 'T00:00:00+03:00').getTime();
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
      setH('يفتتح المهرجان بعد');
      let t = Math.floor((start - now) / 1000);
      for (const [k, , s] of units) { const v = Math.floor(t / s); t -= v * s; const txt = String(v).padStart(k === 'd' ? 1 : 2, '0'); if (cells[k].textContent !== txt) { cells[k].textContent = txt; cells[k].classList.remove('tick'); void cells[k].offsetWidth; cells[k].classList.add('tick'); } }
      grid.hidden = false;
    } else if (now <= end) {
      const day = Math.floor((now - start) / 86400000) + 1, all = Math.round((end - start) / 86400000);
      setH(`🎄 المهرجان قائم الآن — اليوم ${day} من ${all}`); grid.hidden = true;
    } else { setH('شكراً لكم — نلقاكم في الموسم القادم ✨'); grid.hidden = true; }
  };
  upd(); const iv = setInterval(upd, 1000);
  box._stop = () => clearInterval(iv);
  return box;
}

// ---------- interactive tree ----------
export function tree(size = 120) {
  const b = el('button', 'fx-tree'); b.type = 'button'; b.setAttribute('aria-label', 'شجرة الميلاد — اضغط لإضاءتها');
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

// ---------- sleigh flying across a header ----------
export function sleigh(host) {
  const s = el('button', 'fx-sleigh'); s.type = 'button'; s.setAttribute('aria-label', 'زلاجة بابا نويل');
  s.innerHTML = `<svg viewBox="0 0 220 70" width="170" height="54" aria-hidden="true"><g fill="#f6e7c1">
<path d="M150 30c6-10 14-14 20-12l6-9 3 2-4 8c5 0 8 3 9 6l9-3 1 3-9 4c1 6-3 11-9 12l-4 10h-4l3-10h-14l-6 10h-4l5-11c-4-2-6-6-2-10z"/>
<path d="M178 9l4-7 2 1-3 6 5-3 1 2-7 4zM186 11l6-6 2 2-5 5 6-1 0 2-8 1z"/>
<path d="M60 26h44c4 0 6 3 5 7l-4 13H62c-8 0-12-8-2-20z"/><path d="M50 52h66c6 0 8-3 9-6h4c-1 7-5 10-13 10H48z"/>
<path d="M72 26l-2-10h12l2 10zM86 26l2-14h12l-2 14z"/><circle cx="92" cy="12" r="5"/></g>
<path d="M110 34 L150 34" stroke="#e8b84a" stroke-width="1.6"/><circle cx="182" cy="24" r="2" fill="#d8333a"/></svg>`;
  host.append(s);
  let tmo;
  const fly = () => { if (!festiveOn() || document.hidden) return schedule(); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); schedule(); };
  const schedule = () => { clearTimeout(tmo); tmo = setTimeout(fly, 26000 + Math.random() * 30000); };
  s.addEventListener('click', e => { const t = el('span', 'fx-ho', 'هو هو هو! 🎅'); t.style.cssText = `left:${e.clientX}px;top:${e.clientY}px`; document.body.append(t); setTimeout(() => t.remove(), 1600); celebrate(); });
  setTimeout(fly, 2500);
  return s;
}

// ---------- toggle ----------
export function toggleButton(cls = '') {
  const b = el('button', 'fx-toggle ' + cls); b.type = 'button';
  const paint = () => { const on = festiveOn(); b.textContent = on ? '❄ الزينة: تعمل' : '❄ الزينة: متوقفة'; b.setAttribute('aria-pressed', on); document.documentElement.classList.toggle('fx-off', !on); };
  b.onclick = () => { store.set(festiveOn() ? 'off' : 'on'); paint(); if (festiveOn()) { startSnow(document.documentElement.dataset.snow || 40); celebrate(); } else snow?.stop(); };
  paint();
  return b;
}

export function initFestive({ density = 40 } = {}) {
  document.documentElement.dataset.snow = density;
  document.documentElement.classList.toggle('fx-off', !festiveOn());
  startSnow(density);
}
