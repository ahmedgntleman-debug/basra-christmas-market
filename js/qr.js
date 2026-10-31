// QR codes: drawing (vendor/qrcode.js) and reading from the camera (BarcodeDetector or vendor/jsqr.js)
const loaded = {};
export function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('تعذر تحميل ' + src)); };
    document.head.append(s);
  });
}

// SVG markup of a QR code with rounded dots and themed eyes
export async function qrSVG(text, { size = 240, dark = '#111', light = '#fff', eye = dark, margin = 2 } = {}) {
  await loadScript('vendor/qrcode.js');
  const qr = window.qrcode(0, 'Q'); qr.addData(unescape(encodeURIComponent(text)), 'Byte'); qr.make();
  const n = qr.getModuleCount(), tot = n + margin * 2;
  const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  let dots = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!qr.isDark(r, c) || inEye(r, c)) continue;
    dots += `<rect x="${c + margin + .06}" y="${r + margin + .06}" width=".88" height=".88" rx=".3"/>`;
  }
  const eyeAt = (r, c) => `<rect x="${c + margin + .5}" y="${r + margin + .5}" width="6" height="6" rx="1.6" fill="none" stroke="${eye}" stroke-width="1"/><rect x="${c + margin + 2}" y="${r + margin + 2}" width="3" height="3" rx=".9" fill="${eye}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tot} ${tot}" width="${size}" height="${size}" shape-rendering="geometricPrecision"><rect width="${tot}" height="${tot}" rx="${margin * .8}" fill="${light}"/><g fill="${dark}">${dots}</g>${eyeAt(0, 0)}${eyeAt(0, n - 7)}${eyeAt(n - 7, 0)}</svg>`;
}

export function svgToPng(svg, size = 1024) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size); res(c.toDataURL('image/png')); };
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// Continuous camera scanning. Calls onCode(text) for each new code; returns stop()
export async function startScanner(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true; await video.play();
  let detector = null;
  try { if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new BarcodeDetector({ formats: ['qr_code'] }); } catch {}
  if (!detector) await loadScript('vendor/jsqr.js');
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  let stopped = false, last = '', lastAt = 0;
  const tick = async () => {
    if (stopped) return;
    try {
      if (video.readyState >= 2) {
        let text = null;
        if (detector) { const r = await detector.detect(video); text = r[0]?.rawValue || null; }
        else {
          const w = Math.min(640, video.videoWidth), hh = Math.round(video.videoHeight * w / video.videoWidth);
          cv.width = w; cv.height = hh; cx.drawImage(video, 0, 0, w, hh);
          text = window.jsQR(cx.getImageData(0, 0, w, hh).data, w, hh, { inversionAttempts: 'dontInvert' })?.data || null;
        }
        if (text && (text !== last || Date.now() - lastAt > 4000)) { last = text; lastAt = Date.now(); onCode(text); }
      }
    } catch {}
    setTimeout(tick, detector ? 200 : 260);
  };
  tick();
  return () => { stopped = true; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
}

// a ticket link or a typed code → token or code
export function parseTicket(text) {
  const s = String(text || '').trim();
  const m = /[?&]t=([0-9a-f-]{36})/i.exec(s) || /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(s);
  if (m) return { token: m[1].toLowerCase() };
  const code = s.toUpperCase().replace(/[^0-9A-F]/g, '');
  return code.length >= 6 ? { code: code.slice(0, 8) } : null;
}
export const ticketCode = token => String(token || '').replace(/-/g, '').slice(0, 8).toUpperCase();
export const ticketLink = token => new URL('ticket.html?t=' + token, location.href).href;
