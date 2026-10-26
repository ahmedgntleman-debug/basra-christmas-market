// Interactive SVG map: the official map image as background, kiosks as overlays.
// Kiosk geometry is relative to the image (cx, cy, w, h in 0..1; rot in degrees),
// so overlays stay aligned at any zoom and survive replacing the image with a sharper copy.

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };

export class MapView {
  constructor(container, opts = {}) {
    this.c = container;
    this.opts = opts;
    this.mode = 'view';            // view | edit | add
    this.kiosks = [];
    this.statuses = new Map();
    this.colors = {};
    this.selected = new Set();
    this.W = 1109; this.H = 1600;
    this.vb = { x: 0, y: 0, w: this.W, h: this.H };
    this.pointers = new Map();

    this.svg = s('svg', { role: 'img', 'aria-label': 'خريطة الأكشاك' });
    this.img = s('image', { x: 0, y: 0, preserveAspectRatio: 'none' });
    this.gK = s('g');
    this.gEdit = s('g');
    this.patId = 'bcm-part-' + Math.random().toString(36).slice(2, 8);
    const defs = s('defs');
    this.pat = s('pattern', { id: this.patId, patternUnits: 'userSpaceOnUse', width: 6, height: 6, patternTransform: 'rotate(45)' });
    this.patBg = s('rect', { width: 6, height: 6 });
    this.patFg = s('rect', { width: 3, height: 6 });
    this.pat.append(this.patBg, this.patFg); defs.append(this.pat);
    this.svg.append(defs, this.img, this.gK, this.gEdit);
    container.append(this.svg);

    const ctl = document.createElement('div');
    ctl.className = 'mapctl';
    ctl.innerHTML = '<button type="button" data-z="in" aria-label="تكبير">+</button><button type="button" data-z="out" aria-label="تصغير">−</button><button type="button" data-z="fit" aria-label="عرض الكل" style="font-size:15px">⤢</button>';
    ctl.addEventListener('click', e => {
      const z = e.target.closest('button')?.dataset.z;
      if (z === 'in') this.zoomBy(1 / 1.5); else if (z === 'out') this.zoomBy(1.5); else if (z === 'fit') this.fit();
    });
    container.append(ctl);

    this.svg.addEventListener('pointerdown', e => this.down(e));
    this.svg.addEventListener('pointermove', e => this.move(e));
    this.svg.addEventListener('pointerup', e => this.up(e));
    this.svg.addEventListener('pointercancel', e => this.up(e, true));
    this.svg.addEventListener('wheel', e => {
      e.preventDefault();
      const p = this.pt(e);
      this.zoomBy(Math.pow(1.0018, e.deltaY), p.x, p.y);
    }, { passive: false });
    new ResizeObserver(() => this.applyVB()).observe(container);
  }

  // ---------- data ----------
  setMap(url, w, h) {
    this.W = w || 1109; this.H = h || 1600;
    this.img.setAttribute('href', url);
    this.img.setAttribute('width', this.W);
    this.img.setAttribute('height', this.H);
    this.render();
  }
  setKiosks(list) { this.kiosks = list; this.render(); }
  setStatuses(map) { this.statuses = map; this.paint(); }
  setColors(c) { this.colors = c || {}; this.paint(); }
  setMode(m) { this.mode = m; this.svg.style.cursor = m === 'add' ? 'crosshair' : ''; this.drawEditHandles(); }
  setSelected(ids) { this.selected = new Set(ids || []); this.paintSel(); this.drawEditHandles(); }
  setHighlight(ids) {
    const set = ids ? new Set(ids) : null;
    for (const g of this.gK.children) {
      g.classList.toggle('dim', !!set && !set.has(g.dataset.id));
      g.classList.toggle('hit', !!set && set.has(g.dataset.id));
    }
  }

  px(k) { const g = k.geom; return { cx: g.cx * this.W, cy: g.cy * this.H, w: g.w * this.W, h: g.h * this.H, rot: g.rot || 0 }; }

  render() {
    this.gK.textContent = '';
    for (const k of this.kiosks) this.gK.append(this.makeK(k));
    this.paint(); this.paintSel(); this.drawEditHandles();
  }
  makeK(k) {
    const g = s('g', { class: 'k' + (k.needs_verify ? ' verify' : ''), 'data-id': k.id, tabindex: 0, role: 'button', 'aria-label': 'كشك ' + k.code });
    this.shapeInto(g, k);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.opts.onSelect?.(k, e); } });
    return g;
  }
  shapeInto(g, k) {
    g.textContent = '';
    const p = this.px(k);
    g.setAttribute('transform', `translate(${p.cx} ${p.cy}) rotate(${p.rot})`);
    let shape;
    if (k.shape === 'triangle') shape = s('polygon', { points: `0,${-p.h / 2} ${p.w / 2},${p.h / 2} ${-p.w / 2},${p.h / 2}` });
    else if (k.shape === 'ellipse') shape = s('ellipse', { rx: p.w / 2, ry: p.h / 2 });
    else shape = s('rect', { x: -p.w / 2, y: -p.h / 2, width: p.w, height: p.h, rx: Math.min(p.w, p.h) * 0.08 });
    shape.setAttribute('class', 'shape');
    const fs = Math.max(4, Math.min(Math.min(p.w, p.h) * 0.52, 14));
    const t = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs });
    if (p.h > p.w * 1.3) t.setAttribute('transform', 'rotate(90)');
    if (k.shape === 'triangle') t.setAttribute('y', p.h * 0.12);
    t.textContent = k.code;
    const title = s('title'); title.textContent = k.code;
    g.append(shape, t, title);
  }
  paint() {
    this.patBg.setAttribute('fill', this.colors.available || '#2e8b57');
    this.patFg.setAttribute('fill', this.colors.reserved || '#c0392b');
    for (const g of this.gK.children) {
      const st = this.statuses.get(g.dataset.id) || 'available';
      const col = st === 'partial' ? (this.colors.reserved || '#c0392b') : (this.colors[st] || '#888');
      const sh = g.querySelector('.shape');
      sh.setAttribute('fill', st === 'partial' ? `url(#${this.patId})` : col);
      sh.setAttribute('stroke', shade(col));
      g.dataset.status = st;
    }
  }
  paintSel() { for (const g of this.gK.children) g.classList.toggle('sel', this.selected.has(g.dataset.id)); }

  // ---------- view box ----------
  applyVB() {
    const r = this.c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // keep aspect ratio of the container
    const ar = r.width / r.height;
    const cx = this.vb.x + this.vb.w / 2, cy = this.vb.y + this.vb.h / 2;
    let w = this.vb.w, h = this.vb.h;
    if (w / h > ar) h = w / ar; else w = h * ar;
    this.vb = { x: cx - w / 2, y: cy - h / 2, w, h };
    this.svg.setAttribute('viewBox', `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`);
    this.drawEditHandles();
  }
  fit(ids) {
    const list = ids ? this.kiosks.filter(k => ids.includes(k.id)) : this.kiosks;
    if (!list.length) { this.vb = { x: 0, y: 0, w: this.W, h: this.H }; return this.applyVB(); }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of list) {
      const p = this.px(k), r = Math.max(p.w, p.h) / 2;
      x0 = Math.min(x0, p.cx - r); y0 = Math.min(y0, p.cy - r); x1 = Math.max(x1, p.cx + r); y1 = Math.max(y1, p.cy + r);
    }
    const pad = ids ? 70 : 30;
    this.vb = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
    this.applyVB();
  }
  focus(id) { this.fit([id]); }
  zoomBy(f, ox, oy) {
    const minW = 40, maxW = Math.max(this.W, this.H) * 2.2;
    let w = this.vb.w * f;
    if (w < minW) f = minW / this.vb.w; else if (w > maxW) f = maxW / this.vb.w;
    ox ??= this.vb.x + this.vb.w / 2; oy ??= this.vb.y + this.vb.h / 2;
    this.vb = { x: ox - (ox - this.vb.x) * f, y: oy - (oy - this.vb.y) * f, w: this.vb.w * f, h: this.vb.h * f };
    this.applyVB();
  }
  pt(e) {
    const m = this.svg.getScreenCTM().inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }

  // ---------- pointer handling ----------
  down(e) {
    this.svg.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const handle = e.target.closest?.('[data-handle]');
    const kEl = e.target.closest?.('.k');
    this.moved = 0;
    if (this.pointers.size === 2) { this.drag = { type: 'pinch', d: this.pinchDist(), vb: { ...this.vb } }; return; }
    const p = this.pt(e);
    if (this.mode === 'edit' && handle) {
      const k = this.kiosks.find(x => x.id === handle.dataset.id);
      this.drag = { type: handle.dataset.handle, k, start: p, g0: { ...k.geom } };
    } else if (this.mode === 'edit' && kEl && this.selected.has(kEl.dataset.id)) {
      const k = this.kiosks.find(x => x.id === kEl.dataset.id);
      this.drag = { type: 'move', k, start: p, g0: { ...k.geom }, kEl };
    } else {
      this.drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vb: { ...this.vb }, kEl };
      this.svg.classList.add('panning');
    }
  }
  pinchDist() { const [a, b] = [...this.pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }
  move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId);
    this.moved += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = this.drag; if (!d) return;
    if (d.type === 'pinch' && this.pointers.size === 2) {
      const f = d.d / this.pinchDist();
      const [a, b] = [...this.pointers.values()];
      const m = this.svg.getScreenCTM().inverse();
      const mid = new DOMPoint((a.x + b.x) / 2, (a.y + b.y) / 2).matrixTransform(m);
      this.vb = { ...d.vb };
      this.zoomBy(f, mid.x, mid.y);
      return;
    }
    if (d.type === 'pan') {
      const r = this.c.getBoundingClientRect();
      const sc = this.vb.w / r.width;
      this.vb = { ...this.vb, x: d.vb.x - (e.clientX - d.sx) * sc, y: d.vb.y - (e.clientY - d.sy) * sc };
      this.svg.setAttribute('viewBox', `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`);
      return;
    }
    const p = this.pt(e), k = d.k, g = k.geom;
    if (d.type === 'move') {
      g.cx = d.g0.cx + (p.x - d.start.x) / this.W;
      g.cy = d.g0.cy + (p.y - d.start.y) / this.H;
    } else if (d.type === 'size') {
      const c = this.px({ geom: d.g0 });
      const t = -c.rot * Math.PI / 180, dx = p.x - c.cx, dy = p.y - c.cy;
      const lx = dx * Math.cos(t) - dy * Math.sin(t), ly = dx * Math.sin(t) + dy * Math.cos(t);
      g.w = Math.max(4, Math.abs(lx) * 2) / this.W;
      g.h = Math.max(4, Math.abs(ly) * 2) / this.H;
    } else if (d.type === 'rot') {
      const c = this.px({ geom: d.g0 });
      let a = Math.atan2(p.y - c.cy, p.x - c.cx) * 180 / Math.PI + 90;
      if (!e.shiftKey) a = Math.round(a);
      while (a >= 180) a -= 360; while (a < -180) a += 360;
      g.rot = a;
    }
    const el = this.gK.querySelector(`[data-id="${k.id}"]`);
    if (el) this.shapeInto(el, k);
    this.paint(); this.drawEditHandles();
  }
  up(e, cancelled) {
    const d = this.drag;
    this.pointers.delete(e.pointerId);
    this.svg.classList.remove('panning');
    if (this.pointers.size) { if (d?.type === 'pinch') this.drag = null; return; }
    this.drag = null;
    if (!d || cancelled) return;
    if ((d.type === 'move' || d.type === 'size' || d.type === 'rot') && this.moved > 2) {
      this.opts.onGeom?.(d.k, { ...d.k.geom });
      return;
    }
    if (this.moved < 7) {
      const kEl = d.kEl || e.target.closest?.('.k');
      if (this.mode === 'add' && !kEl) {
        const p = this.pt(e);
        this.opts.onAddAt?.(p.x / this.W, p.y / this.H);
      } else if (kEl) {
        const k = this.kiosks.find(x => x.id === kEl.dataset.id);
        if (k) this.opts.onSelect?.(k, e);
      } else this.opts.onBackground?.();
    }
  }

  drawEditHandles() {
    this.gEdit.textContent = '';
    if (this.mode !== 'edit' || this.selected.size !== 1) return;
    const k = this.kiosks.find(x => this.selected.has(x.id)); if (!k) return;
    const p = this.px(k), t = p.rot * Math.PI / 180;
    const r = Math.max(3, this.vb.w / 140);
    const at = (lx, ly) => ({ x: p.cx + lx * Math.cos(t) - ly * Math.sin(t), y: p.cy + lx * Math.sin(t) + ly * Math.cos(t) });
    const c1 = at(p.w / 2, p.h / 2);
    const c2 = at(0, -p.h / 2 - r * 4);
    const top = at(0, -p.h / 2);
    this.gEdit.append(
      s('line', { x1: top.x, y1: top.y, x2: c2.x, y2: c2.y, stroke: '#b8913a', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }),
      s('circle', { class: 'handle', cx: c1.x, cy: c1.y, r, 'data-handle': 'size', 'data-id': k.id }),
      s('circle', { class: 'rothandle', cx: c2.x, cy: c2.y, r, 'data-handle': 'rot', 'data-id': k.id }),
    );
  }
}

function shade(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  if (isNaN(n)) return '#333';
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, f = 0.62;
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
