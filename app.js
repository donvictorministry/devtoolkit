
(function(){
"use strict";

/* =========================================================
   DV SECURE RANDOM + ENCODING HELPERS
   ========================================================= */
function dvRandomInt(max){
  if (max <= 0) return 0;
  const bytesNeeded = Math.max(1, Math.ceil(Math.log2(max)/8));
  const maxValid = Math.floor(256**bytesNeeded / max) * max;
  let val;
  do{
    const arr = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(arr);
    val = arr.reduce((acc,b,i)=>acc + b*(256**i),0);
  }while(val >= maxValid);
  return val % max;
}
function dvShuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = dvRandomInt(i+1);
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function dvBytesToBase64(bytes){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for(let i=0;i<bytes.length;i+=3){
    const b1=bytes[i], b2=bytes[i+1], b3=bytes[i+2];
    const trip = (b1<<16) | ((b2||0)<<8) | (b3||0);
    out += chars[(trip>>18)&0x3F];
    out += chars[(trip>>12)&0x3F];
    out += (i+1<bytes.length) ? chars[(trip>>6)&0x3F] : '=';
    out += (i+2<bytes.length) ? chars[trip&0x3F] : '=';
  }
  return out;
}
function dvBase64Encode(str){ return dvBytesToBase64(new TextEncoder().encode(str)); }
function dvBase64Decode(str){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = str.replace(/\s+/g,'');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0 || clean.length === 0){
    throw new Error('Invalid Base64 input');
  }
  const bytes = [];
  for(let i=0;i<clean.length;i+=4){
    const c1=chars.indexOf(clean[i]);
    const c2=chars.indexOf(clean[i+1]);
    const c3=clean[i+2]==='=' ? -1 : chars.indexOf(clean[i+2]);
    const c4=clean[i+3]==='=' ? -1 : chars.indexOf(clean[i+3]);
    if(c1<0||c2<0) throw new Error('Invalid Base64 character');
    const trip = (c1<<18)|(c2<<12)|((c3<0?0:c3)<<6)|(c4<0?0:c4);
    bytes.push((trip>>16)&0xFF);
    if(c3>=0) bytes.push((trip>>8)&0xFF);
    if(c4>=0) bytes.push(trip&0xFF);
  }
  return new TextDecoder(undefined,{fatal:false}).decode(new Uint8Array(bytes));
}
function dvUUIDv4(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map(x=>x.toString(16).padStart(2,'0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}
function dvEscape(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* =========================================================
   DV TOAST
   ========================================================= */
function dvToast(msg){
  const wrap = document.getElementById('dvToastWrap');
  const t = document.createElement('div');
  t.className = 'dv-toast';
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('dv-show'));
  setTimeout(()=>{ t.classList.remove('dv-show'); setTimeout(()=> t.remove(), 300); }, 2200);
}
function dvCopy(text){
  if(!text){ dvToast('Nothing to copy'); return; }
  const done = ()=> dvToast('Copied to clipboard');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=> dvFallbackCopy(text, done));
  } else {
    dvFallbackCopy(text, done);
  }
}
function dvFallbackCopy(text, done){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); done(); }catch(e){ dvToast('Copy failed'); }
  ta.remove();
}

/* =========================================================
   DV ICON LIBRARY
   ========================================================= */
const dvIcon = {
  key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.5 12.5L20 3"/><path d="M16 7l3 3"/><path d="M13 4l3 3"/></svg>',
  code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  hash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  palette:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.5 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1 .8-1.7 1.8-1.7H17a3 3 0 0 0 3-3c0-5.5-4-9.5-8-10.5z"/></svg>',
  text:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  refresh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.65 4.36A9 9 0 0 0 20.5 15"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  caseIcon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V8l4 8 4-8v12"/><path d="M20 8h-4v12h4"/><line x1="16" y1="14" x2="20" y2="14"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  braces:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2"/><path d="M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2"/></svg>',
  dice:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="16" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="16" r="1.2" fill="currentColor"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  network:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  jwt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="13" y2="13"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10h14V10"/></svg>',
  chevronRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
  slug:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17h4"/><path d="M10 17h2"/><path d="M16 17h4"/><path d="M4 7h16"/><path d="M4 12h16"/></svg>',
  regex:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L4 20"/><path d="M17 4l3 16"/><line x1="9" y1="10" x2="15" y2="14"/><line x1="15" y1="10" x2="9" y2="14"/></svg>',
  markdown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6"/><path d="M16 9v6"/><path d="M13.5 12.5L16 15l2.5-2.5"/></svg>',
  table:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>',
  diff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v14"/><path d="M5 7l4-4 4 4"/><path d="M15 21V7"/><path d="M11 17l4 4 4-4"/></svg>',
  qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="17" y1="14" x2="17" y2="17"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17" x2="21" y2="17"/><line x1="17" y1="21" x2="21" y2="21"/></svg>',
  card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>',
  barcode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="4" x2="3" y2="20"/><line x1="6" y1="4" x2="6" y2="20"/><line x1="9" y1="4" x2="9" y2="20" stroke-width="3"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="15" y1="4" x2="15" y2="20" stroke-width="3"/><line x1="18" y1="4" x2="18" y2="20"/><line x1="21" y1="4" x2="21" y2="20"/></svg>',
  cron:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><path d="M12 13v3l2 1"/></svg>',
  browser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><circle cx="5.5" cy="6.5" r=".6" fill="currentColor" stroke="none"/><circle cx="7.5" cy="6.5" r=".6" fill="currentColor" stroke="none"/></svg>',
  http:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M8 8h5"/><path d="M8 16h5"/></svg>',
  image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  gradient:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 21L21 3" stroke-dasharray="1 3"/></svg>',
  shadow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="12" height="12" rx="2"/><rect x="8" y="8" width="12" height="12" rx="2" opacity=".4"/></svg>',
  ruler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="8" rx="1" transform="rotate(0 12 12)"/><line x1="6" y1="8" x2="6" y2="11"/><line x1="10" y1="8" x2="10" y2="11"/><line x1="14" y1="8" x2="14" y2="11"/><line x1="18" y1="8" x2="18" y2="11"/></svg>',
  emailFilled:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 6l10 7 10-7"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 0 0-7.75 13.5L3 21l4.65-1.22A9 9 0 1 0 12 3z"/><path d="M8.5 8.5c0 4 3 7 7 7 .8 0 1-.7 1-1.3 0-.4-.2-.6-.5-.8l-1.7-1a.7.7 0 0 0-.8.1l-.6.6a5.7 5.7 0 0 1-3-3l.6-.6a.7.7 0 0 0 .1-.8l-1-1.7c-.2-.3-.4-.5-.8-.5-.6 0-1.3.2-1.3 1z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M14 9h2V6h-2c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2l1-3h-3V9z"/></svg>',
  fbpage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="16" x2="13" y2="16"/></svg>',
  binary:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><line x1="14" y1="4" x2="14" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>',
  contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
  count:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>',
  identicon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><rect x="7" y="7" width="4" height="4" fill="currentColor" stroke="none"/><rect x="13" y="7" width="4" height="4" fill="currentColor" stroke="none"/><rect x="7" y="13" width="10" height="4" fill="currentColor" stroke="none"/></svg>',
  totp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 13V9"/><path d="M12 13l3 2"/><path d="M9 2h6"/></svg>'
};

/* =========================================================
   DV SETTINGS (accent / dark mode / font scale / font family)
   ========================================================= */
const DV_ACCENTS = ['#1877F2','#34A853','#EA4335','#FBBC05','#9C27B0','#FF6D00','#00BCD4','#E91E63','#3F51B5','#009688'];
const DV_FONTS = [
  {id:'roboto', label:'Roboto', family:"'Roboto',Arial,sans-serif"},
  {id:'roboto-condensed', label:'Roboto Condensed', family:"'Roboto Condensed',Arial,sans-serif"},
  {id:'noto-sans', label:'Noto Sans', family:"'Noto Sans',Arial,sans-serif"},
  {id:'open-sans', label:'Open Sans', family:"'Open Sans',Arial,sans-serif"},
  {id:'roboto-slab', label:'Roboto Slab', family:"'Roboto Slab',serif"}
];
let dvSettings = { accent: DV_ACCENTS[0], dark: false, fontScale: 100, fontId: 'roboto' };

function dvLoadSettings(){
  try{
    const raw = localStorage.getItem('dvSettings');
    if(raw) dvSettings = Object.assign(dvSettings, JSON.parse(raw));
  }catch(e){ /* ignore corrupt settings */ }
}
function dvSaveSettings(){
  try{ localStorage.setItem('dvSettings', JSON.stringify(dvSettings)); }catch(e){ /* storage unavailable */ }
}
function dvApplySettings(){
  document.documentElement.style.setProperty('--dv-accent', dvSettings.accent);
  document.documentElement.style.setProperty('--dv-scale', dvSettings.fontScale/100);
  document.documentElement.classList.toggle('dv-dark', dvSettings.dark);
  const font = DV_FONTS.find(f=>f.id===dvSettings.fontId) || DV_FONTS[0];
  document.documentElement.style.setProperty('--dv-font-family', font.family);
}

/* =========================================================
   DV RECENT GENERATORS (home screen)
   ========================================================= */
let dvRecentGens = [];
function dvLoadRecent(){
  try{
    const raw = localStorage.getItem('dvRecentGens');
    dvRecentGens = raw ? JSON.parse(raw) : [];
  }catch(e){ dvRecentGens = []; }
}
function dvPushRecent(toolId){
  dvRecentGens = [toolId, ...dvRecentGens.filter(id=>id!==toolId)].slice(0,6);
  try{ localStorage.setItem('dvRecentGens', JSON.stringify(dvRecentGens)); }catch(e){ /* storage unavailable */ }
}

/* =========================================================
   DV TOOL REGISTRY — 31 developer-standard generators
   ========================================================= */
const DV_TOOLS = [
  { id:'password',  label:'Password',        icon:dvIcon.key,      render:dvRenderPassword },
  { id:'base64',    label:'Base64',          icon:dvIcon.code,     render:dvRenderBase64 },
  { id:'token',     label:'Session Token',   icon:dvIcon.shield,   render:dvRenderToken },
  { id:'uuid',      label:'UUID',            icon:dvIcon.hash,     render:dvRenderUUID },
  { id:'hash',      label:'Hash',            icon:dvIcon.lock,     render:dvRenderHash },
  { id:'color',     label:'Color',           icon:dvIcon.palette,  render:dvRenderColor },
  { id:'lorem',     label:'Lorem Ipsum',     icon:dvIcon.text,     render:dvRenderLorem },
  { id:'timestamp', label:'Timestamp',       icon:dvIcon.clock,    render:dvRenderTimestamp },
  { id:'case',      label:'Case Converter',  icon:dvIcon.caseIcon, render:dvRenderCase },
  { id:'urlcode',   label:'URL Encode',      icon:dvIcon.link,     render:dvRenderUrlCode },
  { id:'json',      label:'JSON Formatter',  icon:dvIcon.braces,   render:dvRenderJson },
  { id:'randnum',   label:'Random Number',   icon:dvIcon.dice,     render:dvRenderRandNum },
  { id:'mac',       label:'MAC Address',     icon:dvIcon.network,  render:dvRenderMac },
  { id:'jwt',       label:'JWT Decoder',     icon:dvIcon.jwt,      render:dvRenderJwt },
  { id:'slug',      label:'Slug',            icon:dvIcon.slug,     render:dvRenderSlug },
  { id:'regex',     label:'Regex Tester',    icon:dvIcon.regex,    render:dvRenderRegex },
  { id:'markdown',  label:'Markdown',        icon:dvIcon.markdown, render:dvRenderMarkdown },
  { id:'csvjson',   label:'CSV ⇄ JSON',      icon:dvIcon.table,    render:dvRenderCsvJson },
  { id:'diff',      label:'Diff Checker',    icon:dvIcon.diff,     render:dvRenderDiff },
  { id:'crc32',     label:'Checksum',        icon:dvIcon.hash,     render:dvRenderCrc32 },
  { id:'qr',        label:'QR Code',         icon:dvIcon.qr,       render:dvRenderQr },
  { id:'testcard',  label:'Test Card / IBAN',icon:dvIcon.card,     render:dvRenderTestCard },
  { id:'barcode',   label:'Barcode',         icon:dvIcon.barcode,  render:dvRenderBarcode },
  { id:'ipaddr',    label:'IP Address',      icon:dvIcon.network,  render:dvRenderIpAddr },
  { id:'cron',      label:'Cron Builder',    icon:dvIcon.cron,     render:dvRenderCron },
  { id:'useragent', label:'User-Agent',      icon:dvIcon.browser,  render:dvRenderUserAgent },
  { id:'httpstatus',label:'HTTP Status',     icon:dvIcon.http,     render:dvRenderHttpStatus },
  { id:'placeholder',label:'Placeholder Img',icon:dvIcon.image,    render:dvRenderPlaceholderImg },
  { id:'gradient',  label:'Gradient CSS',    icon:dvIcon.gradient, render:dvRenderGradient },
  { id:'boxshadow', label:'Box-Shadow CSS',  icon:dvIcon.shadow,   render:dvRenderBoxShadow },
  { id:'cssunit',   label:'CSS Unit Convert',icon:dvIcon.ruler,    render:dvRenderCssUnit },
  { id:'numbase',   label:'Number Base',     icon:dvIcon.binary,   render:dvRenderNumBase },
  { id:'contrast',  label:'Contrast Checker',icon:dvIcon.contrast, render:dvRenderContrast },
  { id:'textstats', label:'Text Statistics', icon:dvIcon.count,    render:dvRenderTextStats },
  { id:'identicon', label:'Identicon',       icon:dvIcon.identicon,render:dvRenderIdenticon },
  { id:'base32',    label:'Base32',          icon:dvIcon.code,     render:dvRenderBase32 },
  { id:'totp',      label:'TOTP / 2FA',      icon:dvIcon.totp,     render:dvRenderTotp }
];
function dvGetTool(id){ return DV_TOOLS.find(t=>t.id===id); }

let dvActiveView = 'home';

/* =========================================================
   DV TOP GEN-NAV STRIP
   ========================================================= */
function dvRenderGenNav(){
  const scroll = document.getElementById('dvGenNavScroll');
  scroll.innerHTML = DV_TOOLS.map(t=>`
    <button class="dv-chip ${dvActiveView===t.id?'dv-chip-active':''}" data-nav="${t.id}">${t.icon}<span>${t.label}</span></button>
  `).join('');
  scroll.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> dvNavigateTo(btn.dataset.nav));
  });
}
document.getElementById('dvBtnHome').addEventListener('click', ()=> dvNavigateTo('home'));

function dvNavigateTo(view){
  dvActiveView = view;
  document.getElementById('dvTopBarTitle').textContent = view==='home' ? 'DV GenSuite' : dvGetTool(view).label;
  dvRenderGenNav();
  document.getElementById('dvContent').scrollTop = 0;
  if(view==='home'){
    dvRenderHome();
  } else {
    dvPushRecent(view);
    dvGetTool(view).render(document.getElementById('dvContent'));
  }
}

/* =========================================================
   DV HOME SCREEN
   ========================================================= */
const DV_QUICK_ACTIONS = ['password','base64','uuid','token'];

function dvRenderHome(){
  const content = document.getElementById('dvContent');
  content.innerHTML = `
    <div id="dvHeroCard">
      <h1>DV GenSuite</h1>
      <p>Every developer utility you need — generated securely, right on your device.</p>
    </div>

    <div class="dv-section-title">Quick Actions</div>
    <div id="dvQuickActions"></div>

    <div class="dv-section-title">Recent Generators</div>
    <div id="dvRecentGens"></div>

    <div class="dv-section-title">More</div>
    <div id="dvMoreSection"></div>
  `;

  const qa = document.getElementById('dvQuickActions');
  qa.innerHTML = DV_QUICK_ACTIONS.map(id=>{
    const t = dvGetTool(id);
    return `<button class="dv-quick-btn" data-quick="${id}">${t.icon}<span>${t.label}</span></button>`;
  }).join('');
  qa.querySelectorAll('[data-quick]').forEach(btn=> btn.addEventListener('click', ()=> dvNavigateTo(btn.dataset.quick)));

  const recentWrap = document.getElementById('dvRecentGens');
  if(dvRecentGens.length === 0){
    recentWrap.innerHTML = `<div class="dv-empty-note">No generators used yet. Tap Quick Actions or the top navigation to get started.</div>`;
  } else {
    recentWrap.innerHTML = dvRecentGens.map(id=>{
      const t = dvGetTool(id);
      if(!t) return '';
      return `<button class="dv-recent-item" data-recent="${id}">${t.icon}<span>${t.label}</span></button>`;
    }).join('');
    recentWrap.querySelectorAll('[data-recent]').forEach(btn=> btn.addEventListener('click', ()=> dvNavigateTo(btn.dataset.recent)));
  }

  const more = document.getElementById('dvMoreSection');
  more.innerHTML = `
    <button class="dv-more-link" data-info="how-to-use">${dvIcon.book}<span>How to Use DV GenSuite</span></button>
    <button class="dv-more-link" data-info="about-app">${dvIcon.chevronRight.replace('viewBox','style="transform:rotate(0deg)" viewBox')}<span>About the App</span></button>
    <button class="dv-more-link" data-info="contact-us">${dvIcon.mail}<span>Contact Us</span></button>
  `;
  more.querySelectorAll('[data-info]').forEach(btn=> btn.addEventListener('click', ()=> dvOpenInfoModal(btn.dataset.info)));
}

/* =========================================================
   1. PASSWORD GENERATOR
   ========================================================= */
const DV_AMBIGUOUS = 'Il1O0o';
function dvRenderPassword(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.key}Password Generator</div>
    <p class="dv-sub">Cryptographically secure, generated on-device.</p>
    <div class="dv-field">
      <div class="dv-label"><span>Length</span><span class="dv-val" id="dvPwLenVal">16</span></div>
      <input type="range" class="dv-range" id="dvPwLen" min="8" max="64" value="16">
    </div>
    <div class="dv-field">
      <div class="dv-check-row"><input type="checkbox" id="dvPwUpper" checked><label for="dvPwUpper">Uppercase (A–Z)</label></div>
      <div class="dv-check-row"><input type="checkbox" id="dvPwLower" checked><label for="dvPwLower">Lowercase (a–z)</label></div>
      <div class="dv-check-row"><input type="checkbox" id="dvPwNums" checked><label for="dvPwNums">Numbers (0–9)</label></div>
      <div class="dv-check-row"><input type="checkbox" id="dvPwSymbols" checked><label for="dvPwSymbols">Symbols (!@#$…)</label></div>
      <div class="dv-check-row"><input type="checkbox" id="dvPwExclude"><label for="dvPwExclude">Exclude ambiguous (I,l,1,O,0,o)</label></div>
    </div>
    <div class="dv-field">
      <input type="text" class="dv-input dv-output" id="dvPwOutput" readonly placeholder="Tap Generate">
      <div class="dv-strength-bar"><div class="dv-strength-fill" id="dvPwStrengthFill"></div></div>
      <div class="dv-strength-label" id="dvPwStrengthLabel">&nbsp;</div>
    </div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvPwGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvPwCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;

  const lenEl = document.getElementById('dvPwLen');
  const lenVal = document.getElementById('dvPwLenVal');
  lenEl.addEventListener('input', ()=> lenVal.textContent = lenEl.value);

  function dvBuildPassword(){
    const length = Number(lenEl.value);
    const useUpper = document.getElementById('dvPwUpper').checked;
    const useLower = document.getElementById('dvPwLower').checked;
    const useNums = document.getElementById('dvPwNums').checked;
    const useSymbols = document.getElementById('dvPwSymbols').checked;
    const exclude = document.getElementById('dvPwExclude').checked;
    let upper='ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower='abcdefghijklmnopqrstuvwxyz', nums='0123456789', symbols='!@#$%^&*()_+-=[]{}|;:,.<>?';
    if(exclude){
      const strip = s => s.split('').filter(c=>!DV_AMBIGUOUS.includes(c)).join('');
      upper=strip(upper); lower=strip(lower); nums=strip(nums);
    }
    const groups = [];
    if(useUpper) groups.push(upper);
    if(useLower) groups.push(lower);
    if(useNums) groups.push(nums);
    if(useSymbols) groups.push(symbols);
    if(groups.length === 0){ dvToast('Select at least one character set'); return null; }
    const fullSet = groups.join('');
    let chars = [];
    groups.forEach(g=> chars.push(g[dvRandomInt(g.length)]));
    while(chars.length < length) chars.push(fullSet[dvRandomInt(fullSet.length)]);
    chars = dvShuffle(chars).slice(0, length);
    const pwd = chars.join('');
    const bits = length * Math.log2(fullSet.length);
    const fill = document.getElementById('dvPwStrengthFill');
    const label = document.getElementById('dvPwStrengthLabel');
    let pct, color, text;
    if(bits < 40){ pct=25; color='var(--dv-danger)'; text='Weak'; }
    else if(bits < 60){ pct=50; color='var(--dv-warn)'; text='Fair'; }
    else if(bits < 80){ pct=75; color='var(--dv-success)'; text='Strong'; }
    else { pct=100; color='var(--dv-accent)'; text='Very Strong'; }
    fill.style.width = pct + '%'; fill.style.background = color;
    label.textContent = `${text} · ~${Math.round(bits)} bits of entropy`;
    return pwd;
  }
  document.getElementById('dvPwGenerate').addEventListener('click', ()=>{
    const pwd = dvBuildPassword();
    if(pwd) document.getElementById('dvPwOutput').value = pwd;
  });
  document.getElementById('dvPwCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvPwOutput').value));
  document.getElementById('dvPwGenerate').click();
}

/* =========================================================
   2. BASE64 ENCODER / DECODER
   ========================================================= */
let dvB64Mode = 'encode';
function dvRenderBase64(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.code}Base64 Encoder / Decoder</div>
    <p class="dv-sub">Unicode-safe. Runs entirely on-device.</p>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvB64ModeEncode" class="${dvB64Mode==='encode'?'dv-seg-active':''}">Encode</button>
      <button id="dvB64ModeDecode" class="${dvB64Mode==='decode'?'dv-seg-active':''}">Decode</button>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span id="dvB64InLabel">Text Input</span></div>
      <textarea class="dv-textarea" id="dvB64Input" placeholder="Type or paste content…"></textarea>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;">
      <button class="dv-btn" id="dvB64Convert">${dvIcon.refresh}Convert</button>
      <button class="dv-btn dv-btn-outline" id="dvB64Swap">${dvIcon.swap}Swap</button>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span id="dvB64OutLabel">Base64 Output</span></div>
      <textarea class="dv-textarea dv-output" id="dvB64Output" readonly></textarea>
    </div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvB64Copy">${dvIcon.copy}Copy Output</button></div>
  </div>`;

  document.getElementById('dvB64ModeEncode').addEventListener('click', ()=>{ dvB64Mode='encode'; dvRenderBase64(main); });
  document.getElementById('dvB64ModeDecode').addEventListener('click', ()=>{ dvB64Mode='decode'; dvRenderBase64(main); });
  document.getElementById('dvB64Convert').addEventListener('click', ()=>{
    const input = document.getElementById('dvB64Input').value;
    if(!input){ dvToast('Enter input first'); return; }
    try{
      const result = dvB64Mode==='encode' ? dvBase64Encode(input) : dvBase64Decode(input);
      document.getElementById('dvB64Output').value = result;
    }catch(err){ dvToast(err.message || 'Invalid Base64 input'); }
  });
  document.getElementById('dvB64Swap').addEventListener('click', ()=>{
    const out = document.getElementById('dvB64Output').value;
    dvB64Mode = dvB64Mode==='encode' ? 'decode' : 'encode';
    dvRenderBase64(main);
    document.getElementById('dvB64Input').value = out;
  });
  document.getElementById('dvB64Copy').addEventListener('click', ()=> dvCopy(document.getElementById('dvB64Output').value));
  document.getElementById('dvB64InLabel').textContent = dvB64Mode==='encode' ? 'Text Input' : 'Base64 Input';
  document.getElementById('dvB64OutLabel').textContent = dvB64Mode==='encode' ? 'Base64 Output' : 'Decoded Output';
}

/* =========================================================
   3. SESSION TOKEN GENERATOR
   ========================================================= */
function dvRenderToken(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.shield}Session Token Generator</div>
    <p class="dv-sub">Secure random tokens for session/auth use.</p>
    <div class="dv-field">
      <div class="dv-label"><span>Length</span><span class="dv-val" id="dvTkLenVal">32</span></div>
      <input type="range" class="dv-range" id="dvTkLen" min="16" max="128" value="32">
    </div>
    <div class="dv-field">
      <div class="dv-label"><span>Format</span></div>
      <select class="dv-select" id="dvTkFormat">
        <option value="hex">Hex</option>
        <option value="base64url">Base64URL</option>
        <option value="alphanumeric">Alphanumeric</option>
      </select>
    </div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvTkOutput" readonly></textarea></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvTkGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvTkCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  const lenEl = document.getElementById('dvTkLen');
  const lenVal = document.getElementById('dvTkLenVal');
  lenEl.addEventListener('input', ()=> lenVal.textContent = lenEl.value);
  function dvGenerateToken(length, format){
    if(format==='hex'){
      const bytes = new Uint8Array(Math.ceil(length/2));
      crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,length);
    } else if(format==='base64url'){
      const bytes = new Uint8Array(Math.ceil(length*3/4)+3);
      crypto.getRandomValues(bytes);
      return dvBytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'').slice(0,length);
    } else {
      const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let out=''; for(let i=0;i<length;i++) out += chars[dvRandomInt(chars.length)];
      return out;
    }
  }
  document.getElementById('dvTkGenerate').addEventListener('click', ()=>{
    document.getElementById('dvTkOutput').value = dvGenerateToken(Number(lenEl.value), document.getElementById('dvTkFormat').value);
  });
  document.getElementById('dvTkCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvTkOutput').value));
  document.getElementById('dvTkGenerate').click();
}

/* =========================================================
   4. UUID GENERATOR
   ========================================================= */
function dvRenderUUID(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.hash}UUID Generator</div>
    <p class="dv-sub">RFC 4122 version 4 UUIDs.</p>
    <div class="dv-field">
      <div class="dv-label"><span>Count</span><span class="dv-val" id="dvUuCountVal">1</span></div>
      <input type="range" class="dv-range" id="dvUuCount" min="1" max="20" value="1">
    </div>
    <div class="dv-btn-row" style="margin-bottom:14px;">
      <button class="dv-btn" id="dvUuGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvUuCopyAll">${dvIcon.copy}Copy All</button>
    </div>
    <div id="dvUuList"></div>
  </div>`;
  const countEl = document.getElementById('dvUuCount');
  const countVal = document.getElementById('dvUuCountVal');
  countEl.addEventListener('input', ()=> countVal.textContent = countEl.value);
  let current = [];
  function paint(){
    document.getElementById('dvUuList').innerHTML = current.map(u=>
      `<div class="dv-list-item"><span>${u}</span><button class="dv-copy-mini" data-uu="${u}">${dvIcon.copy}</button></div>`
    ).join('');
    document.querySelectorAll('[data-uu]').forEach(btn=> btn.addEventListener('click', ()=> dvCopy(btn.dataset.uu)));
  }
  document.getElementById('dvUuGenerate').addEventListener('click', ()=>{
    current = Array.from({length:Number(countEl.value)}, dvUUIDv4);
    paint();
  });
  document.getElementById('dvUuCopyAll').addEventListener('click', ()=> dvCopy(current.join('\n')));
  document.getElementById('dvUuGenerate').click();
}

/* =========================================================
   5. HASH GENERATOR (SubtleCrypto)
   ========================================================= */
function dvRenderHash(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.lock}Hash Generator</div>
    <p class="dv-sub">SHA digests computed via Web Crypto.</p>
    <div class="dv-field"><textarea class="dv-textarea" id="dvHsInput" placeholder="Enter text to hash…"></textarea></div>
    <div class="dv-field">
      <div class="dv-label"><span>Algorithm</span></div>
      <select class="dv-select" id="dvHsAlgo">
        <option value="SHA-1">SHA-1</option>
        <option value="SHA-256" selected>SHA-256</option>
        <option value="SHA-384">SHA-384</option>
        <option value="SHA-512">SHA-512</option>
      </select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvHsGenerate">${dvIcon.refresh}Generate Hash</button></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvHsOutput" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvHsCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvHsGenerate').addEventListener('click', async ()=>{
    const text = document.getElementById('dvHsInput').value;
    if(!text){ dvToast('Enter text first'); return; }
    const algo = document.getElementById('dvHsAlgo').value;
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest(algo, bytes);
    const hex = Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    document.getElementById('dvHsOutput').value = hex;
  });
  document.getElementById('dvHsCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvHsOutput').value));
}

/* =========================================================
   6. COLOR GENERATOR
   ========================================================= */
function dvRandomHexColor(){
  const b = new Uint8Array(3); crypto.getRandomValues(b);
  return '#' + Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function dvHexToRgb(hex){
  const v = hex.replace('#','');
  const r = parseInt(v.substr(0,2),16), g = parseInt(v.substr(2,2),16), b = parseInt(v.substr(4,2),16);
  return `rgb(${r}, ${g}, ${b})`;
}
function dvRenderColor(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.palette}Color Generator</div>
    <div class="dv-swatch" id="dvClSwatch"></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvClHex" readonly></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvClRgb" readonly></div>
    <div class="dv-btn-row" style="margin-bottom:14px;">
      <button class="dv-btn" id="dvClGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvClCopy">${dvIcon.copy}Copy Hex</button>
    </div>
    <div class="dv-label"><span>Palette (5 random colors)</span></div>
    <div class="dv-palette" id="dvClPalette"></div>
  </div>`;
  function generate(){
    const hex = dvRandomHexColor();
    document.getElementById('dvClSwatch').style.background = hex;
    document.getElementById('dvClHex').value = hex;
    document.getElementById('dvClRgb').value = dvHexToRgb(hex);
  }
  function generatePalette(){
    const swatches = Array.from({length:5}, ()=> dvRandomHexColor());
    document.getElementById('dvClPalette').innerHTML = swatches.map(c=>
      `<div class="dv-swatch-sm" style="background:${c}" data-c="${c}"></div>`
    ).join('');
    document.querySelectorAll('#dvClPalette [data-c]').forEach(el=> el.addEventListener('click', ()=> dvCopy(el.dataset.c)));
  }
  document.getElementById('dvClGenerate').addEventListener('click', ()=>{ generate(); generatePalette(); });
  document.getElementById('dvClCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvClHex').value));
  generate(); generatePalette();
}

/* =========================================================
   7. LOREM IPSUM GENERATOR
   ========================================================= */
const DV_LOREM_WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];
function dvBuildSentence(minW,maxW){
  const n = minW + dvRandomInt(maxW-minW+1);
  const words = Array.from({length:n}, ()=> DV_LOREM_WORDS[dvRandomInt(DV_LOREM_WORDS.length)]);
  let s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
function dvBuildParagraph(sc){ return Array.from({length:sc}, ()=> dvBuildSentence(5,14)).join(' '); }
function dvRenderLorem(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.text}Lorem Ipsum Generator</div>
    <div class="dv-field">
      <div class="dv-label"><span>Type</span></div>
      <select class="dv-select" id="dvLoType">
        <option value="words">Words</option>
        <option value="sentences">Sentences</option>
        <option value="paragraphs" selected>Paragraphs</option>
      </select>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span>Count</span><span class="dv-val" id="dvLoCountVal">3</span></div>
      <input type="range" class="dv-range" id="dvLoCount" min="1" max="20" value="3">
    </div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvLoOutput" style="min-height:170px;" readonly></textarea></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvLoGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvLoCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  const countEl = document.getElementById('dvLoCount');
  const countVal = document.getElementById('dvLoCountVal');
  countEl.addEventListener('input', ()=> countVal.textContent = countEl.value);
  document.getElementById('dvLoGenerate').addEventListener('click', ()=>{
    const type = document.getElementById('dvLoType').value;
    const count = Number(countEl.value);
    let text;
    if(type==='words'){
      text = Array.from({length:count}, ()=> DV_LOREM_WORDS[dvRandomInt(DV_LOREM_WORDS.length)]).join(' ');
      text = text.charAt(0).toUpperCase() + text.slice(1);
    } else if(type==='sentences'){
      text = Array.from({length:count}, ()=> dvBuildSentence(6,14)).join(' ');
    } else {
      text = Array.from({length:count}, ()=> dvBuildParagraph(4 + dvRandomInt(3))).join('\n\n');
    }
    document.getElementById('dvLoOutput').value = text;
  });
  document.getElementById('dvLoCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvLoOutput').value));
  document.getElementById('dvLoGenerate').click();
}

/* =========================================================
   8. TIMESTAMP CONVERTER
   ========================================================= */
function dvRenderTimestamp(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.clock}Timestamp Converter</div>
    <div class="dv-field">
      <div class="dv-label"><span>Current Unix Timestamp</span></div>
      <input type="text" class="dv-input dv-output" id="dvTsNowSec" readonly>
    </div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTsNowMs" readonly></div>
    <div class="dv-btn-row" style="margin-bottom:16px;">
      <button class="dv-btn" id="dvTsRefresh">${dvIcon.refresh}Refresh Now</button>
      <button class="dv-btn dv-btn-outline" id="dvTsCopyNow">${dvIcon.copy}Copy Seconds</button>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span>Date → Unix Timestamp</span></div>
      <input type="datetime-local" class="dv-input" id="dvTsDateInput">
    </div>
    <div class="dv-btn-row" style="margin-bottom:10px;"><button class="dv-btn dv-btn-outline" id="dvTsToUnix">Convert</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTsUnixOut" readonly></div>
    <div class="dv-field" style="margin-top:8px;">
      <div class="dv-label"><span>Unix Timestamp → Date</span></div>
      <input type="text" class="dv-input" id="dvTsUnixInput" placeholder="e.g. 1735689600">
    </div>
    <div class="dv-btn-row" style="margin-bottom:10px;"><button class="dv-btn dv-btn-outline" id="dvTsToDate">Convert</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTsDateOut" readonly></div>
  </div>`;
  function refreshNow(){
    const n = Date.now();
    document.getElementById('dvTsNowSec').value = Math.floor(n/1000) + '  (seconds)';
    document.getElementById('dvTsNowMs').value = n + '  (milliseconds)';
  }
  refreshNow();
  document.getElementById('dvTsRefresh').addEventListener('click', refreshNow);
  document.getElementById('dvTsCopyNow').addEventListener('click', ()=> dvCopy(String(Math.floor(Date.now()/1000))));
  document.getElementById('dvTsToUnix').addEventListener('click', ()=>{
    const val = document.getElementById('dvTsDateInput').value;
    if(!val){ dvToast('Pick a date & time'); return; }
    const ts = Math.floor(new Date(val).getTime()/1000);
    if(isNaN(ts)){ dvToast('Invalid date'); return; }
    document.getElementById('dvTsUnixOut').value = String(ts);
  });
  document.getElementById('dvTsToDate').addEventListener('click', ()=>{
    const raw = document.getElementById('dvTsUnixInput').value.trim();
    if(!raw || isNaN(Number(raw))){ dvToast('Enter a valid Unix timestamp'); return; }
    let n = Number(raw);
    if(String(raw).length <= 10) n = n * 1000;
    const d = new Date(n);
    if(isNaN(d.getTime())){ dvToast('Invalid timestamp'); return; }
    document.getElementById('dvTsDateOut').value = d.toLocaleString();
  });
}

/* =========================================================
   9. CASE CONVERTER
   ========================================================= */
function dvToWords(str){
  return str
    .replace(/([a-z])([A-Z])/g,'$1 $2')
    .replace(/[_\-]+/g,' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w=>w.toLowerCase());
}
function dvRenderCase(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.caseIcon}Case Converter</div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvCsInput" placeholder="Enter text or identifier…"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCsConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><div class="dv-label"><span>camelCase</span></div><input type="text" class="dv-input dv-output" id="dvCsCamel" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>PascalCase</span></div><input type="text" class="dv-input dv-output" id="dvCsPascal" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>snake_case</span></div><input type="text" class="dv-input dv-output" id="dvCsSnake" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>kebab-case</span></div><input type="text" class="dv-input dv-output" id="dvCsKebab" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>CONSTANT_CASE</span></div><input type="text" class="dv-input dv-output" id="dvCsConstant" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>Title Case</span></div><input type="text" class="dv-input dv-output" id="dvCsTitle" readonly></div>
  </div>`;
  document.getElementById('dvCsConvert').addEventListener('click', ()=>{
    const raw = document.getElementById('dvCsInput').value;
    if(!raw){ dvToast('Enter text first'); return; }
    const words = dvToWords(raw);
    if(words.length===0){ dvToast('Nothing to convert'); return; }
    const camel = words.map((w,i)=> i===0 ? w : w.charAt(0).toUpperCase()+w.slice(1)).join('');
    const pascal = words.map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join('');
    const snake = words.join('_');
    const kebab = words.join('-');
    const constant = words.join('_').toUpperCase();
    const title = words.map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    document.getElementById('dvCsCamel').value = camel;
    document.getElementById('dvCsPascal').value = pascal;
    document.getElementById('dvCsSnake').value = snake;
    document.getElementById('dvCsKebab').value = kebab;
    document.getElementById('dvCsConstant').value = constant;
    document.getElementById('dvCsTitle').value = title;
  });
}

/* =========================================================
   10. URL ENCODER / DECODER
   ========================================================= */
let dvUrlMode = 'encode';
function dvRenderUrlCode(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.link}URL Encoder / Decoder</div>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvUrlModeEncode" class="${dvUrlMode==='encode'?'dv-seg-active':''}">Encode</button>
      <button id="dvUrlModeDecode" class="${dvUrlMode==='decode'?'dv-seg-active':''}">Decode</button>
    </div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvUrlInput" placeholder="Enter text or URL…"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvUrlConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvUrlOutput" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvUrlCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvUrlModeEncode').addEventListener('click', ()=>{ dvUrlMode='encode'; dvRenderUrlCode(main); });
  document.getElementById('dvUrlModeDecode').addEventListener('click', ()=>{ dvUrlMode='decode'; dvRenderUrlCode(main); });
  document.getElementById('dvUrlConvert').addEventListener('click', ()=>{
    const input = document.getElementById('dvUrlInput').value;
    if(!input){ dvToast('Enter input first'); return; }
    try{
      document.getElementById('dvUrlOutput').value = dvUrlMode==='encode' ? encodeURIComponent(input) : decodeURIComponent(input);
    }catch(e){ dvToast('Invalid encoded input'); }
  });
  document.getElementById('dvUrlCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvUrlOutput').value));
}

/* =========================================================
   11. JSON FORMATTER / MINIFIER
   ========================================================= */
function dvRenderJson(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.braces}JSON Formatter</div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvJsInput" placeholder="Paste JSON here…" style="min-height:140px;"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;">
      <button class="dv-btn" id="dvJsFormat">${dvIcon.refresh}Format</button>
      <button class="dv-btn dv-btn-outline" id="dvJsMinify">Minify</button>
    </div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvJsOutput" style="min-height:160px;" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvJsCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  function parse(){
    const raw = document.getElementById('dvJsInput').value;
    if(!raw){ dvToast('Enter JSON first'); return null; }
    try{ return JSON.parse(raw); }
    catch(e){ dvToast('Invalid JSON: ' + e.message); return undefined; }
  }
  document.getElementById('dvJsFormat').addEventListener('click', ()=>{
    const obj = parse();
    if(obj === undefined) return;
    document.getElementById('dvJsOutput').value = JSON.stringify(obj, null, 2);
  });
  document.getElementById('dvJsMinify').addEventListener('click', ()=>{
    const obj = parse();
    if(obj === undefined) return;
    document.getElementById('dvJsOutput').value = JSON.stringify(obj);
  });
  document.getElementById('dvJsCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvJsOutput').value));
}

/* =========================================================
   12. RANDOM NUMBER GENERATOR
   ========================================================= */
function dvRenderRandNum(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.dice}Random Number Generator</div>
    <div class="dv-field"><div class="dv-label"><span>Minimum</span></div><input type="number" class="dv-input" id="dvRnMin" value="1"></div>
    <div class="dv-field"><div class="dv-label"><span>Maximum</span></div><input type="number" class="dv-input" id="dvRnMax" value="100"></div>
    <div class="dv-field"><div class="dv-label"><span>How Many</span><span class="dv-val" id="dvRnCountVal">1</span></div><input type="range" class="dv-range" id="dvRnCount" min="1" max="20" value="1"></div>
    <div class="dv-check-row"><input type="checkbox" id="dvRnUnique"><label for="dvRnUnique">No duplicate values</label></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvRnOutput" readonly></textarea></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvRnGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvRnCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  const countEl = document.getElementById('dvRnCount');
  const countVal = document.getElementById('dvRnCountVal');
  countEl.addEventListener('input', ()=> countVal.textContent = countEl.value);
  document.getElementById('dvRnGenerate').addEventListener('click', ()=>{
    const min = Math.floor(Number(document.getElementById('dvRnMin').value));
    const max = Math.floor(Number(document.getElementById('dvRnMax').value));
    const count = Number(countEl.value);
    const unique = document.getElementById('dvRnUnique').checked;
    if(isNaN(min) || isNaN(max) || max < min){ dvToast('Max must be greater than or equal to Min'); return; }
    const range = max - min + 1;
    if(unique && count > range){ dvToast('Range too small for unique count'); return; }
    let results = [];
    if(unique){
      const pool = Array.from({length:range}, (_,i)=> min + i);
      dvShuffle(pool);
      results = pool.slice(0, count);
    } else {
      results = Array.from({length:count}, ()=> min + dvRandomInt(range));
    }
    document.getElementById('dvRnOutput').value = results.join(', ');
  });
  document.getElementById('dvRnCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvRnOutput').value));
  document.getElementById('dvRnGenerate').click();
}

/* =========================================================
   13. MAC ADDRESS GENERATOR
   ========================================================= */
function dvRenderMac(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.network}MAC Address Generator</div>
    <div class="dv-field">
      <div class="dv-label"><span>Separator</span></div>
      <select class="dv-select" id="dvMcSep">
        <option value=":">Colon (:)</option>
        <option value="-">Hyphen (-)</option>
      </select>
    </div>
    <div class="dv-check-row"><input type="checkbox" id="dvMcLocal" checked><label for="dvMcLocal">Locally administered address</label></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvMcOutput" readonly></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvMcGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvMcCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  document.getElementById('dvMcGenerate').addEventListener('click', ()=>{
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    if(document.getElementById('dvMcLocal').checked){
      bytes[0] = (bytes[0] & 0xFC) | 0x02; // locally administered, unicast
    }
    const sep = document.getElementById('dvMcSep').value;
    const mac = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0').toUpperCase()).join(sep);
    document.getElementById('dvMcOutput').value = mac;
  });
  document.getElementById('dvMcCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvMcOutput').value));
  document.getElementById('dvMcGenerate').click();
}

/* =========================================================
   14. JWT DECODER
   ========================================================= */
function dvRenderJwt(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.jwt}JWT Decoder</div>
    <p class="dv-sub">Decodes header & payload only — does not verify the signature.</p>
    <div class="dv-field"><textarea class="dv-textarea" id="dvJwInput" placeholder="Paste a JWT…"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvJwDecode">${dvIcon.refresh}Decode</button></div>
    <div class="dv-field"><div class="dv-label"><span>Header</span></div><textarea class="dv-textarea dv-output" id="dvJwHeader" readonly></textarea></div>
    <div class="dv-field"><div class="dv-label"><span>Payload</span></div><textarea class="dv-textarea dv-output" id="dvJwPayload" readonly></textarea></div>
  </div>`;
  function decodePart(part){
    let b64 = part.replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length % 4 !== 0) b64 += '=';
    return dvBase64Decode(b64);
  }
  document.getElementById('dvJwDecode').addEventListener('click', ()=>{
    const token = document.getElementById('dvJwInput').value.trim();
    const parts = token.split('.');
    if(parts.length < 2){ dvToast('Invalid JWT format'); return; }
    try{
      document.getElementById('dvJwHeader').value = JSON.stringify(JSON.parse(decodePart(parts[0])), null, 2);
      document.getElementById('dvJwPayload').value = JSON.stringify(JSON.parse(decodePart(parts[1])), null, 2);
    }catch(e){ dvToast('Unable to decode JWT'); }
  });
}

/* =========================================================
   15. SLUG GENERATOR
   ========================================================= */
function dvRenderSlug(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.slug}Slug Generator</div>
    <p class="dv-sub">Convert any text into a URL-friendly slug.</p>
    <div class="dv-field"><textarea class="dv-textarea" id="dvSgInput" placeholder="Enter a title or phrase…"></textarea></div>
    <div class="dv-field">
      <div class="dv-label"><span>Separator</span></div>
      <select class="dv-select" id="dvSgSep">
        <option value="-">Hyphen (-)</option>
        <option value="_">Underscore (_)</option>
      </select>
    </div>
    <div class="dv-check-row"><input type="checkbox" id="dvSgLower" checked><label for="dvSgLower">Lowercase</label></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvSgOutput" readonly></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvSgGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvSgCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  document.getElementById('dvSgGenerate').addEventListener('click', ()=>{
    const raw = document.getElementById('dvSgInput').value;
    if(!raw){ dvToast('Enter text first'); return; }
    const sep = document.getElementById('dvSgSep').value;
    const lower = document.getElementById('dvSgLower').checked;
    let slug = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    slug = slug.replace(/[^a-zA-Z0-9\s-_]/g,'').trim().replace(/[\s_-]+/g, sep);
    if(lower) slug = slug.toLowerCase();
    document.getElementById('dvSgOutput').value = slug;
  });
  document.getElementById('dvSgCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvSgOutput').value));
}

/* =========================================================
   16. REGEX TESTER
   ========================================================= */
function dvRenderRegex(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.regex}Regex Tester</div>
    <div class="dv-field"><div class="dv-label"><span>Pattern</span></div><input type="text" class="dv-input dv-output" id="dvRgPattern" placeholder="e.g. \\\\d+"></div>
    <div class="dv-field"><div class="dv-label"><span>Flags</span></div><input type="text" class="dv-input dv-output" id="dvRgFlags" placeholder="e.g. gi" value="g"></div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvRgSubject" placeholder="Test string…" style="min-height:120px;"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvRgTest">${dvIcon.refresh}Test</button></div>
    <div class="dv-field"><div class="dv-label"><span>Matches Found</span><span class="dv-val" id="dvRgCount">0</span></div>
      <div id="dvRgResults" class="dv-info-text"></div>
    </div>
  </div>`;
  document.getElementById('dvRgTest').addEventListener('click', ()=>{
    const pattern = document.getElementById('dvRgPattern').value;
    const flags = document.getElementById('dvRgFlags').value;
    const subject = document.getElementById('dvRgSubject').value;
    if(!pattern){ dvToast('Enter a pattern first'); return; }
    let re;
    try{ re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); }
    catch(e){ dvToast('Invalid regex: ' + e.message); return; }
    const matches = [...subject.matchAll(re)];
    document.getElementById('dvRgCount').textContent = matches.length;
    if(matches.length === 0){
      document.getElementById('dvRgResults').innerHTML = '<p>No matches found.</p>';
      return;
    }
    document.getElementById('dvRgResults').innerHTML = matches.map((m,i)=>
      `<p><strong>#${i+1}</strong> — "${dvEscape(m[0])}" at index ${m.index}</p>`
    ).join('');
  });
}

/* =========================================================
   17. MARKDOWN ⇄ HTML CONVERTER
   ========================================================= */
function dvMarkdownToHtml(md){
  let html = dvEscape(md);
  html = html.replace(/^###### (.*)$/gm,'<h6>$1</h6>')
             .replace(/^##### (.*)$/gm,'<h5>$1</h5>')
             .replace(/^#### (.*)$/gm,'<h4>$1</h4>')
             .replace(/^### (.*)$/gm,'<h3>$1</h3>')
             .replace(/^## (.*)$/gm,'<h2>$1</h2>')
             .replace(/^# (.*)$/gm,'<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,'<em>$1</em>');
  html = html.replace(/`([^`]+)`/g,'<code>$1</code>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2">$1</a>');
  html = html.replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>');
  html = html.replace(/^[-*] (.*)$/gm,'<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>');
  html = html.split(/\n{2,}/).map(block=>{
    if(/^<(h\d|ul|blockquote)/.test(block.trim())) return block;
    return block.trim() ? `<p>${block.trim()}</p>` : '';
  }).join('\n');
  return html;
}
function dvHtmlToMarkdown(html){
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi,'# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi,'## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi,'### $1\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi,'**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi,'**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi,'*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi,'*$1*');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi,'`$1`');
  md = md.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi,'[$2]($1)');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi,'- $1\n');
  md = md.replace(/<\/?(ul|ol|p|div|br\s*\/?)[^>]*>/gi,'\n');
  md = md.replace(/<[^>]+>/g,'');
  md = md.replace(/\n{3,}/g,'\n\n').trim();
  return md;
}
let dvMdMode = 'md2html';
function dvRenderMarkdown(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.markdown}Markdown ⇄ HTML</div>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvMdModeA" class="${dvMdMode==='md2html'?'dv-seg-active':''}">Markdown → HTML</button>
      <button id="dvMdModeB" class="${dvMdMode==='html2md'?'dv-seg-active':''}">HTML → Markdown</button>
    </div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvMdInput" style="min-height:150px;" placeholder="${dvMdMode==='md2html' ? '# Heading\\n**bold** and *italic*' : '<h1>Heading</h1>'}"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvMdConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvMdOutput" style="min-height:150px;" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvMdCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvMdModeA').addEventListener('click', ()=>{ dvMdMode='md2html'; dvRenderMarkdown(main); });
  document.getElementById('dvMdModeB').addEventListener('click', ()=>{ dvMdMode='html2md'; dvRenderMarkdown(main); });
  document.getElementById('dvMdConvert').addEventListener('click', ()=>{
    const input = document.getElementById('dvMdInput').value;
    if(!input){ dvToast('Enter input first'); return; }
    document.getElementById('dvMdOutput').value = dvMdMode==='md2html' ? dvMarkdownToHtml(input) : dvHtmlToMarkdown(input);
  });
  document.getElementById('dvMdCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvMdOutput').value));
}

/* =========================================================
   18. CSV ⇄ JSON CONVERTER
   ========================================================= */
function dvParseCsv(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c === '"' && next === '"'){ field += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(field); field=''; }
      else if(c === '\n' || c === '\r'){
        if(field !== '' || row.length){ row.push(field); rows.push(row); row=[]; field=''; }
        if(c === '\r' && next === '\n') i++;
      } else field += c;
    }
  }
  if(field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows;
}
function dvCsvToJson(text){
  const rows = dvParseCsv(text.trim());
  if(rows.length === 0) return '[]';
  const headers = rows[0];
  const objs = rows.slice(1).map(r=>{
    const obj = {};
    headers.forEach((h,i)=> obj[h] = r[i] !== undefined ? r[i] : '');
    return obj;
  });
  return JSON.stringify(objs, null, 2);
}
function dvJsonToCsv(text){
  const data = JSON.parse(text);
  if(!Array.isArray(data) || data.length === 0) throw new Error('JSON must be a non-empty array of objects');
  const headers = Object.keys(data[0]);
  const escapeField = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  };
  const lines = [headers.join(',')];
  data.forEach(obj=> lines.push(headers.map(h=> escapeField(obj[h])).join(',')));
  return lines.join('\n');
}
let dvCsvMode = 'csv2json';
function dvRenderCsvJson(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.table}CSV ⇄ JSON Converter</div>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvCvModeA" class="${dvCsvMode==='csv2json'?'dv-seg-active':''}">CSV → JSON</button>
      <button id="dvCvModeB" class="${dvCsvMode==='json2csv'?'dv-seg-active':''}">JSON → CSV</button>
    </div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvCvInput" style="min-height:140px;" placeholder="${dvCsvMode==='csv2json' ? 'name,age\\nJohn,30' : '[{\"name\":\"John\",\"age\":30}]'}"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCvConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvCvOutput" style="min-height:150px;" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvCvCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvCvModeA').addEventListener('click', ()=>{ dvCsvMode='csv2json'; dvRenderCsvJson(main); });
  document.getElementById('dvCvModeB').addEventListener('click', ()=>{ dvCsvMode='json2csv'; dvRenderCsvJson(main); });
  document.getElementById('dvCvConvert').addEventListener('click', ()=>{
    const input = document.getElementById('dvCvInput').value;
    if(!input){ dvToast('Enter input first'); return; }
    try{
      document.getElementById('dvCvOutput').value = dvCsvMode==='csv2json' ? dvCsvToJson(input) : dvJsonToCsv(input);
    }catch(e){ dvToast('Conversion error: ' + e.message); }
  });
  document.getElementById('dvCvCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvCvOutput').value));
}

/* =========================================================
   19. DIFF CHECKER
   ========================================================= */
function dvComputeLineDiff(a, b){
  const linesA = a.split('\n'), linesB = b.split('\n');
  const n = linesA.length, m = linesB.length;
  const lcs = Array.from({length:n+1}, ()=> new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--){
    for(let j=m-1;j>=0;j--){
      lcs[i][j] = linesA[i] === linesB[j] ? lcs[i+1][j+1]+1 : Math.max(lcs[i+1][j], lcs[i][j+1]);
    }
  }
  const result = [];
  let i=0, j=0;
  while(i<n && j<m){
    if(linesA[i] === linesB[j]){ result.push({type:'same', text:linesA[i]}); i++; j++; }
    else if(lcs[i+1][j] >= lcs[i][j+1]){ result.push({type:'removed', text:linesA[i]}); i++; }
    else { result.push({type:'added', text:linesB[j]}); j++; }
  }
  while(i<n){ result.push({type:'removed', text:linesA[i]}); i++; }
  while(j<m){ result.push({type:'added', text:linesB[j]}); j++; }
  return result;
}
function dvRenderDiff(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.diff}Diff Checker</div>
    <div class="dv-field"><div class="dv-label"><span>Original</span></div><textarea class="dv-textarea" id="dvDfA" style="min-height:110px;"></textarea></div>
    <div class="dv-field"><div class="dv-label"><span>Changed</span></div><textarea class="dv-textarea" id="dvDfB" style="min-height:110px;"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvDfCompare">${dvIcon.refresh}Compare</button></div>
    <div id="dvDfResult" class="dv-output" style="font-size:1rem; line-height:1.8;"></div>
  </div>`;
  document.getElementById('dvDfCompare').addEventListener('click', ()=>{
    const a = document.getElementById('dvDfA').value;
    const b = document.getElementById('dvDfB').value;
    const diff = dvComputeLineDiff(a, b);
    document.getElementById('dvDfResult').innerHTML = diff.map(d=>{
      const bg = d.type==='added' ? 'rgba(49,162,76,.15)' : d.type==='removed' ? 'rgba(228,30,63,.15)' : 'transparent';
      const prefix = d.type==='added' ? '+ ' : d.type==='removed' ? '- ' : '  ';
      return `<div style="background:${bg}; padding:2px 6px; border-radius:4px;">${prefix}${dvEscape(d.text)}</div>`;
    }).join('');
  });
}

/* =========================================================
   20. CHECKSUM / CRC32 GENERATOR
   ========================================================= */
const DV_CRC_TABLE = (function(){
  const table = new Array(256);
  for(let n=0;n<256;n++){
    let c = n;
    for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function dvCrc32(str){
  let crc = 0xFFFFFFFF;
  const bytes = new TextEncoder().encode(str);
  for(let i=0;i<bytes.length;i++) crc = DV_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8,'0');
}
async function dvSimpleChecksum(str, algo){
  if(algo === 'crc32') return dvCrc32(str);
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest(algo, bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function dvRenderCrc32(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.hash}Checksum Generator</div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvCkInput" placeholder="Enter text…"></textarea></div>
    <div class="dv-field">
      <div class="dv-label"><span>Algorithm</span></div>
      <select class="dv-select" id="dvCkAlgo">
        <option value="crc32">CRC32</option>
        <option value="SHA-1">SHA-1</option>
        <option value="SHA-256">SHA-256</option>
      </select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCkGenerate">${dvIcon.refresh}Generate</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvCkOutput" readonly></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvCkCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvCkGenerate').addEventListener('click', async ()=>{
    const text = document.getElementById('dvCkInput').value;
    if(!text){ dvToast('Enter text first'); return; }
    const algo = document.getElementById('dvCkAlgo').value;
    document.getElementById('dvCkOutput').value = await dvSimpleChecksum(text, algo);
  });
  document.getElementById('dvCkCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvCkOutput').value));
}

/* =========================================================
   21. QR CODE GENERATOR (on-device, byte mode, versions 1-4, level L)
   ========================================================= */
const DV_QR_GF = (function(){
  const exp = new Array(512), log = new Array(256);
  let x = 1;
  for(let i=0;i<255;i++){ exp[i]=x; log[x]=i; x<<=1; if(x & 0x100) x ^= 0x11D; }
  for(let i=255;i<512;i++) exp[i]=exp[i-255];
  return {exp, log};
})();
function dvQrGfMul(a,b){ if(a===0||b===0) return 0; return DV_QR_GF.exp[DV_QR_GF.log[a]+DV_QR_GF.log[b]]; }
function dvQrPolyMul(p,q){
  const result = new Array(p.length+q.length-1).fill(0);
  for(let i=0;i<p.length;i++) for(let j=0;j<q.length;j++) result[i+j] ^= dvQrGfMul(p[i],q[j]);
  return result;
}
function dvQrGeneratorPoly(ecCount){
  let g=[1];
  for(let i=0;i<ecCount;i++) g = dvQrPolyMul(g, [1, DV_QR_GF.exp[i]]);
  return g;
}
function dvQrRsRemainder(data, ecCount){
  const generator = dvQrGeneratorPoly(ecCount);
  let result = data.concat(new Array(ecCount).fill(0));
  for(let i=0;i<data.length;i++){
    const coef = result[i];
    if(coef !== 0) for(let j=0;j<generator.length;j++) result[i+j] ^= dvQrGfMul(generator[j], coef);
  }
  return result.slice(data.length);
}
function dvQrPolyMod(dividend, divisor){
  let dividendBits = dividend.toString(2).length;
  const divisorBits = divisor.toString(2).length;
  let result = dividend;
  while(dividendBits >= divisorBits){
    result ^= (divisor << (dividendBits - divisorBits));
    dividendBits = result===0 ? 0 : result.toString(2).length;
  }
  return result;
}
function dvQrFormatBits(maskPattern){
  const data = (0b01 << 3) | maskPattern;
  const shifted = data << 10;
  const remainder = dvQrPolyMod(shifted, 0b10100110111);
  const combined = shifted | remainder;
  return combined ^ 0b101010000010010;
}
function dvQrEncodeData(text){
  const bytes = Array.from(new TextEncoder().encode(text));
  const capacities = [17,32,53,78];
  let version = capacities.findIndex(c=> bytes.length <= c);
  if(version === -1) throw new Error('Text too long for on-device QR (max 78 bytes)');
  version += 1;
  const totalCodewords = [26,44,70,100][version-1];
  const ecCodewords = [7,10,15,20][version-1];
  const dataCodewordsCount = totalCodewords - ecCodewords;
  let bits = '0100' + bytes.length.toString(2).padStart(8,'0');
  bytes.forEach(b=> bits += b.toString(2).padStart(8,'0'));
  const maxBits = dataCodewordsCount*8;
  bits += '0'.repeat(Math.min(4, Math.max(0, maxBits-bits.length)));
  while(bits.length % 8 !== 0) bits += '0';
  const padBytes = [0xEC,0x11];
  let p=0;
  while(bits.length < maxBits){ bits += padBytes[p%2].toString(2).padStart(8,'0'); p++; }
  const dataCodewords = [];
  for(let i=0;i<bits.length;i+=8) dataCodewords.push(parseInt(bits.substr(i,8),2));
  const ecw = dvQrRsRemainder(dataCodewords, ecCodewords);
  return { version, allCodewords: dataCodewords.concat(ecw) };
}
function dvBuildQrMatrix(text){
  const { version, allCodewords } = dvQrEncodeData(text);
  const size = version*4+17;
  const modules = Array.from({length:size}, ()=> new Array(size).fill(null));
  const reserved = Array.from({length:size}, ()=> new Array(size).fill(false));
  function placeFinder(row,col){
    for(let r=-1;r<=7;r++) for(let c=-1;c<=7;c++){
      const rr=row+r, cc=col+c;
      if(rr<0||cc<0||rr>=size||cc>=size) continue;
      reserved[rr][cc]=true;
      if(r===-1||r===7||c===-1||c===7){ modules[rr][cc]=false; continue; }
      modules[rr][cc] = (r===0||r===6||c===0||c===6) || (r>=2&&r<=4&&c>=2&&c<=4);
    }
  }
  placeFinder(0,0); placeFinder(0,size-7); placeFinder(size-7,0);
  function placeAlignment(row,col){
    for(let r=-2;r<=2;r++) for(let c=-2;c<=2;c++){
      const rr=row+r, cc=col+c;
      reserved[rr][cc]=true;
      modules[rr][cc] = (Math.max(Math.abs(r),Math.abs(c)) !== 1);
    }
  }
  const ap = {1:null,2:18,3:22,4:26}[version];
  if(ap) placeAlignment(ap,ap);
  for(let i=8;i<size-8;i++){
    reserved[6][i]=true; modules[6][i]=(i%2===0);
    reserved[i][6]=true; modules[i][6]=(i%2===0);
  }
  for(let i=0;i<=8;i++){ reserved[8][i]=true; reserved[i][8]=true; }
  for(let i=size-8;i<size;i++){ reserved[8][i]=true; reserved[i][8]=true; }
  reserved[size-8][8]=true; modules[size-8][8]=true;
  const bitsArr = [];
  allCodewords.forEach(cw=>{ for(let i=7;i>=0;i--) bitsArr.push((cw>>i)&1); });
  let bitIndex=0, col=size-1, dir=-1;
  while(col>0){
    if(col===6) col--;
    for(let i=0;i<size;i++){
      const row = dir===-1 ? size-1-i : i;
      for(const c of [col, col-1]){
        if(!reserved[row][c]){
          const bit = bitIndex < bitsArr.length ? bitsArr[bitIndex++] : 0;
          const maskCond = ((row+c)%2===0) ? 1 : 0;
          modules[row][c] = !!(bit ^ maskCond);
        }
      }
    }
    col -= 2; dir = -dir;
  }
  const fmtBits = dvQrFormatBits(0).toString(2).padStart(15,'0').split('').map(Number);
  [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]]
    .forEach(([r,c],idx)=> modules[r][c] = !!fmtBits[idx]);
  [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],
   [8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]]
    .forEach(([r,c],idx)=> modules[r][c] = !!fmtBits[idx]);
  return modules;
}
function dvQrMatrixToSvg(modules){
  const size = modules.length;
  const scale = 8;
  const px = size*scale;
  let rects = '';
  for(let r=0;r<size;r++) for(let c=0;c<size;c++){
    if(modules[r][c]) rects += `<rect x="${c*scale}" y="${r*scale}" width="${scale}" height="${scale}" fill="#000"/>`;
  }
  return `<svg viewBox="0 0 ${px} ${px}" width="100%" style="background:#fff; border-radius:8px;">${rects}</svg>`;
}
function dvRenderQr(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.qr}QR Code Generator</div>
    <p class="dv-sub">Generated entirely on-device. Best for short text or URLs (up to ~78 characters).</p>
    <div class="dv-field"><textarea class="dv-textarea" id="dvQrInput" placeholder="Enter text or URL…"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvQrGenerate">${dvIcon.refresh}Generate QR</button></div>
    <div id="dvQrOutput" style="max-width:280px; margin:0 auto;"></div>
  </div>`;
  document.getElementById('dvQrGenerate').addEventListener('click', ()=>{
    const text = document.getElementById('dvQrInput').value;
    if(!text){ dvToast('Enter text first'); return; }
    try{
      const matrix = dvBuildQrMatrix(text);
      document.getElementById('dvQrOutput').innerHTML = dvQrMatrixToSvg(matrix);
    }catch(e){ dvToast(e.message); }
  });
}

/* =========================================================
   22. TEST CARD / IBAN GENERATOR (dummy test data only)
   ========================================================= */
function dvLuhnCheckDigit(digitsWithoutCheck){
  let sum = 0;
  const rev = digitsWithoutCheck.split('').reverse();
  for(let i=0;i<rev.length;i++){
    let d = Number(rev[i]);
    if(i % 2 === 0) { d *= 2; if(d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}
function dvGenerateTestCard(prefix, length){
  let num = prefix;
  while(num.length < length - 1) num += String(dvRandomInt(10));
  num += String(dvLuhnCheckDigit(num));
  return num;
}
function dvIbanMod97(str){
  let remainder = '';
  for(const ch of str){
    remainder += ch;
    if(remainder.length >= 9){ remainder = String(Number(remainder) % 97).padStart(remainder.length >= 9 ? 0 : 0, '0'); remainder = String(Number(remainder)); }
  }
  return Number(remainder) % 97;
}
function dvGenerateTestIban(countryCode){
  const letterToNum = c => (c.charCodeAt(0) - 55).toString();
  const bban = Array.from({length:20}, ()=> String(dvRandomInt(10))).join('');
  const rearranged = bban + countryCode.split('').map(letterToNum).join('') + '00';
  let numeric = '';
  for(const ch of rearranged) numeric += /[0-9]/.test(ch) ? ch : letterToNum(ch);
  let remainder = 0;
  for(const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  const checkDigits = String(98 - remainder).padStart(2,'0');
  return countryCode + checkDigits + bban;
}
function dvRenderTestCard(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.card}Test Card / IBAN Generator</div>
    <p class="dv-sub">Generates dummy numbers for development and QA use only — never real financial data.</p>
    <div class="dv-field">
      <div class="dv-label"><span>Card Type</span></div>
      <select class="dv-select" id="dvTcType">
        <option value="visa">Visa (starts 4)</option>
        <option value="mc">Mastercard (starts 5)</option>
        <option value="amex">American Express (starts 3)</option>
      </select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:14px;"><button class="dv-btn" id="dvTcCardGenerate">${dvIcon.refresh}Generate Test Card Number</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTcCardOutput" readonly></div>
    <div class="dv-btn-row" style="margin-bottom:20px;"><button class="dv-btn dv-btn-outline" id="dvTcCardCopy">${dvIcon.copy}Copy</button></div>

    <div class="dv-field">
      <div class="dv-label"><span>IBAN Country Code</span></div>
      <select class="dv-select" id="dvTcCountry">
        <option value="GB">GB — United Kingdom</option>
        <option value="DE">DE — Germany</option>
        <option value="FR">FR — France</option>
        <option value="NG">NG — Nigeria</option>
      </select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:14px;"><button class="dv-btn" id="dvTcIbanGenerate">${dvIcon.refresh}Generate Test IBAN</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTcIbanOutput" readonly></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvTcIbanCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvTcCardGenerate').addEventListener('click', ()=>{
    const type = document.getElementById('dvTcType').value;
    const config = { visa:{prefix:'4', length:16}, mc:{prefix:'5'+(1+dvRandomInt(5)), length:16}, amex:{prefix:'3'+(dvRandomInt(2)===0?'4':'7'), length:15} }[type];
    document.getElementById('dvTcCardOutput').value = dvGenerateTestCard(config.prefix, config.length);
  });
  document.getElementById('dvTcCardCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvTcCardOutput').value));
  document.getElementById('dvTcIbanGenerate').addEventListener('click', ()=>{
    document.getElementById('dvTcIbanOutput').value = dvGenerateTestIban(document.getElementById('dvTcCountry').value);
  });
  document.getElementById('dvTcIbanCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvTcIbanOutput').value));
}

/* =========================================================
   23. BARCODE GENERATOR (Code 128, Subset B)
   ========================================================= */
const DV_CODE128B_PATTERNS = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
function dvCode128BEncode(text){
  const values = [104]; // start code B
  for(const ch of text){
    const code = ch.charCodeAt(0) - 32;
    if(code < 0 || code > 94) throw new Error('Unsupported character: ' + ch);
    values.push(code);
  }
  let checksum = values[0];
  for(let i=1;i<values.length;i++) checksum += values[i] * i;
  values.push(checksum % 103);
  values.push(106); // stop code
  return values.map(v=> DV_CODE128B_PATTERNS[v]);
}
function dvBarcodeToSvg(patterns){
  const barWidth = 2;
  let x = 0;
  let rects = '';
  patterns.forEach(pattern=>{
    let bar = true;
    for(const ch of pattern){
      const w = Number(ch) * barWidth;
      if(bar) rects += `<rect x="${x}" y="0" width="${w}" height="80" fill="#000"/>`;
      x += w;
      bar = !bar;
    }
  });
  return `<svg viewBox="0 0 ${x} 80" width="100%" style="background:#fff; border-radius:8px;">${rects}</svg>`;
}
function dvRenderBarcode(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.barcode}Barcode Generator</div>
    <p class="dv-sub">Code 128 (Subset B) — supports standard ASCII characters.</p>
    <div class="dv-field"><input type="text" class="dv-input" id="dvBcInput" placeholder="Enter text or code…"></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvBcGenerate">${dvIcon.refresh}Generate</button></div>
    <div id="dvBcOutput"></div>
  </div>`;
  document.getElementById('dvBcGenerate').addEventListener('click', ()=>{
    const text = document.getElementById('dvBcInput').value;
    if(!text){ dvToast('Enter text first'); return; }
    try{
      const patterns = dvCode128BEncode(text);
      document.getElementById('dvBcOutput').innerHTML = dvBarcodeToSvg(patterns);
    }catch(e){ dvToast(e.message); }
  });
}

/* =========================================================
   24. IP ADDRESS GENERATOR
   ========================================================= */
function dvRenderIpAddr(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.network}IP Address Generator</div>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvIpModeV4" class="dv-seg-active">IPv4</button>
      <button id="dvIpModeV6">IPv6</button>
    </div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvIpOutput" readonly></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvIpGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvIpCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  let mode = 'v4';
  document.getElementById('dvIpModeV4').addEventListener('click', ()=>{
    mode='v4'; document.getElementById('dvIpModeV4').classList.add('dv-seg-active'); document.getElementById('dvIpModeV6').classList.remove('dv-seg-active');
  });
  document.getElementById('dvIpModeV6').addEventListener('click', ()=>{
    mode='v6'; document.getElementById('dvIpModeV6').classList.add('dv-seg-active'); document.getElementById('dvIpModeV4').classList.remove('dv-seg-active');
  });
  document.getElementById('dvIpGenerate').addEventListener('click', ()=>{
    if(mode==='v4'){
      document.getElementById('dvIpOutput').value = Array.from({length:4}, ()=> dvRandomInt(256)).join('.');
    } else {
      document.getElementById('dvIpOutput').value = Array.from({length:8}, ()=> dvRandomInt(65536).toString(16).padStart(4,'0')).join(':');
    }
  });
  document.getElementById('dvIpCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvIpOutput').value));
  document.getElementById('dvIpGenerate').click();
}

/* =========================================================
   25. CRON EXPRESSION BUILDER
   ========================================================= */
function dvRenderCron(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.cron}Cron Expression Builder</div>
    <div class="dv-field"><div class="dv-label"><span>Minute (0-59, or *)</span></div><input type="text" class="dv-input" id="dvCrMin" value="*"></div>
    <div class="dv-field"><div class="dv-label"><span>Hour (0-23, or *)</span></div><input type="text" class="dv-input" id="dvCrHour" value="*"></div>
    <div class="dv-field"><div class="dv-label"><span>Day of Month (1-31, or *)</span></div><input type="text" class="dv-input" id="dvCrDom" value="*"></div>
    <div class="dv-field"><div class="dv-label"><span>Month (1-12, or *)</span></div><input type="text" class="dv-input" id="dvCrMonth" value="*"></div>
    <div class="dv-field"><div class="dv-label"><span>Day of Week (0-6, Sun=0, or *)</span></div><input type="text" class="dv-input" id="dvCrDow" value="*"></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCrBuild">${dvIcon.refresh}Build Expression</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvCrOutput" readonly></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvCrCopy">${dvIcon.copy}Copy</button></div>
  </div>`;
  document.getElementById('dvCrBuild').addEventListener('click', ()=>{
    const parts = ['dvCrMin','dvCrHour','dvCrDom','dvCrMonth','dvCrDow'].map(id=> document.getElementById(id).value.trim() || '*');
    document.getElementById('dvCrOutput').value = parts.join(' ');
  });
  document.getElementById('dvCrCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvCrOutput').value));
  document.getElementById('dvCrBuild').click();
}

/* =========================================================
   26. USER-AGENT STRING GENERATOR
   ========================================================= */
const DV_UA_TEMPLATES = [
  ()=> `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${120+dvRandomInt(15)}.0.0.0 Safari/537.36`,
  ()=> `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/1${6+dvRandomInt(3)}.0 Safari/605.1.15`,
  ()=> `Mozilla/5.0 (Linux; Android 1${3+dvRandomInt(3)}; Pixel ${6+dvRandomInt(3)}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${120+dvRandomInt(15)}.0.0.0 Mobile Safari/537.36`,
  ()=> `Mozilla/5.0 (iPhone; CPU iPhone OS 1${6+dvRandomInt(3)}_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/1${6+dvRandomInt(3)}.0 Mobile/15E148 Safari/604.1`,
  ()=> `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${120+dvRandomInt(15)}.0.0.0 Safari/537.36`
];
function dvRenderUserAgent(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.browser}User-Agent Generator</div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvUaOutput" readonly></textarea></div>
    <div class="dv-btn-row">
      <button class="dv-btn" id="dvUaGenerate">${dvIcon.refresh}Generate</button>
      <button class="dv-btn dv-btn-outline" id="dvUaCopy">${dvIcon.copy}Copy</button>
    </div>
  </div>`;
  document.getElementById('dvUaGenerate').addEventListener('click', ()=>{
    document.getElementById('dvUaOutput').value = DV_UA_TEMPLATES[dvRandomInt(DV_UA_TEMPLATES.length)]();
  });
  document.getElementById('dvUaCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvUaOutput').value));
  document.getElementById('dvUaGenerate').click();
}

/* =========================================================
   27. HTTP STATUS CODE REFERENCE
   ========================================================= */
const DV_HTTP_STATUS = [
  [200,'OK','Request succeeded.'],[201,'Created','Resource created successfully.'],[204,'No Content','Succeeded, no response body.'],
  [301,'Moved Permanently','Resource moved to a new URL permanently.'],[302,'Found','Resource temporarily at a different URL.'],[304,'Not Modified','Cached version is still valid.'],
  [400,'Bad Request','Malformed request syntax.'],[401,'Unauthorized','Authentication required.'],[403,'Forbidden','Server understood but refuses to authorize.'],
  [404,'Not Found','Resource does not exist.'],[405,'Method Not Allowed','HTTP method not supported for this resource.'],[409,'Conflict','Request conflicts with current state.'],
  [422,'Unprocessable Entity','Request well-formed but semantically invalid.'],[429,'Too Many Requests','Rate limit exceeded.'],
  [500,'Internal Server Error','Unexpected server condition.'],[502,'Bad Gateway','Invalid response from upstream server.'],
  [503,'Service Unavailable','Server temporarily unable to handle request.'],[504,'Gateway Timeout','Upstream server did not respond in time.']
];
function dvRenderHttpStatus(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.http}HTTP Status Code Reference</div>
    <div class="dv-field"><input type="text" class="dv-input" id="dvHtSearch" placeholder="Search code or keyword…"></div>
    <div id="dvHtList"></div>
  </div>`;
  function paint(filter){
    const list = document.getElementById('dvHtList');
    const q = (filter||'').toLowerCase();
    const rows = DV_HTTP_STATUS.filter(([code,label,desc])=>
      String(code).includes(q) || label.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
    );
    list.innerHTML = rows.map(([code,label,desc])=>
      `<div class="dv-list-item" style="flex-direction:column; align-items:flex-start;">
        <strong>${code} — ${label}</strong><span style="font-family:var(--dv-font-family); color:var(--dv-text-sec);">${desc}</span>
      </div>`
    ).join('') || '<div class="dv-empty-note">No matching status codes.</div>';
  }
  document.getElementById('dvHtSearch').addEventListener('input', (e)=> paint(e.target.value));
  paint('');
}

/* =========================================================
   28. PLACEHOLDER IMAGE GENERATOR (on-device SVG)
   ========================================================= */
function dvRenderPlaceholderImg(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.image}Placeholder Image Generator</div>
    <p class="dv-sub">Generates an on-device SVG placeholder — no external requests.</p>
    <div class="dv-field"><div class="dv-label"><span>Width (px)</span></div><input type="number" class="dv-input" id="dvPiWidth" value="400"></div>
    <div class="dv-field"><div class="dv-label"><span>Height (px)</span></div><input type="number" class="dv-input" id="dvPiHeight" value="300"></div>
    <div class="dv-field"><div class="dv-label"><span>Background Color</span></div><input type="text" class="dv-input" id="dvPiBg" value="#1877F2"></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvPiGenerate">${dvIcon.refresh}Generate</button></div>
    <div id="dvPiPreview" style="text-align:center; margin-bottom:14px;"></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvPiOutput" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvPiCopy">${dvIcon.copy}Copy Data URI</button></div>
  </div>`;
  document.getElementById('dvPiGenerate').addEventListener('click', ()=>{
    const w = Number(document.getElementById('dvPiWidth').value) || 400;
    const h = Number(document.getElementById('dvPiHeight').value) || 300;
    const bg = document.getElementById('dvPiBg').value || '#1877F2';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='50%' font-family='Roboto,Arial,sans-serif' font-size='${Math.max(19,Math.min(w,h)/8)}' fill='#fff' text-anchor='middle' dominant-baseline='middle'>${w} x ${h}</text></svg>`;
    const dataUri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.getElementById('dvPiPreview').innerHTML = `<img src="${dataUri}" style="max-width:100%; border-radius:8px;">`;
    document.getElementById('dvPiOutput').value = dataUri;
  });
  document.getElementById('dvPiCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvPiOutput').value));
  document.getElementById('dvPiGenerate').click();
}

/* =========================================================
   29. GRADIENT CSS GENERATOR
   ========================================================= */
function dvRenderGradient(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.gradient}Gradient CSS Generator</div>
    <div class="dv-field"><div class="dv-label"><span>Type</span></div>
      <select class="dv-select" id="dvGrType"><option value="linear">Linear</option><option value="radial">Radial</option></select>
    </div>
    <div class="dv-field"><div class="dv-label"><span>Angle (linear only)</span><span class="dv-val" id="dvGrAngleVal">90°</span></div>
      <input type="range" class="dv-range" id="dvGrAngle" min="0" max="360" value="90">
    </div>
    <div class="dv-field"><div class="dv-label"><span>Color 1</span></div><input type="text" class="dv-input" id="dvGrC1" value="#1877F2"></div>
    <div class="dv-field"><div class="dv-label"><span>Color 2</span></div><input type="text" class="dv-input" id="dvGrC2" value="#9C27B0"></div>
    <div class="dv-btn-row" style="margin-bottom:14px;"><button class="dv-btn" id="dvGrGenerate">${dvIcon.refresh}Generate</button></div>
    <div id="dvGrPreview" style="height:100px; border-radius:10px; margin-bottom:14px; border:1.5px solid var(--dv-border);"></div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvGrOutput" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvGrCopy">${dvIcon.copy}Copy CSS</button></div>
  </div>`;
  const angleEl = document.getElementById('dvGrAngle');
  angleEl.addEventListener('input', ()=> document.getElementById('dvGrAngleVal').textContent = angleEl.value + '°');
  document.getElementById('dvGrGenerate').addEventListener('click', ()=>{
    const type = document.getElementById('dvGrType').value;
    const c1 = document.getElementById('dvGrC1').value || '#1877F2';
    const c2 = document.getElementById('dvGrC2').value || '#9C27B0';
    const css = type==='linear'
      ? `linear-gradient(${angleEl.value}deg, ${c1}, ${c2})`
      : `radial-gradient(circle, ${c1}, ${c2})`;
    document.getElementById('dvGrPreview').style.background = css;
    document.getElementById('dvGrOutput').value = `background: ${css};`;
  });
  document.getElementById('dvGrCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvGrOutput').value));
  document.getElementById('dvGrGenerate').click();
}

/* =========================================================
   30. BOX-SHADOW CSS GENERATOR
   ========================================================= */
function dvRenderBoxShadow(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.shadow}Box-Shadow CSS Generator</div>
    <div class="dv-field"><div class="dv-label"><span>Offset X</span><span class="dv-val" id="dvBsXVal">4px</span></div><input type="range" class="dv-range" id="dvBsX" min="-40" max="40" value="4"></div>
    <div class="dv-field"><div class="dv-label"><span>Offset Y</span><span class="dv-val" id="dvBsYVal">4px</span></div><input type="range" class="dv-range" id="dvBsY" min="-40" max="40" value="4"></div>
    <div class="dv-field"><div class="dv-label"><span>Blur</span><span class="dv-val" id="dvBsBlurVal">12px</span></div><input type="range" class="dv-range" id="dvBsBlur" min="0" max="80" value="12"></div>
    <div class="dv-field"><div class="dv-label"><span>Spread</span><span class="dv-val" id="dvBsSpreadVal">0px</span></div><input type="range" class="dv-range" id="dvBsSpread" min="-40" max="40" value="0"></div>
    <div class="dv-field"><div class="dv-label"><span>Color</span></div><input type="text" class="dv-input" id="dvBsColor" value="rgba(0,0,0,0.35)"></div>
    <div class="dv-check-row"><input type="checkbox" id="dvBsInset"><label for="dvBsInset">Inset</label></div>
    <div style="height:100px; display:flex; align-items:center; justify-content:center; margin:16px 0;">
      <div id="dvBsPreview" style="width:120px; height:70px; background:var(--dv-surface); border-radius:10px;"></div>
    </div>
    <div class="dv-field"><textarea class="dv-textarea dv-output" id="dvBsOutput" readonly></textarea></div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvBsCopy">${dvIcon.copy}Copy CSS</button></div>
  </div>`;
  function update(){
    const x = document.getElementById('dvBsX').value;
    const y = document.getElementById('dvBsY').value;
    const blur = document.getElementById('dvBsBlur').value;
    const spread = document.getElementById('dvBsSpread').value;
    const color = document.getElementById('dvBsColor').value || 'rgba(0,0,0,0.35)';
    const inset = document.getElementById('dvBsInset').checked ? 'inset ' : '';
    document.getElementById('dvBsXVal').textContent = x + 'px';
    document.getElementById('dvBsYVal').textContent = y + 'px';
    document.getElementById('dvBsBlurVal').textContent = blur + 'px';
    document.getElementById('dvBsSpreadVal').textContent = spread + 'px';
    const shadow = `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    document.getElementById('dvBsPreview').style.boxShadow = shadow;
    document.getElementById('dvBsOutput').value = `box-shadow: ${shadow};`;
  }
  ['dvBsX','dvBsY','dvBsBlur','dvBsSpread','dvBsColor','dvBsInset'].forEach(id=>{
    document.getElementById(id).addEventListener('input', update);
  });
  document.getElementById('dvBsCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvBsOutput').value));
  update();
}

/* =========================================================
   31. CSS UNIT CONVERTER
   ========================================================= */
function dvRenderCssUnit(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.ruler}CSS Unit Converter</div>
    <div class="dv-field"><div class="dv-label"><span>Base Font Size (px)</span></div><input type="number" class="dv-input" id="dvCuBase" value="16"></div>
    <div class="dv-field"><div class="dv-label"><span>Value</span></div><input type="number" class="dv-input" id="dvCuValue" value="16"></div>
    <div class="dv-field"><div class="dv-label"><span>From Unit</span></div>
      <select class="dv-select" id="dvCuFrom"><option value="px">px</option><option value="rem">rem</option><option value="em">em</option><option value="pt">pt</option><option value="percent">%</option></select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCuConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><div class="dv-label"><span>px</span></div><input type="text" class="dv-input dv-output" id="dvCuPx" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>rem</span></div><input type="text" class="dv-input dv-output" id="dvCuRem" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>em</span></div><input type="text" class="dv-input dv-output" id="dvCuEm" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>pt</span></div><input type="text" class="dv-input dv-output" id="dvCuPt" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>%</span></div><input type="text" class="dv-input dv-output" id="dvCuPercent" readonly></div>
  </div>`;
  document.getElementById('dvCuConvert').addEventListener('click', ()=>{
    const base = Number(document.getElementById('dvCuBase').value) || 16;
    const value = Number(document.getElementById('dvCuValue').value);
    const from = document.getElementById('dvCuFrom').value;
    if(isNaN(value)){ dvToast('Enter a valid value'); return; }
    let px;
    if(from==='px') px = value;
    else if(from==='rem') px = value * base;
    else if(from==='em') px = value * base;
    else if(from==='pt') px = value * (96/72);
    else if(from==='percent') px = (value/100) * base;
    document.getElementById('dvCuPx').value = px.toFixed(3) + 'px';
    document.getElementById('dvCuRem').value = (px/base).toFixed(4) + 'rem';
    document.getElementById('dvCuEm').value = (px/base).toFixed(4) + 'em';
    document.getElementById('dvCuPt').value = (px*(72/96)).toFixed(3) + 'pt';
    document.getElementById('dvCuPercent').value = ((px/base)*100).toFixed(2) + '%';
  });
  document.getElementById('dvCuConvert').click();
}

/* =========================================================
   32. NUMBER BASE CONVERTER
   ========================================================= */
function dvParseBigIntBase(str, base){
  let result = 0n;
  const bigBase = BigInt(base);
  for(const ch of str){
    const digit = parseInt(ch, base);
    if(isNaN(digit)) throw new Error('Invalid digit for base ' + base);
    result = result * bigBase + BigInt(digit);
  }
  return result;
}
function dvRenderNumBase(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.binary}Number Base Converter</div>
    <div class="dv-field"><div class="dv-label"><span>Input Value</span></div><input type="text" class="dv-input" id="dvNbInput" placeholder="Enter a number…"></div>
    <div class="dv-field">
      <div class="dv-label"><span>Input Base</span></div>
      <select class="dv-select" id="dvNbFrom">
        <option value="2">Binary (base 2)</option>
        <option value="8">Octal (base 8)</option>
        <option value="10" selected>Decimal (base 10)</option>
        <option value="16">Hexadecimal (base 16)</option>
      </select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvNbConvert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field"><div class="dv-label"><span>Binary</span></div><input type="text" class="dv-input dv-output" id="dvNbBin" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>Octal</span></div><input type="text" class="dv-input dv-output" id="dvNbOct" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>Decimal</span></div><input type="text" class="dv-input dv-output" id="dvNbDec" readonly></div>
    <div class="dv-field"><div class="dv-label"><span>Hexadecimal</span></div><input type="text" class="dv-input dv-output" id="dvNbHex" readonly></div>
  </div>`;
  document.getElementById('dvNbConvert').addEventListener('click', ()=>{
    const raw = document.getElementById('dvNbInput').value.trim();
    const base = Number(document.getElementById('dvNbFrom').value);
    if(!raw){ dvToast('Enter a value first'); return; }
    try{
      const value = dvParseBigIntBase(raw, base);
      document.getElementById('dvNbBin').value = value.toString(2);
      document.getElementById('dvNbOct').value = value.toString(8);
      document.getElementById('dvNbDec').value = value.toString(10);
      document.getElementById('dvNbHex').value = value.toString(16).toUpperCase();
    }catch(e){ dvToast('Invalid digit for the selected base'); }
  });
}

/* =========================================================
   33. COLOR CONTRAST CHECKER (WCAG)
   ========================================================= */
function dvHexToRgbArray(hex){
  const v = hex.replace('#','');
  return [0,2,4].map(i=> parseInt(v.substr(i,2),16));
}
function dvRelLuminance(hex){
  const [r,g,b] = dvHexToRgbArray(hex).map(c=>{
    c/=255;
    return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function dvContrastRatio(hex1, hex2){
  const l1=dvRelLuminance(hex1), l2=dvRelLuminance(hex2);
  const lighter=Math.max(l1,l2), darker=Math.min(l1,l2);
  return (lighter+0.05)/(darker+0.05);
}
function dvRenderContrast(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.contrast}Color Contrast Checker</div>
    <p class="dv-sub">WCAG 2.1 contrast ratio between two colors.</p>
    <div class="dv-field"><div class="dv-label"><span>Text Color</span></div><input type="text" class="dv-input" id="dvCcFg" value="#050505"></div>
    <div class="dv-field"><div class="dv-label"><span>Background Color</span></div><input type="text" class="dv-input" id="dvCcBg" value="#FFFFFF"></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvCcCheck">${dvIcon.refresh}Check Contrast</button></div>
    <div id="dvCcPreview" style="border-radius:12px; padding:20px; text-align:center; font-size:1.2rem; font-weight:700; margin-bottom:16px; border:1.5px solid var(--dv-border);">Sample Text</div>
    <div class="dv-field"><div class="dv-label"><span>Contrast Ratio</span><span class="dv-val" id="dvCcRatio">—</span></div></div>
    <div id="dvCcResults"></div>
  </div>`;
  document.getElementById('dvCcCheck').addEventListener('click', ()=>{
    const fg = document.getElementById('dvCcFg').value || '#000000';
    const bg = document.getElementById('dvCcBg').value || '#FFFFFF';
    let ratio;
    try{ ratio = dvContrastRatio(fg, bg); }catch(e){ dvToast('Enter valid hex colors'); return; }
    document.getElementById('dvCcPreview').style.color = fg;
    document.getElementById('dvCcPreview').style.background = bg;
    document.getElementById('dvCcRatio').textContent = ratio.toFixed(2) + ':1';
    const checks = [
      ['AA — Normal Text (≥4.5)', ratio >= 4.5],
      ['AA — Large Text (≥3.0)', ratio >= 3.0],
      ['AAA — Normal Text (≥7.0)', ratio >= 7.0],
      ['AAA — Large Text (≥4.5)', ratio >= 4.5]
    ];
    document.getElementById('dvCcResults').innerHTML = checks.map(([label, pass])=>
      `<div class="dv-list-item"><span>${label}</span><span style="font-weight:700; color:${pass ? 'var(--dv-success)' : 'var(--dv-danger)'};">${pass ? 'PASS' : 'FAIL'}</span></div>`
    ).join('');
  });
  document.getElementById('dvCcCheck').click();
}

/* =========================================================
   34. TEXT STATISTICS / WORD COUNTER
   ========================================================= */
function dvRenderTextStats(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.count}Text Statistics</div>
    <div class="dv-field"><textarea class="dv-textarea" id="dvTxInput" style="min-height:160px;" placeholder="Paste or type text…"></textarea></div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvTxAnalyze">${dvIcon.refresh}Analyze</button></div>
    <div id="dvTxResults"></div>
  </div>`;
  document.getElementById('dvTxAnalyze').addEventListener('click', ()=>{
    const text = document.getElementById('dvTxInput').value;
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g,'').length;
    const words = (text.trim().match(/\S+/g) || []).length;
    const sentences = (text.match(/[^.!?]+[.!?]+/g) || (text.trim() ? [text] : [])).length;
    const lines = text === '' ? 0 : text.split('\n').length;
    const paragraphs = (text.trim().split(/\n\s*\n/).filter(p=>p.trim())).length;
    const readingMinutes = Math.max(1, Math.ceil(words/200));
    const avgWordLen = words > 0 ? (charsNoSpace/words).toFixed(1) : '0.0';
    const rows = [
      ['Characters (with spaces)', chars],
      ['Characters (no spaces)', charsNoSpace],
      ['Words', words],
      ['Sentences', sentences],
      ['Lines', lines],
      ['Paragraphs', paragraphs],
      ['Average Word Length', avgWordLen],
      ['Estimated Reading Time', readingMinutes + ' min']
    ];
    document.getElementById('dvTxResults').innerHTML = rows.map(([label,val])=>
      `<div class="dv-list-item"><span>${label}</span><span style="font-weight:700; color:var(--dv-accent);">${val}</span></div>`
    ).join('');
  });
}

/* =========================================================
   35. IDENTICON / AVATAR GENERATOR (on-device, deterministic)
   ========================================================= */
function dvBuildIdenticon(seed){
  const hashHex = dvCrc32(seed || 'dv-gensuite');
  const hashInt = parseInt(hashHex, 16);
  const hue = hashInt % 360;
  const color = `hsl(${hue}, 62%, 48%)`;
  const bits = [];
  for(let i=0;i<15;i++) bits.push((hashInt >> i) & 1);
  const grid = [];
  for(let r=0;r<5;r++){
    const rowBits = bits.slice(r*3, r*3+3);
    grid.push([rowBits[0], rowBits[1], rowBits[2], rowBits[1], rowBits[0]]);
  }
  return { grid, color };
}
function dvIdenticonToSvg(built){
  const cell=40, size=5*cell;
  let rects = `<rect width="${size}" height="${size}" fill="var(--dv-bg)"/>`;
  built.grid.forEach((row,r)=> row.forEach((v,c)=>{
    if(v) rects += `<rect x="${c*cell}" y="${r*cell}" width="${cell}" height="${cell}" fill="${built.color}"/>`;
  }));
  return `<svg viewBox="0 0 ${size} ${size}" width="220" height="220" style="border-radius:16px; border:1.5px solid var(--dv-border);">${rects}</svg>`;
}
function dvRenderIdenticon(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.identicon}Identicon Generator</div>
    <p class="dv-sub">Deterministic geometric avatar generated on-device from a seed — same seed always produces the same identicon.</p>
    <div class="dv-field"><input type="text" class="dv-input" id="dvIdSeed" placeholder="Enter a username, email, or any seed…"></div>
    <div class="dv-btn-row" style="margin-bottom:18px;"><button class="dv-btn" id="dvIdGenerate">${dvIcon.refresh}Generate</button></div>
    <div style="text-align:center;" id="dvIdPreview"></div>
  </div>`;
  document.getElementById('dvIdGenerate').addEventListener('click', ()=>{
    const seed = document.getElementById('dvIdSeed').value;
    if(!seed){ dvToast('Enter a seed value first'); return; }
    document.getElementById('dvIdPreview').innerHTML = dvIdenticonToSvg(dvBuildIdenticon(seed));
  });
}

/* =========================================================
   36. BASE32 ENCODER / DECODER (RFC 4648)
   ========================================================= */
const DV_BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function dvBase32Encode(bytes){
  let bits=''; let output='';
  for(const b of bytes) bits += b.toString(2).padStart(8,'0');
  for(let i=0;i<bits.length;i+=5){
    let chunk = bits.substr(i,5);
    if(chunk.length<5) chunk = chunk.padEnd(5,'0');
    output += DV_BASE32_ALPHABET[parseInt(chunk,2)];
  }
  while(output.length % 8 !== 0) output += '=';
  return output;
}
function dvBase32Decode(str){
  const clean = str.toUpperCase().replace(/=+$/,'').replace(/\s/g,'');
  let bits='';
  for(const ch of clean){
    const val = DV_BASE32_ALPHABET.indexOf(ch);
    if(val === -1) throw new Error('Invalid Base32 character: ' + ch);
    bits += val.toString(2).padStart(5,'0');
  }
  const bytes = [];
  for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.substr(i,8),2));
  return new Uint8Array(bytes);
}
let dvB32Mode = 'encode';
function dvRenderBase32(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.code}Base32 Encoder / Decoder</div>
    <p class="dv-sub">RFC 4648 — commonly used for TOTP/2FA secrets.</p>
    <div class="dv-seg" style="margin-bottom:16px;">
      <button id="dvB32ModeEncode" class="${dvB32Mode==='encode'?'dv-seg-active':''}">Encode</button>
      <button id="dvB32ModeDecode" class="${dvB32Mode==='decode'?'dv-seg-active':''}">Decode</button>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span id="dvB32InLabel">Text Input</span></div>
      <textarea class="dv-textarea" id="dvB32Input" placeholder="Type or paste content…"></textarea>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvB32Convert">${dvIcon.refresh}Convert</button></div>
    <div class="dv-field">
      <div class="dv-label"><span id="dvB32OutLabel">Base32 Output</span></div>
      <textarea class="dv-textarea dv-output" id="dvB32Output" readonly></textarea>
    </div>
    <div class="dv-btn-row"><button class="dv-btn dv-btn-outline" id="dvB32Copy">${dvIcon.copy}Copy Output</button></div>
  </div>`;
  document.getElementById('dvB32ModeEncode').addEventListener('click', ()=>{ dvB32Mode='encode'; dvRenderBase32(main); });
  document.getElementById('dvB32ModeDecode').addEventListener('click', ()=>{ dvB32Mode='decode'; dvRenderBase32(main); });
  document.getElementById('dvB32Convert').addEventListener('click', ()=>{
    const input = document.getElementById('dvB32Input').value;
    if(!input){ dvToast('Enter input first'); return; }
    try{
      if(dvB32Mode === 'encode'){
        document.getElementById('dvB32Output').value = dvBase32Encode(new TextEncoder().encode(input));
      } else {
        document.getElementById('dvB32Output').value = new TextDecoder(undefined,{fatal:false}).decode(dvBase32Decode(input));
      }
    }catch(e){ dvToast(e.message || 'Invalid Base32 input'); }
  });
  document.getElementById('dvB32Copy').addEventListener('click', ()=> dvCopy(document.getElementById('dvB32Output').value));
  document.getElementById('dvB32InLabel').textContent = dvB32Mode==='encode' ? 'Text Input' : 'Base32 Input';
  document.getElementById('dvB32OutLabel').textContent = dvB32Mode==='encode' ? 'Base32 Output' : 'Decoded Output';
}

/* =========================================================
   37. TOTP / 2FA CODE GENERATOR (RFC 6238, HMAC-SHA1)
   ========================================================= */
async function dvGenerateTotp(secretBase32, period, digits){
  const keyBytes = dvBase32Decode(secretBase32);
  if(keyBytes.length === 0) throw new Error('Invalid Base32 secret');
  const counter = Math.floor(Date.now()/1000/period);
  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setUint32(0, 0);
  view.setUint32(4, counter);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBuf));
  const offset = sig[sig.length-1] & 0xf;
  const binCode = ((sig[offset] & 0x7f) << 24) | ((sig[offset+1] & 0xff) << 16) | ((sig[offset+2] & 0xff) << 8) | (sig[offset+3] & 0xff);
  const otp = (binCode % (10**digits)).toString().padStart(digits, '0');
  const secondsRemaining = period - (Math.floor(Date.now()/1000) % period);
  return { otp, secondsRemaining };
}
function dvRenderTotp(main){
  main.innerHTML = `
  <div class="dv-card">
    <div class="dv-card-title">${dvIcon.totp}TOTP / 2FA Code Generator</div>
    <p class="dv-sub">RFC 6238 time-based codes, computed on-device via HMAC-SHA1. Your secret never leaves this screen.</p>
    <div class="dv-field"><div class="dv-label"><span>Base32 Secret</span></div><input type="text" class="dv-input" id="dvTpSecret" placeholder="e.g. GEZDGNBVGY3TQOJQ"></div>
    <div class="dv-field">
      <div class="dv-label"><span>Digits</span></div>
      <select class="dv-select" id="dvTpDigits"><option value="6" selected>6</option><option value="8">8</option></select>
    </div>
    <div class="dv-field">
      <div class="dv-label"><span>Period (seconds)</span></div>
      <select class="dv-select" id="dvTpPeriod"><option value="30" selected>30</option><option value="60">60</option></select>
    </div>
    <div class="dv-btn-row" style="margin-bottom:16px;"><button class="dv-btn" id="dvTpGenerate">${dvIcon.refresh}Generate Code</button></div>
    <div class="dv-field"><input type="text" class="dv-input dv-output" id="dvTpOutput" readonly style="font-size:1.6rem; text-align:center; letter-spacing:4px; font-weight:700;"></div>
    <div class="dv-strength-bar"><div class="dv-strength-fill" id="dvTpBar" style="background:var(--dv-accent);"></div></div>
    <div class="dv-strength-label" id="dvTpTimer">&nbsp;</div>
    <div class="dv-btn-row" style="margin-top:14px;"><button class="dv-btn dv-btn-outline" id="dvTpCopy">${dvIcon.copy}Copy Code</button></div>
  </div>`;
  let dvTpInterval = null;
  async function refresh(){
    const secret = document.getElementById('dvTpSecret').value.trim();
    if(!secret){ dvToast('Enter a Base32 secret first'); return; }
    const digits = Number(document.getElementById('dvTpDigits').value);
    const period = Number(document.getElementById('dvTpPeriod').value);
    try{
      const { otp, secondsRemaining } = await dvGenerateTotp(secret, period, digits);
      document.getElementById('dvTpOutput').value = otp;
      document.getElementById('dvTpBar').style.width = ((secondsRemaining/period)*100) + '%';
      document.getElementById('dvTpTimer').textContent = `Refreshes in ${secondsRemaining}s`;
    }catch(e){ dvToast(e.message || 'Invalid secret'); }
  }
  document.getElementById('dvTpGenerate').addEventListener('click', ()=>{
    refresh();
    if(dvTpInterval) clearInterval(dvTpInterval);
    dvTpInterval = setInterval(refresh, 1000);
  });
  document.getElementById('dvTpCopy').addEventListener('click', ()=> dvCopy(document.getElementById('dvTpOutput').value));
}

/* =========================================================
   DV LEFT DRAWER (INFO MENU) + INFO MODAL
   ========================================================= */
const DV_INFO_CONTENT = {
  'about-us': {
    title:'About Us',
    icon:dvIcon.book,
    body:`<div class="dv-info-text">
      <p>Biblefirm is a ministry technology initiative building an ecosystem of Progressive Web Apps for education, community, productivity, and engagement.</p>
      <p>Our mission is to reach six million souls across six continents through digital technology, putting practical, well-built tools into the hands of the body of Christ.</p>
    </div>`
  },
  'about-app': {
    title:'About the App',
    icon:dvIcon.code,
    body:`<div class="dv-info-text">
      <p><strong>DV GenSuite</strong> is a switchable developer-utility toolkit built on the DV Architecture — a proprietary, Android-first design system used across the Biblefirm app ecosystem.</p>
      <p>Every generator runs entirely on-device using the Web Crypto API. No data ever leaves your phone or tablet.</p>
    </div>`
  },
  'about-dev': {
    title:'About Developer',
    icon:dvIcon.shield,
    body:`<div class="dv-info-text">
      <p><strong>Chris Johnson, PhD</strong> is the founder and lead developer of Biblefirm, personally designing and building the full DV app ecosystem on Android phone and tablet.</p>
      <p>Every app in the ecosystem follows the same DV Architecture — a consistent, ownership-marked design language built for ministry use at scale.</p>
    </div>`
  },
  'warning': {
    title:'Proprietary Software Warning',
    icon:dvIcon.lock,
    body:`<div class="dv-info-text">
      <div class="dv-warning-box">
        <p>This application and its complete source code are proprietary property of Biblefirm and built under the DV Architecture.</p>
        <p>Unauthorized copying, cloning, redistribution, or rebranding of this software — in whole or in part — is strictly prohibited.</p>
      </div>
      <p>The "dv" / "DV" namespace embedded throughout this codebase serves as an ownership marker identifying original Biblefirm authorship.</p>
    </div>`
  },
  'how-to-use': {
    title:'How to Use',
    icon:dvIcon.check,
    body:`<div class="dv-info-text">
      <p><strong>1.</strong> Tap the ☰ menu (top left) for About, Warning, Help, and Contact information.</p>
      <p><strong>2.</strong> Tap the ⋮ menu (top right) to change accent color, dark mode, font size, and font style, or to install / share the app.</p>
      <p><strong>3.</strong> Scroll the generator strip below the top bar to pick any tool, or use the arrow to return Home.</p>
      <p><strong>4.</strong> From the Home screen, use Quick Actions or Recent Generators to jump back into frequently used tools.</p>
    </div>`
  },
  'contact-us': {
    title:'Contact Us',
    icon:dvIcon.mail,
    body:`<div class="dv-info-text">
      <p>For questions, feedback, or ministry partnership inquiries regarding Biblefirm and the DV app ecosystem, reach out through your usual Biblefirm contact channel.</p>
      <p>We welcome feedback that helps this toolkit better serve developers and ministry teams alike.</p>
    </div>
    <div class="dv-contact-divider"></div>
    <div class="dv-contact-cta">Let's Stay Connected</div>
    <p class="dv-contact-sub">Reach the Biblefirm team on your preferred channel below.</p>
    <div class="dv-contact-grid">
      <button class="dv-contact-btn" id="dvContactEmail" aria-label="Email">${dvIcon.emailFilled}</button>
      <button class="dv-contact-btn" id="dvContactWhatsapp" aria-label="WhatsApp">${dvIcon.whatsapp}</button>
      <button class="dv-contact-btn" id="dvContactFacebook" aria-label="Facebook">${dvIcon.facebook}</button>
      <button class="dv-contact-btn" id="dvContactFbPage" aria-label="Facebook Page">${dvIcon.fbpage}</button>
    </div>`
  }
};
function dvOpenInfoModal(id){
  const entry = DV_INFO_CONTENT[id];
  if(!entry) return;
  document.getElementById('dvModalInfoTitle').textContent = entry.title;
  document.getElementById('dvModalInfoBody').innerHTML = `
    <div class="dv-info-card">
      <div class="dv-info-icon-badge">${entry.icon}</div>
      ${entry.body}
    </div>`;
  document.getElementById('dvModalInfo').classList.add('dv-open');
  if(id === 'contact-us'){
    const dvContactLink = (url)=> window.open(url, '_blank');
    document.getElementById('dvContactEmail').addEventListener('click', ()=> dvContactLink('mailto:contact@biblefirm.org'));
    document.getElementById('dvContactWhatsapp').addEventListener('click', ()=> dvContactLink('https://wa.me/10000000000'));
    document.getElementById('dvContactFacebook').addEventListener('click', ()=> dvContactLink('https://facebook.com/biblefirm'));
    document.getElementById('dvContactFbPage').addEventListener('click', ()=> dvContactLink('https://facebook.com/biblefirmpage'));
  }
}
document.getElementById('dvBtnCloseInfo').addEventListener('click', ()=>{
  document.getElementById('dvModalInfo').classList.remove('dv-open');
});
document.querySelectorAll('#dvDrawerInfo [data-info]').forEach(btn=>{
  btn.addEventListener('click', ()=>{ dvCloseDrawers(); dvOpenInfoModal(btn.dataset.info); });
});

/* =========================================================
   DV DRAWER CONTROL
   ========================================================= */
const dvDrawerInfo = document.getElementById('dvDrawerInfo');
const dvDrawerSettings = document.getElementById('dvDrawerSettings');
const dvScrim = document.getElementById('dvScrim');
function dvOpenLeftDrawer(){ dvDrawerInfo.classList.add('dv-open'); dvScrim.classList.add('dv-open'); }
function dvOpenRightDrawer(){ dvDrawerSettings.classList.add('dv-open'); dvScrim.classList.add('dv-open'); }
function dvCloseDrawers(){ dvDrawerInfo.classList.remove('dv-open'); dvDrawerSettings.classList.remove('dv-open'); dvScrim.classList.remove('dv-open'); }
document.getElementById('dvBtnLeftMenu').addEventListener('click', dvOpenLeftDrawer);
document.getElementById('dvBtnRightMenu').addEventListener('click', dvOpenRightDrawer);
document.getElementById('dvBtnExitLeft').addEventListener('click', dvCloseDrawers);
document.getElementById('dvBtnExitRight').addEventListener('click', dvCloseDrawers);
dvScrim.addEventListener('click', dvCloseDrawers);

/* =========================================================
   DV SETTINGS DRAWER — CONTROLS
   ========================================================= */
function dvRenderAccentGrid(){
  const grid = document.getElementById('dvAccentGrid');
  grid.innerHTML = DV_ACCENTS.map(c=>
    `<button class="dv-accent-swatch ${dvSettings.accent===c?'dv-accent-active':''}" style="background:${c}" data-accent="${c}">${dvSettings.accent===c?dvIcon.check:''}</button>`
  ).join('');
  grid.querySelectorAll('[data-accent]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      dvSettings.accent = btn.dataset.accent;
      dvApplySettings(); dvSaveSettings(); dvRenderAccentGrid();
    });
  });
}
function dvRenderFontOptions(){
  const wrap = document.getElementById('dvFontOptions');
  wrap.innerHTML = DV_FONTS.map(f=>
    `<button class="dv-font-option ${dvSettings.fontId===f.id?'dv-font-active':''}" data-font="${f.id}" style="font-family:${f.family}">
      <span>${f.label}</span>${dvIcon.check}
    </button>`
  ).join('');
  wrap.querySelectorAll('[data-font]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      dvSettings.fontId = btn.dataset.font;
      dvApplySettings(); dvSaveSettings(); dvRenderFontOptions();
    });
  });
}
function dvRenderSettingsUI(){
  dvRenderAccentGrid();
  dvRenderFontOptions();
  const darkSwitch = document.getElementById('dvSwitchDark');
  darkSwitch.classList.toggle('dv-switch-on', dvSettings.dark);
  document.getElementById('dvFontScaleSlider').value = dvSettings.fontScale;
  document.getElementById('dvFontScaleVal').textContent = dvSettings.fontScale + '%';
}
document.getElementById('dvSwitchDark').addEventListener('click', ()=>{
  dvSettings.dark = !dvSettings.dark;
  dvApplySettings(); dvSaveSettings();
  document.getElementById('dvSwitchDark').classList.toggle('dv-switch-on', dvSettings.dark);
});
document.getElementById('dvFontScaleSlider').addEventListener('input', (e)=>{
  dvSettings.fontScale = Number(e.target.value);
  document.getElementById('dvFontScaleVal').textContent = dvSettings.fontScale + '%';
  dvApplySettings(); dvSaveSettings();
});

/* ---- Install App ---- */
let dvDeferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  dvDeferredInstallPrompt = e;
});
document.getElementById('dvBtnInstallApp').addEventListener('click', async ()=>{
  if(dvDeferredInstallPrompt){
    dvDeferredInstallPrompt.prompt();
    await dvDeferredInstallPrompt.userChoice;
    dvDeferredInstallPrompt = null;
  } else {
    dvToast('App is already installed or install is not available on this browser');
  }
});

/* ---- Share App ---- */
document.getElementById('dvBtnShareApp').addEventListener('click', async ()=>{
  const shareData = { title:'DV GenSuite', text:'Check out DV GenSuite — a developer generator toolkit by Biblefirm.', url: window.location.href };
  if(navigator.share){
    try{ await navigator.share(shareData); }catch(e){ /* user cancelled share */ }
  } else {
    dvCopy(window.location.href);
  }
});

/* ---- PWA ---- */
function dvSetupPWA(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .catch(err => console.warn('DV: SW registration failed', err));
  }
}

/* =========================================================
   DV BOOT
   ========================================================= */
function dvBoot(){
  try{
    dvLoadSettings();
    dvLoadRecent();
    dvApplySettings();
    dvRenderSettingsUI();
    dvRenderGenNav();
    dvRenderHome();
    dvSetupPWA();
  }catch(e){ console.error('DV Boot error:', e); }
}
document.addEventListener('DOMContentLoaded', dvBoot);
if(document.readyState !== 'loading') dvBoot();

})();

