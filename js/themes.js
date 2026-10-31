// Event themes: every project picks one. A theme sets the colours, the decorations
// (falling particles, string of lights/flags/lanterns, hanging ornaments, centre piece,
// the thing that flies across the screen), its sounds and its wording.
// All artwork here is original and drawn in code.

const R = (o) => Object.freeze(o);
export const THEMES = R({
  christmas: R({ label: 'مهرجان عيد الميلاد', group: 'festival', noun: 'المهرجان', unit: 'kiosk', icon: '🎄',
    c: { dark: '#16402a', dark2: '#1f5236', deep: '#0e2b1b', mid: '#2f6b45', primary: '#b3212a', hi: '#d8333a', lo: '#8c161d', gold: '#d4a73c', goldHi: '#f3d27a', bg: '#fbf6ef', onDark: '#e3dcc6' },
    party: ['#d8333a', '#e8b84a', '#3f9a5a', '#fff4d6', '#c2185b', '#4fa3d9'],
    particles: 'snow', garland: 'lights', hang: 'bauble', hero: 'tree', flyer: 'sleigh', scene: 'trees', motif: 'snow', music: 'jingle',
    say: 'هو هو هو! 🎅', countdown: 'يفتتح المهرجان بعد', greeting: 'عيد ميلاد مجيد وعام سعيد' }),
  concert: R({ label: 'حفلة غنائية', group: 'music', noun: 'الحفل', unit: 'table', icon: '🎤',
    c: { dark: '#1d1145', dark2: '#2e1a6b', deep: '#120a2e', mid: '#5b2bb5', primary: '#e3197d', hi: '#ff3d9a', lo: '#a30f5a', gold: '#22d3ee', goldHi: '#9ff3ff', bg: '#f7f5fd', onDark: '#d9d2f5' },
    party: ['#ff3d9a', '#22d3ee', '#a78bfa', '#facc15', '#ffffff', '#fb7185'],
    particles: 'notes', garland: 'lights', hang: 'star', hero: 'mic', flyer: 'note', scene: 'stage', motif: 'note', music: 'pop',
    say: 'يلّا نغنّي! 🎤', countdown: 'يبدأ الحفل بعد', greeting: 'سهرة ممتعة' }),
  evening: R({ label: 'أمسية غنائية', group: 'music', noun: 'الأمسية', unit: 'table', icon: '🎶',
    c: { dark: '#14213d', dark2: '#1f3157', deep: '#0b1426', mid: '#3a5585', primary: '#b07d1a', hi: '#d4a02a', lo: '#7d5810', gold: '#e5c77f', goldHi: '#f7e6b5', bg: '#f8f5ee', onDark: '#e2dccb' },
    party: ['#e5c77f', '#f7e6b5', '#ffffff', '#a7b8d8', '#d4a02a'],
    particles: 'stars', garland: 'lights', hang: 'star', hero: 'oud', flyer: 'note', scene: 'skyline', motif: 'star', music: 'maqam',
    say: 'طرب وسهرة جميلة 🎶', countdown: 'تبدأ الأمسية بعد', greeting: 'أمسية طربية سعيدة' }),
  valentine: R({ label: 'حفل عيد الحب', group: 'love', noun: 'الحفل', unit: 'table', icon: '❤️',
    c: { dark: '#5a0f2e', dark2: '#7a1a42', deep: '#3d0a1f', mid: '#b23a6b', primary: '#e0245e', hi: '#ff4d7e', lo: '#a3123f', gold: '#f7a8c0', goldHi: '#ffd6e3', bg: '#fff6f8', onDark: '#ffd6e3' },
    party: ['#ff4d7e', '#ffd6e3', '#e0245e', '#ffffff', '#f7a8c0'],
    particles: 'hearts', garland: 'hearts', hang: 'heart', hero: 'heart', flyer: 'heart', scene: 'skyline', motif: 'heart', music: 'love',
    say: 'حب وسعادة ❤', countdown: 'يبدأ الحفل بعد', greeting: 'عيد حب سعيد' }),
  eid_adha: R({ label: 'حفل عيد الأضحى', group: 'eid', noun: 'الحفل', unit: 'table', icon: '🌙',
    c: { dark: '#0d3b2e', dark2: '#145340', deep: '#082820', mid: '#2a7a5f', primary: '#b8860b', hi: '#d9a21b', lo: '#8a6408', gold: '#e9c46a', goldHi: '#f6e2a8', bg: '#f8f6ee', onDark: '#e6dfc4' },
    party: ['#e9c46a', '#f6e2a8', '#2a9d8f', '#ffffff', '#d9a21b'],
    particles: 'eid', garland: 'lanterns', hang: 'lantern', hero: 'crescent', flyer: 'lantern', scene: 'mosque', motif: 'crescent', music: 'eid',
    say: 'عيد أضحى مبارك 🌙', countdown: 'يبدأ الحفل بعد', greeting: 'عيد أضحى مبارك وكل عام وأنتم بخير' }),
  eid_fitr: R({ label: 'حفل عيد الفطر', group: 'eid', noun: 'الحفل', unit: 'table', icon: '🌙',
    c: { dark: '#2d1b5a', dark2: '#43297e', deep: '#1c1040', mid: '#6a4bb0', primary: '#c99212', hi: '#e6ad21', lo: '#946a0b', gold: '#f2d272', goldHi: '#fbeab5', bg: '#f9f6ff', onDark: '#e5dcf7' },
    party: ['#f2d272', '#fbeab5', '#b794f4', '#ffffff', '#e6ad21'],
    particles: 'eid', garland: 'lanterns', hang: 'lantern', hero: 'crescent', flyer: 'lantern', scene: 'mosque', motif: 'crescent', music: 'eid',
    say: 'عيد فطر سعيد 🌙', countdown: 'يبدأ الحفل بعد', greeting: 'عيد فطر سعيد وكل عام وأنتم بخير' }),
  national: R({ label: 'اليوم الوطني', group: 'national', noun: 'الاحتفال', unit: 'kiosk', icon: '🇮🇶',
    c: { dark: '#1b1b1b', dark2: '#2b2b2b', deep: '#0d0d0d', mid: '#007a3d', primary: '#ce1126', hi: '#e8283e', lo: '#9c0c1c', gold: '#26a65b', goldHi: '#9be3b8', bg: '#fafafa', onDark: '#e8e8e8' },
    party: ['#ce1126', '#ffffff', '#1b1b1b', '#007a3d'],
    particles: 'confetti', garland: 'bunting', hang: 'balloon', hero: 'flag', flyer: 'flag', scene: 'palms', motif: 'star', music: 'fanfare',
    say: 'كل عام والعراق بخير 🇮🇶', countdown: 'يبدأ الاحتفال بعد', greeting: 'كل عام والعراق بخير' }),
  classico: R({ label: 'مباراة الكلاسيكو', group: 'match', noun: 'المباراة', unit: 'table', icon: '⚽',
    c: { dark: '#0b1d4a', dark2: '#13296b', deep: '#071334', mid: '#2b4a9c', primary: '#a50044', hi: '#cc1a5c', lo: '#7a0033', gold: '#f2c94c', goldHi: '#fbe7a6', bg: '#f5f7fb', onDark: '#d7def2' },
    party: ['#a50044', '#2b4a9c', '#f2c94c', '#ffffff'],
    particles: 'confetti', garland: 'bunting', hang: 'ball', hero: 'ball', flyer: 'ball', scene: 'stadium', motif: 'ball', music: 'stadium',
    say: 'گووووول! ⚽', countdown: 'تنطلق المباراة بعد', greeting: 'مباراة ممتعة' }),
  worldcup: R({ label: 'مباريات كأس العالم', group: 'match', noun: 'المباراة', unit: 'table', icon: '🏆',
    c: { dark: '#0d3b24', dark2: '#14532d', deep: '#082716', mid: '#2e7d4f', primary: '#b8860b', hi: '#d4a017', lo: '#8a6408', gold: '#e7c55b', goldHi: '#f8e7a8', bg: '#f6f8f4', onDark: '#dcebdf' },
    party: ['#d4a017', '#ffffff', '#2e7d4f', '#c8102e', '#1e40af'],
    particles: 'confetti', garland: 'bunting', hang: 'ball', hero: 'trophy', flyer: 'ball', scene: 'stadium', motif: 'ball', music: 'stadium',
    say: 'گووووول! 🏆', countdown: 'تنطلق المباراة بعد', greeting: 'مباراة ممتعة' }),
  gulf: R({ label: 'مباريات خليجي', group: 'match', noun: 'المباراة', unit: 'table', icon: '⚽',
    c: { dark: '#073b4c', dark2: '#0b5269', deep: '#042631', mid: '#118ab2', primary: '#e07a1f', hi: '#f39433', lo: '#a95a12', gold: '#f4c95d', goldHi: '#fbe6ad', bg: '#f3f8f9', onDark: '#d4e8ee' },
    party: ['#e07a1f', '#f4c95d', '#118ab2', '#ffffff', '#06d6a0'],
    particles: 'confetti', garland: 'bunting', hang: 'ball', hero: 'trophy', flyer: 'ball', scene: 'stadium', motif: 'ball', music: 'stadium',
    say: 'گووووول! ⚽', countdown: 'تنطلق المباراة بعد', greeting: 'مباراة ممتعة' }),
  iraq_match: R({ label: 'مباريات منتخب العراق', group: 'match', noun: 'المباراة', unit: 'table', icon: '🇮🇶',
    c: { dark: '#0c4a2a', dark2: '#146c3c', deep: '#07301b', mid: '#1f8a4c', primary: '#ce1126', hi: '#e8283e', lo: '#9c0c1c', gold: '#f2c94c', goldHi: '#fbe7a6', bg: '#f4f9f5', onDark: '#d6ecde' },
    party: ['#ce1126', '#ffffff', '#1b1b1b', '#1f8a4c', '#f2c94c'],
    particles: 'confetti', garland: 'bunting', hang: 'ball', hero: 'ball', flyer: 'ball', scene: 'stadium', motif: 'ball', music: 'stadium',
    say: 'يلّا أسود الرافدين! ⚽', countdown: 'تنطلق المباراة بعد', greeting: 'بالتوفيق لمنتخبنا' }),
  summer: R({ label: 'مهرجان الصيف', group: 'season', noun: 'المهرجان', unit: 'kiosk', icon: '☀️',
    c: { dark: '#0b4f6c', dark2: '#0e6f8f', deep: '#073446', mid: '#20a4c4', primary: '#ff7a00', hi: '#ff9633', lo: '#c25c00', gold: '#ffd23f', goldHi: '#ffe999', bg: '#fffaf0', onDark: '#d3eef7' },
    party: ['#ff7a00', '#ffd23f', '#20c997', '#4fc3f7', '#ff5d8f'],
    particles: 'bubbles', garland: 'bunting', hang: 'balloon', hero: 'sun', flyer: 'airballoon', scene: 'palms', motif: 'sun', music: 'happy',
    say: 'صيف ممتع ☀️', countdown: 'يفتتح المهرجان بعد', greeting: 'صيف سعيد' }),
  spring: R({ label: 'مهرجان الربيع', group: 'season', noun: 'المهرجان', unit: 'kiosk', icon: '🌸',
    c: { dark: '#2f5d3a', dark2: '#3f7a4c', deep: '#1f4027', mid: '#6ba368', primary: '#d94f7c', hi: '#ef6f98', lo: '#a83860', gold: '#f7c948', goldHi: '#fbe39a', bg: '#fbfdf7', onDark: '#e3f0dc' },
    party: ['#ef6f98', '#f7c948', '#8fd18a', '#ffffff', '#b794f4'],
    particles: 'petals', garland: 'bunting', hang: 'flower', hero: 'flower', flyer: 'butterfly', scene: 'hills', motif: 'flower', music: 'happy',
    say: 'ربيع جميل 🌸', countdown: 'يفتتح المهرجان بعد', greeting: 'ربيع سعيد' }),
  general: R({ label: 'فعالية أخرى', group: 'other', noun: 'الفعالية', unit: 'kiosk', icon: '🎉',
    c: { dark: '#22223b', dark2: '#3a3a5e', deep: '#151527', mid: '#4a4e69', primary: '#e85d5d', hi: '#ff7b7b', lo: '#b34343', gold: '#ffd166', goldHi: '#ffe8a8', bg: '#f8f9fb', onDark: '#dcdcec' },
    party: ['#ff7b7b', '#ffd166', '#06d6a0', '#118ab2', '#ffffff'],
    particles: 'confetti', garland: 'bunting', hang: 'balloon', hero: 'balloons', flyer: 'airballoon', scene: 'skyline', motif: 'star', music: 'happy',
    say: 'أهلاً بكم 🎉', countdown: 'تبدأ الفعالية بعد', greeting: 'نتمنى لكم وقتاً ممتعاً' }),
});
export const THEME_ORDER = ['christmas', 'concert', 'evening', 'valentine', 'eid_adha', 'eid_fitr', 'national', 'classico', 'worldcup', 'gulf', 'iraq_match', 'summer', 'spring', 'general'];

export const UNITS = R({
  kiosk: { one: 'كشك', many: 'أكشاك', en: 'kiosk', ens: 'kiosks', icon: '🏪' },
  table: { one: 'طاولة', many: 'طاولات', en: 'table', ens: 'tables', icon: '🍽️' },
  seat: { one: 'مقعد', many: 'مقاعد', en: 'seat', ens: 'seats', icon: '💺' },
  booth: { one: 'جناح', many: 'أجنحة', en: 'booth', ens: 'booths', icon: '🎪' },
});

let current = THEMES.christmas, currentId = 'christmas';
export const theme = () => current;
export const themeId = () => currentId;

// ---------- colour helpers ----------
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
const enc = s => 'url("data:image/svg+xml,' + encodeURIComponent(s).replace(/'/g, '%27').replace(/"/g, '%22') + '")';

// ---------- background motifs ----------
const MOTIF = {
  snow: c => `<g fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"><path d="M30 18v24M18 30h24M21.5 21.5l17 17M38.5 21.5l-17 17"/><path d="M90 78v16M82 86h16M84.3 80.3l11.4 11.4M95.7 80.3L84.3 91.7"/></g>`,
  note: c => `<g fill="${c}"><ellipse cx="26" cy="40" rx="6" ry="4.5" transform="rotate(-20 26 40)"/><rect x="30.5" y="16" width="1.8" height="24"/><path d="M32 16q8 4 10 12q-4-6-10-6z"/><ellipse cx="86" cy="94" rx="5" ry="4" transform="rotate(-20 86 94)"/><ellipse cx="100" cy="90" rx="5" ry="4" transform="rotate(-20 100 90)"/><path d="M90 93V74h14v15h-1.8V77.5H91.8V93z"/></g>`,
  star: c => `<g fill="${c}"><path d="M30 14l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M90 76l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="72" cy="28" r="1.6"/><circle cx="22" cy="92" r="1.3"/></g>`,
  heart: c => `<g fill="${c}"><path d="M30 42c-9-7-14-11-14-17a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 6-5 10-14 17z"/><path d="M90 98c-6-5-9-7-9-11a4.5 4.5 0 0 1 9-1.3 4.5 4.5 0 0 1 9 1.3c0 4-3 6-9 11z"/></g>`,
  crescent: c => `<g fill="${c}"><path d="M36 16a14 14 0 1 0 6 26 11 11 0 1 1-6-26z"/><path d="M92 76l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="74" cy="30" r="1.5"/></g>`,
  ball: c => `<g fill="none" stroke="${c}" stroke-width="1.4"><circle cx="30" cy="30" r="12"/><path d="M30 22l6 4-2 7h-8l-2-7z" fill="${c}"/><circle cx="90" cy="88" r="7"/></g>`,
  sun: c => `<g stroke="${c}" stroke-width="1.6" stroke-linecap="round" fill="none"><circle cx="30" cy="30" r="7"/><path d="M30 14v5M30 41v5M14 30h5M41 30h5M19 19l3.5 3.5M37.5 37.5L41 41M41 19l-3.5 3.5M22.5 37.5L19 41"/><circle cx="90" cy="88" r="4"/></g>`,
  flower: c => `<g fill="${c}"><circle cx="30" cy="22" r="5"/><circle cx="38" cy="30" r="5"/><circle cx="30" cy="38" r="5"/><circle cx="22" cy="30" r="5"/><circle cx="30" cy="30" r="3" fill="#fff"/><circle cx="90" cy="86" r="3"/><circle cx="96" cy="90" r="3"/><circle cx="90" cy="94" r="3"/><circle cx="84" cy="90" r="3"/></g>`,
};
const pattern = T => enc(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g opacity=".38">${MOTIF[T.motif](mixLight(T.c.mid, .55))}</g></svg>`);
function mixLight(hex, k) { const [r, g, b] = hexRgb(hex).split(',').map(Number); const m = v => Math.round(v + (255 - v) * k); return `rgb(${m(r)},${m(g)},${m(b)})`; }

// ---------- silhouettes for the side menu and login ground ----------
const SCENE = {
  trees: (x, h) => `<path d="M${x} ${h} l20 -50 h-10 l16 -30 h-8 l14 -30 l14 30 h-8 l16 30 h-10 l20 50z"/>`,
  mosque: (x, h) => `<path d="M${x} ${h} v-40 q30 -40 60 0 v40z"/><rect x="${x + 70}" y="${h - 95}" width="10" height="95"/><path d="M${x + 68} ${h - 95} l7 -14 l7 14z"/><path d="M${x - 22} ${h} v-26 q12 -18 24 0 v26z"/>`,
  stadium: (x, h) => `<path d="M${x - 10} ${h} v-34 q55 -26 110 0 v34z"/><rect x="${x}" y="${h - 80}" width="4" height="50"/><rect x="${x - 6}" y="${h - 88}" width="16" height="8"/><rect x="${x + 86}" y="${h - 80}" width="4" height="50"/><rect x="${x + 80}" y="${h - 88}" width="16" height="8"/>`,
  palms: (x, h) => `<path d="M${x + 30} ${h} q4 -40 -2 -82 h4 q8 40 2 82z"/><path d="M${x + 30} ${h - 82} q-26 -8 -38 6 q22 -4 38 -2 q-16 -20 -40 -14 q26 2 40 12 q4 -22 26 -24 q-20 10 -22 22 q20 -12 40 -2 q-24 0 -40 8 q26 6 30 26 q-14 -18 -30 -24z"/>`,
  skyline: (x, h) => `<rect x="${x}" y="${h - 60}" width="22" height="60"/><rect x="${x + 26}" y="${h - 92}" width="18" height="92"/><rect x="${x + 48}" y="${h - 46}" width="26" height="46"/><rect x="${x + 78}" y="${h - 74}" width="16" height="74"/>`,
  stage: (x, h) => `<rect x="${x}" y="${h - 70}" width="26" height="70" rx="3"/><circle cx="${x + 13}" cy="${h - 52}" r="7" fill-opacity=".5"/><circle cx="${x + 13}" cy="${h - 24}" r="10" fill-opacity=".5"/><path d="M${x + 40} ${h} v-90 h4 v90z"/><path d="M${x + 30} ${h - 92} h24 l-8 10 h-8z"/>`,
  hills: (x, h) => `<path d="M${x - 40} ${h} q50 -60 100 0z"/><path d="M${x + 30} ${h} q40 -40 80 0z"/>`,
};
const sceneTile = T => enc(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><g fill="${T.c.deep}">${SCENE[T.scene](20, 160)}${SCENE[T.scene](140, 160)}</g></svg>`);
const ground = T => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 130" preserveAspectRatio="none"><g fill="${T.c.deep}">${SCENE[T.scene](40, 130)}${SCENE[T.scene](980, 130)}</g><path d="M0 100 C200 80 340 112 520 96 S860 76 1020 98 1160 104 1200 96 V130 H0z" fill="${T.c.bg}"/></svg>`);
const wave = T => enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 22 C120 6 220 30 340 16 S560 4 700 18 940 34 1060 14 1160 10 1200 18 V40 H0z" fill="${T.c.bg}"/></svg>`);

// ---------- hanging ornaments (60×72, hang from the top) ----------
let gid = 0;
export function hangSVG(kind, i, size, T = current) {
  const p = T.party, a = p[i % p.length], b = p[(i + 1) % p.length], id = 'hg' + (++gid);
  const grad = (c1, c2) => `<radialGradient id="${id}" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".2" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
  const cap = `<rect x="25" y="4" width="10" height="9" rx="2" fill="${T.c.gold}"/>`;
  const shine = `<ellipse cx="21" cy="29" rx="5" ry="8" fill="#fff" fill-opacity=".35" transform="rotate(30 21 29)"/>`;
  const dark = c => mixDark(c, .45);
  const art = {
    bauble: () => `<defs>${grad(a, dark(a))}</defs>${cap}<circle cx="30" cy="40" r="26" fill="url(#${id})"/><path d="M6 36 Q30 26 54 36" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/>${shine}`,
    heart: () => `<defs>${grad(a, dark(a))}</defs><path d="M30 64C12 50 4 40 4 30a13 13 0 0 1 26-5 13 13 0 0 1 26 5c0 10-8 20-26 34z" fill="url(#${id})"/>${shine}`,
    lantern: () => `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#fff6c8"/><stop offset=".6" stop-color="${T.c.goldHi}"/><stop offset="1" stop-color="${T.c.gold}" stop-opacity=".6"/></radialGradient></defs><path d="M30 2 v6" stroke="${T.c.gold}" stroke-width="2"/><path d="M18 10 h24 l-4 8 h-16z" fill="${T.c.gold}"/><path d="M16 18 h28 l4 30 l-8 12 h-20 l-8 -12z" fill="${dark(T.c.gold)}"/><path d="M20 21 h20 l3 26 l-6 9 h-14 l-6 -9z" fill="url(#${id})"/><path d="M30 21 v35 M22 30 h16 M21 42 h18" stroke="${dark(T.c.gold)}" stroke-width="1.6"/><path d="M24 60 h12 l-6 10z" fill="${T.c.gold}"/>`,
    star: () => `<defs>${grad(T.c.goldHi, T.c.gold)}</defs><path d="M30 10 l7 16 17 2 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -2z" fill="url(#${id})" stroke="#fff" stroke-opacity=".5"/>`,
    ball: () => `<defs>${grad('#ffffff', '#cfd6dd')}</defs>${cap}<circle cx="30" cy="40" r="25" fill="url(#${id})" stroke="#2b2b2b" stroke-width="1.5"/><path d="M30 30 l9 6 -3 11 h-12 l-3 -11z" fill="#1d1d1d"/><path d="M30 30 v-14 M39 36 l13 -4 M36 47 l8 11 M24 47 l-8 11 M21 36 l-13 -4" stroke="#1d1d1d" stroke-width="1.6"/>`,
    flower: () => `<g transform="translate(30 38)">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="10" ry="15" cy="-13" fill="${a}" transform="rotate(${r})" opacity=".95"/>`).join('')}<circle r="8" fill="${T.c.gold}"/></g><path d="M30 2 v12" stroke="#5d8a4f" stroke-width="2"/>`,
    balloon: () => `<defs>${grad(a, dark(a))}</defs><path d="M30 2 v8" stroke="#999" stroke-width="1"/><ellipse cx="30" cy="34" rx="20" ry="24" fill="url(#${id})"/><path d="M27 57 h6 l-3 5z" fill="${dark(a)}"/>${shine}`,
  }[kind] || (() => '');
  return `<svg viewBox="0 0 60 72" width="${size}" height="${size * 1.2}" aria-hidden="true">${art()}</svg>`;
}
function mixDark(hex, k) { if (!hex.startsWith('#')) return hex; const [r, g, b] = hexRgb(hex).split(',').map(Number); const m = v => Math.round(v * (1 - k)); return `rgb(${m(r)},${m(g)},${m(b)})`; }

// ---------- centre piece of the dashboard (120×170) ----------
export function heroSVG(kind, T = current) {
  const p = T.party, c = T.c, lights = (pts) => pts.map(([x, y], i) => `<circle class="fx-tl" cx="${x}" cy="${y}" r="4" style="--c:${p[i % p.length]};--d:${(i % 5) * .3}s"/>`).join('');
  const star = (x, y, s = 1) => `<path class="fx-star" style="transform-origin:${x}px ${y}px" d="M${x} ${y - 14 * s} l${4.7 * s} ${10 * s} ${11 * s} ${1.2 * s} ${-8.2 * s} ${7.4 * s} ${2.3 * s} ${10.8 * s} ${-9.8 * s} ${-5.6 * s} ${-9.8 * s} ${5.6 * s} ${2.3 * s} ${-10.8 * s} ${-8.2 * s} ${-7.4 * s} ${11 * s} ${-1.2 * s}z"/>`;
  const art = {
    tree: () => `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9a5a"/><stop offset="1" stop-color="#16452a"/></linearGradient></defs><rect x="52" y="146" width="16" height="18" rx="3" fill="#7a4a24"/><path d="M60 18 L88 62 H74 L100 102 H82 L112 148 H8 L38 102 H20 L46 62 H32Z" fill="url(#tg)"/><path d="M34 70 Q60 84 86 66 M26 110 Q60 126 94 106" stroke="#e8b84a" stroke-width="2.4" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/>${lights([[44, 52], [70, 60], [56, 80], [36, 92], [82, 96], [60, 112], [30, 124], [92, 128], [48, 136], [74, 140]])}${star(60, 16)}<rect x="14" y="150" width="22" height="16" rx="2" fill="#d8333a"/><rect x="23" y="150" width="4" height="16" fill="#e8b84a"/><rect x="84" y="146" width="24" height="20" rx="2" fill="#2f7d47"/><rect x="94" y="146" width="4" height="20" fill="#fff4d6"/>`,
    mic: () => `<rect x="56" y="78" width="8" height="70" fill="#9aa3b5"/><path d="M36 164 h48 l-8 -16 h-32z" fill="#59607a"/><rect x="42" y="18" width="36" height="58" rx="18" fill="#3b3f52"/><rect x="45" y="21" width="30" height="34" rx="15" fill="#c9cfdb"/><path d="M45 34h30M45 42h30M52 22v32M60 21v34M68 22v32" stroke="#8d95a8" stroke-width="1.4"/><rect x="42" y="56" width="36" height="6" fill="${c.primary}"/>${lights([[18, 30], [102, 34], [14, 80], [106, 86], [24, 124], [98, 128]])}${star(96, 12, .7)}`,
    oud: () => `<g transform="rotate(-28 60 90)"><path d="M60 46 C28 50 22 98 34 122 C44 144 76 144 86 122 C98 98 92 50 60 46z" fill="#a8652a"/><path d="M60 52 C36 56 32 96 40 116 C48 134 72 134 80 116 C88 96 84 56 60 52z" fill="#c98a45"/><circle cx="60" cy="92" r="10" fill="#5e3412"/><circle cx="60" cy="92" r="6" fill="none" stroke="#e8c48a" stroke-width="1.5"/><rect x="56" y="6" width="8" height="44" fill="#6b3b14"/><path d="M54 6 l-4 -6 h20 l-4 6z" fill="#4a2a0e"/><path d="M57 8 V126 M60 8 V126 M63 8 V126" stroke="#f3e4c8" stroke-width=".7"/><rect x="50" y="120" width="20" height="4" fill="#4a2a0e"/></g>${lights([[16, 26], [104, 40], [14, 140], [108, 132], [26, 74]])}${star(98, 16, .7)}`,
    heart: () => `<defs><radialGradient id="hh" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".25" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.lo}"/></radialGradient></defs><path d="M60 150 C16 116 6 90 6 66 a27 27 0 0 1 54 -12 a27 27 0 0 1 54 12 c0 24 -10 50 -54 84z" fill="url(#hh)"/><path d="M28 64 q6 -18 22 -14" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>${lights([[22, 30], [100, 30], [12, 120], [108, 118], [60, 16]])}`,
    crescent: () => `<defs><radialGradient id="cr" cx=".4" cy=".4" r=".8"><stop offset="0" stop-color="${c.goldHi}"/><stop offset="1" stop-color="${c.gold}"/></radialGradient></defs><path d="M70 14 a52 52 0 1 0 30 96 a42 42 0 1 1 -30 -96z" fill="url(#cr)"/><path d="M86 56 v20" stroke="${c.gold}" stroke-width="1.5"/><g transform="translate(70 74) scale(.75)">${hangSVG('lantern', 0, 60, T).replace(/<\/?svg[^>]*>/g, '')}</g>${lights([[30, 150], [104, 140], [16, 40], [110, 20], [60, 160]])}${star(28, 20, .6)}`,
    flag: () => `<rect x="18" y="10" width="5" height="156" fill="#8a8a8a"/><circle cx="20.5" cy="9" r="5" fill="${c.gold}"/><g class="fx-wave"><path d="M23 16 q22 -8 44 0 t44 0 v28 q-22 -8 -44 0 t-44 0z" fill="#ce1126"/><path d="M23 44 q22 -8 44 0 t44 0 v28 q-22 -8 -44 0 t-44 0z" fill="#ffffff"/><path d="M23 72 q22 -8 44 0 t44 0 v28 q-22 -8 -44 0 t-44 0z" fill="#111"/><text x="67" y="64" text-anchor="middle" font-family="Lalezar, Readex Pro, sans-serif" font-size="15" fill="#007a3d">الله أكبر</text></g>${lights([[40, 130], [90, 120], [60, 150], [104, 140]])}`,
    ball: () => `<ellipse cx="60" cy="158" rx="44" ry="7" fill="#000" opacity=".15"/><path d="M8 166 q52 -20 104 0z" fill="#3fa34d"/><g class="fx-spin" style="transform-origin:60px 96px"><circle cx="60" cy="96" r="50" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/><path d="M60 74 l20 14 -8 24 h-24 l-8 -24z" fill="#1d1d1d"/><path d="M60 74 V48 M80 88 l24 -8 M72 112 l14 20 M48 112 l-14 20 M40 88 l-24 -8" stroke="#1d1d1d" stroke-width="2.5"/><path d="M60 48 l-12 -2 M60 48 l12 -2 M104 80 l4 12 M86 132 l-12 6 M34 132 l12 6 M16 80 l-4 12" stroke="#1d1d1d" stroke-width="2.5"/></g>${lights([[14, 30], [106, 26], [10, 70], [110, 72]])}`,
    trophy: () => `<defs><linearGradient id="tr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.goldHi}"/><stop offset=".5" stop-color="${c.gold}"/><stop offset="1" stop-color="${mixDark(c.gold, .35)}"/></linearGradient></defs><path d="M30 20 h60 v18 c0 30 -14 46 -30 50 c-16 -4 -30 -20 -30 -50z" fill="url(#tr)"/><path d="M30 28 h-14 c0 20 8 30 18 32 M90 28 h14 c0 20 -8 30 -18 32" stroke="url(#tr)" stroke-width="6" fill="none"/><rect x="54" y="86" width="12" height="30" fill="url(#tr)"/><path d="M36 116 h48 l6 22 h-60z" fill="url(#tr)"/><rect x="26" y="138" width="68" height="16" rx="3" fill="#3b2a12"/><path d="M42 30 q4 26 14 40" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5" fill="none"/>${lights([[12, 20], [108, 24], [16, 100], [104, 96], [60, 8]])}${star(60, 52, .8)}`,
    sun: () => `<g class="fx-spin" style="transform-origin:60px 80px">${Array.from({ length: 12 }, (_, i) => `<path d="M60 18 l6 18 h-12z" fill="${c.gold}" transform="rotate(${i * 30} 60 80)"/>`).join('')}</g><circle cx="60" cy="80" r="36" fill="${c.goldHi}" stroke="${c.gold}" stroke-width="4"/><path d="M38 72 h18 v8 a9 9 0 0 1 -18 0z M64 72 h18 v8 a9 9 0 0 1 -18 0z M56 75 h8" fill="#1d1d1d" stroke="#1d1d1d" stroke-width="2"/><path d="M46 94 q14 12 28 0" stroke="#c25c00" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 160 q50 -24 100 0z" fill="#f5d48c"/>${lights([[12, 150], [108, 150], [20, 20], [100, 20]])}`,
    flower: () => `<path d="M60 164 C58 130 62 110 60 90" stroke="#3f7a4c" stroke-width="5" fill="none"/><path d="M60 130 q-26 -6 -32 -22 q22 0 32 22z M60 118 q24 -8 30 -24 q-22 2 -30 24z" fill="#6ba368"/><g class="fx-spin" style="transform-origin:60px 60px;animation-duration:18s">${[0, 45, 90, 135, 180, 225, 270, 315].map((r, i) => `<ellipse cx="60" cy="32" rx="12" ry="22" fill="${i % 2 ? c.hi : c.primary}" transform="rotate(${r} 60 60)"/>`).join('')}</g><circle cx="60" cy="60" r="14" fill="${c.gold}"/>${lights([[16, 140], [104, 140], [14, 30], [106, 30]])}`,
    balloons: () => `${[[36, 50, p[0]], [62, 36, p[1]], [86, 56, p[2]]].map(([x, y, col]) => `<path d="M${x} ${y + 26} Q${x + 4} ${y + 70} 60 156" stroke="#888" stroke-width="1.2" fill="none"/><ellipse cx="${x}" cy="${y}" rx="20" ry="25" fill="${col}"/><path d="M${x - 3} ${y + 24} h6 l-3 5z" fill="${col}"/><ellipse cx="${x - 7}" cy="${y - 9}" rx="4" ry="7" fill="#fff" opacity=".45"/>`).join('')}${lights([[14, 130], [106, 120], [20, 20], [104, 14]])}`,
  }[kind] || (() => '');
  return art();
}

// ---------- the thing that flies across the screen (300×120, faces right) ----------
export function flyerSVG(kind, T = current) {
  const c = T.c, p = T.party;
  const art = {
    ball: () => `<g opacity=".5" stroke="${c.gold}" stroke-width="4" stroke-linecap="round"><path d="M20 50 h70 M10 66 h80 M30 82 h60"/></g><g class="fx-spin" style="transform-origin:170px 62px;animation-duration:.8s"><circle cx="170" cy="62" r="48" fill="#fff" stroke="#1d1d1d" stroke-width="3"/><path d="M170 40 l20 14 -8 24 h-24 l-8 -24z" fill="#1d1d1d"/><path d="M170 40 V14 M190 54 l24 -8 M182 78 l14 20 M158 78 l-14 20 M150 54 l-24 -8" stroke="#1d1d1d" stroke-width="3"/></g>`,
    heart: () => `<g class="fx-wing" style="transform-origin:150px 60px"><path d="M150 60 C120 20 80 22 70 40 C92 40 110 52 150 60z" fill="#fff" stroke="${c.gold}" stroke-width="2"/></g><path d="M170 104 C136 80 124 64 124 46 a22 22 0 0 1 46 -8 a22 22 0 0 1 46 8 c0 18 -12 34 -46 58z" fill="${c.primary}"/><path d="M140 44 q4 -12 16 -10" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/><g class="fx-wing2" style="transform-origin:190px 60px"><path d="M190 60 C220 20 260 22 270 40 C248 40 230 52 190 60z" fill="#fff" stroke="${c.gold}" stroke-width="2"/></g>`,
    lantern: () => `<g transform="translate(110 0) scale(1.6)">${hangSVG('lantern', 0, 60, T).replace(/<\/?svg[^>]*>/g, '')}</g><path d="M250 30 a22 22 0 1 0 12 40 a17 17 0 1 1 -12 -40z" fill="${c.goldHi}"/><path d="M60 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z M84 84 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="${c.goldHi}"/>`,
    flag: () => `<rect x="60" y="14" width="5" height="100" fill="#8a8a8a"/><g class="fx-wave"><path d="M65 18 q40 -10 80 0 t80 0 v26 q-40 -10 -80 0 t-80 0z" fill="#ce1126"/><path d="M65 44 q40 -10 80 0 t80 0 v26 q-40 -10 -80 0 t-80 0z" fill="#fff"/><path d="M65 70 q40 -10 80 0 t80 0 v26 q-40 -10 -80 0 t-80 0z" fill="#111"/><text x="145" y="64" text-anchor="middle" font-family="Lalezar, Readex Pro, sans-serif" font-size="16" fill="#007a3d">الله أكبر</text></g>`,
    airballoon: () => `<path d="M150 4 C110 4 96 40 110 70 L136 96 H164 L190 70 C204 40 190 4 150 4z" fill="${p[0]}"/><path d="M150 4 C134 4 128 40 136 70 L144 96 H156 L164 70 C172 40 166 4 150 4z" fill="${p[1]}"/><path d="M112 40 h76" stroke="#fff" stroke-width="3" opacity=".5"/><path d="M138 96 l2 10 M162 96 l-2 10" stroke="#6b4a2a" stroke-width="1.6"/><rect x="138" y="104" width="24" height="14" rx="2" fill="#8a5a2b"/>`,
    butterfly: () => `<g class="fx-wing" style="transform-origin:150px 60px"><path d="M150 60 C120 10 80 20 90 50 C96 70 130 66 150 60z" fill="${p[0]}"/><path d="M150 62 C126 74 104 100 124 106 C140 110 148 84 150 62z" fill="${p[2]}"/></g><g class="fx-wing2" style="transform-origin:150px 60px"><path d="M150 60 C180 10 220 20 210 50 C204 70 170 66 150 60z" fill="${p[0]}"/><path d="M150 62 C174 74 196 100 176 106 C160 110 152 84 150 62z" fill="${p[2]}"/></g><rect x="147" y="44" width="6" height="40" rx="3" fill="#3a2a1a"/><path d="M150 46 q-8 -14 -16 -16 M150 46 q8 -14 16 -16" stroke="#3a2a1a" stroke-width="2" fill="none"/>`,
    note: () => `<g class="fx-bounce"><ellipse cx="120" cy="90" rx="18" ry="13" transform="rotate(-20 120 90)" fill="${c.primary}"/><ellipse cx="188" cy="78" rx="18" ry="13" transform="rotate(-20 188 78)" fill="${c.primary}"/><path d="M134 86 V20 L202 8 V74" stroke="${c.primary}" stroke-width="7" fill="none"/><path d="M134 22 L202 10 V26 L134 38z" fill="${c.primary}"/></g><path d="M60 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z M240 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="${c.gold}"/>`,
  }[kind];
  return art ? `<svg viewBox="0 0 300 120" width="230" height="92" aria-hidden="true">${art()}</svg>` : null;
}

// ---------- particle drawers for the falling layer ----------
export function particleDrawer(kind, T = current) {
  const cols = T.party;
  const heart = (ctx, x, y, r) => { ctx.beginPath(); ctx.moveTo(x, y + r * .9); ctx.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .6, y - r * 1.4, x, y - r * .5); ctx.bezierCurveTo(x + r * .6, y - r * 1.4, x + r * 1.6, y - r * .2, x, y + r * .9); ctx.fill(); };
  const sparkle = (ctx, x, y, r) => { ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? r * .35 : r * 1.4; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
  const crescent = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r * 1.3, .9, Math.PI * 2 - .9, false); ctx.arc(x + r * .5, y - r * .1, r * 1.05, Math.PI * 2 - 1.2, 1.2, true); ctx.fill(); };
  return {
    snow: (ctx, f) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); },
    hearts: (ctx, f) => { ctx.fillStyle = cols[f.k % cols.length]; heart(ctx, f.x, f.y, f.r * 1.8); },
    notes: (ctx, f) => { ctx.fillStyle = cols[f.k % cols.length]; ctx.font = `${10 + f.r * 5}px serif`; ctx.fillText(f.k % 2 ? '♪' : '♫', f.x, f.y); },
    stars: (ctx, f) => { ctx.fillStyle = f.k % 3 ? '#fff' : T.c.goldHi; sparkle(ctx, f.x, f.y, f.r * 1.3); },
    eid: (ctx, f) => { ctx.fillStyle = f.k % 4 ? T.c.goldHi : '#fff'; if (f.k % 3 === 0) crescent(ctx, f.x, f.y, f.r * 1.6); else sparkle(ctx, f.x, f.y, f.r * 1.2); },
    confetti: (ctx, f) => { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.p * 3); ctx.fillStyle = cols[f.k % cols.length]; ctx.fillRect(-f.r * 1.4, -f.r * .6, f.r * 2.8, f.r * 1.2); ctx.restore(); },
    bubbles: (ctx, f) => { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2.2, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(f.x - f.r * .8, f.y - f.r * .8, f.r * .5, 0, 6.283); ctx.fill(); },
    petals: (ctx, f) => { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.p * 2); ctx.fillStyle = cols[f.k % 2 ? 0 : 4] || cols[0]; ctx.beginPath(); ctx.ellipse(0, 0, f.r * 2.2, f.r * 1.1, 0, 0, 6.283); ctx.fill(); ctx.restore(); },
  }[kind] || ((ctx, f) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); });
}

// ---------- apply ----------
export function applyTheme(id) {
  currentId = THEMES[id] ? id : 'christmas';
  current = THEMES[currentId];
  const T = current, c = T.c, st = document.documentElement.style;
  const set = (k, v) => st.setProperty(k, v);
  set('--t-icon', JSON.stringify(T.icon));
  set('--t-dark', c.dark); set('--t-dark2', c.dark2); set('--t-deep', c.deep); set('--t-mid', c.mid); set('--t-mid-rgb', hexRgb(c.mid));
  set('--t-primary', c.primary); set('--t-primary-hi', c.hi); set('--t-primary-lo', c.lo); set('--t-primary-rgb', hexRgb(c.primary));
  set('--t-gold', c.gold); set('--t-gold-hi', c.goldHi); set('--t-gold-rgb', hexRgb(c.goldHi)); set('--t-bg', c.bg); set('--t-ondark', c.onDark);
  if (currentId !== 'christmas') {
    set('--t-pattern', pattern(T)); set('--t-silhouette', sceneTile(T)); set('--t-ground', ground(T)); set('--t-wave', wave(T));
    set('--t-hangicon', enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 72">${hangSVG(T.hang, 0, 60, T).replace(/<\/?svg[^>]*>/g, '')}</svg>`));
  }
  document.documentElement.dataset.theme = currentId;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = c.dark;
  try { localStorage.setItem('bcm.theme', currentId); } catch {}
  return T;
}

// ---------- project logo ----------
// Uploaded logos are shown on a soft badge with a themed ring and small ornaments.
// Without an upload, Christmas keeps its own logo and other themes get a styled title.
export function logoNode(E, where = 'nav') {
  const T = THEMES[E?.event_type] || current;
  const wrap = document.createElement('div');
  wrap.className = 'proj-logo proj-logo-' + where;
  if (E?.logo_url) {
    wrap.classList.add('has-img');
    wrap.innerHTML = `<span class="pl-ring"></span><img alt="" src="${E.logo_url}"><span class="pl-orn o1">${hangSVG(T.hang, 0, 22, T)}</span><span class="pl-orn o2">${hangSVG(T.hang, 1, 18, T)}</span><span class="pl-orn o3">${hangSVG(T.hang, 2, 16, T)}</span>`;
    wrap.querySelector('img').alt = E.name || '';
  } else if ((E?.event_type || 'christmas') === 'christmas') {
    wrap.classList.add('xmas');
    const img = document.createElement('img');
    img.src = where === 'login' ? 'img/logo.svg' : 'img/logo-dark.svg'; img.alt = 'Market Christmas';
    wrap.append(img);
  } else {
    wrap.classList.add('text');
    const t = document.createElement('span'); t.className = 'tl-name'; t.textContent = E?.name || '';
    const s = document.createElement('span'); s.className = 'tl-icon'; s.textContent = T.icon;
    wrap.append(s, t);
  }
  return wrap;
}
export const printLogo = E => E?.logo_url || ((E?.event_type || 'christmas') === 'christmas' ? new URL('img/logo-static.svg', location.href).href : null);

// cache the brand for the login screen (shown before sign-in)
export function rememberBrand(E) {
  try { localStorage.setItem('bcm.brand', JSON.stringify({ name: E.name, event_type: E.event_type, logo_url: E.logo_url })); } catch {}
}
export function rememberedBrand() { try { return JSON.parse(localStorage.getItem('bcm.brand') || 'null'); } catch { return null; } }
