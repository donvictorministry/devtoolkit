/* =====================================================================
   DV Standalone Widget: network-inspect.js
   Paste any URL, tap a button, inspect the response: status, headers,
   content-type/size, and timing breakdown where the browser allows it.

   100% self-contained: own CSS, HTML and JS, mounted into a private
   Shadow DOM root so it can never clash with the host app's styles or
   element IDs. Auto-builds itself on load and injects its own floating
   trigger button. Delete this <script> tag (or the file) and the app
   loses nothing else — this widget owns everything it needs.

   Honest limitation (browser security, not a bug): detailed timing
   (DNS/TCP/TTFB) and response headers are only readable for same-origin
   requests or cross-origin requests the target server explicitly allows
   via CORS / Timing-Allow-Origin. Where the browser withholds a value,
   this tool shows "restricted by browser" instead of guessing.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvNetInspectHost')) return;

const dvHost = document.createElement('div');
dvHost.id = 'dvNetInspectHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }
  .dv-fab{
    position: fixed; right: 16px; bottom: 88px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%;
    background: #00BCD4; color: #fff; border: none;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 18px rgba(0,0,0,.3);
    font-family: Roboto, Arial, sans-serif;
  }
  .dv-fab:active{ transform: scale(.94); }
  .dv-fab svg{ width: 24px; height: 24px; }

  .dv-modal{
    position: fixed; inset: 0;
    width: 100dvw; height: 100dvh;
    background: #0d1117; color: #c9d1d9;
    z-index: 2147483001;
    display: none; flex-direction: column;
    font-family: Roboto, Arial, sans-serif;
  }
  .dv-modal.dv-open{ display: flex; }

  .dv-bar{
    flex-shrink: 0; height: 56px; background: #161b22;
    display: flex; align-items: center; gap: 8px; padding: 0 10px;
    border-bottom: 1px solid #30363d;
  }
  .dv-icon-btn{
    width: 40px; height: 40px; border-radius: 50%; border: none;
    background: transparent; color: #c9d1d9; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .dv-icon-btn:active{ background: rgba(255,255,255,.12); }
  .dv-url-input{
    flex: 1; min-width: 0; height: 40px; border-radius: 8px;
    border: 1.5px solid #30363d; background: #0d1117; color: #c9d1d9;
    padding: 0 12px; font-size: 1rem; font-family: Roboto, Arial, sans-serif;
  }
  .dv-url-input:focus{ outline: none; border-color: #00BCD4; }
  .dv-go-btn{
    height: 40px; padding: 0 16px; border-radius: 8px; border: none;
    background: #00BCD4; color: #fff; font-weight: 700; flex-shrink: 0;
  }
  .dv-go-btn:active{ filter: brightness(.85); }

  .dv-body{ flex: 1; overflow-y: auto; padding: 16px; }
  .dv-empty{
    color: #6e7681; font-size: 1rem; text-align: center; padding: 40px 20px;
  }
  .dv-card{
    background: #161b22; border: 1px solid #30363d; border-radius: 12px;
    padding: 16px; margin-bottom: 14px;
  }
  .dv-card h3{
    margin: 0 0 12px 0; font-size: 1.05rem; color: #58a6ff; font-weight: 700;
  }
  .dv-row{
    display: flex; justify-content: space-between; gap: 12px;
    padding: 7px 0; border-bottom: 1px solid #21262d; font-size: .92rem;
  }
  .dv-row:last-child{ border-bottom: none; }
  .dv-row .dv-k{ color: #8b949e; flex-shrink: 0; }
  .dv-row .dv-v{ color: #c9d1d9; text-align: right; word-break: break-word; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .dv-v.dv-na{ color: #6e7681; font-style: italic; }
  .dv-v.dv-ok{ color: #3fb950; }
  .dv-v.dv-fail{ color: #f85149; }
  .dv-note{ font-size: .82rem; color: #6e7681; margin-top: 10px; line-height: 1.5; }
</style>

<button class="dv-fab" id="dvFab" aria-label="Inspect Network">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
</button>

<div class="dv-modal" id="dvModal">
  <div class="dv-bar">
    <button class="dv-icon-btn" id="dvClose" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <input type="text" class="dv-url-input" id="dvUrlInput" placeholder="Paste a URL, e.g. https://example.com" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false">
    <button class="dv-go-btn" id="dvGoBtn">Inspect</button>
  </div>
  <div class="dv-body" id="dvBody">
    <div class="dv-empty" id="dvEmptyState">Paste a URL above and tap Inspect to see status, headers, and timing.</div>
  </div>
</div>
`;

const dvFab = dvRoot.getElementById('dvFab');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvUrlInput = dvRoot.getElementById('dvUrlInput');
const dvGoBtn = dvRoot.getElementById('dvGoBtn');
const dvBody = dvRoot.getElementById('dvBody');

function dvOpenModal(){ dvModal.classList.add('dv-open'); dvUrlInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

function dvRow(label, value, cls){
  return `<div class="dv-row"><span class="dv-k">${label}</span><span class="dv-v ${cls||''}">${value}</span></div>`;
}
function dvFmtBytes(n){
  if(n == null || isNaN(n)) return null;
  if(n < 1024) return n + ' B';
  if(n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(2) + ' MB';
}
function dvFmtMs(n){
  return (n == null || n <= 0) ? null : Math.round(n) + ' ms';
}

async function dvInspect(){
  let url = dvUrlInput.value.trim();
  if(!url){ dvBody.innerHTML = `<div class="dv-empty">Enter a URL first.</div>`; return; }
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;

  dvBody.innerHTML = `<div class="dv-empty">Inspecting…</div>`;
  const startWallClock = performance.now();

  try{
    const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
    const totalMs = performance.now() - startWallClock;
    const headerRows = [];
    let headerCount = 0;
    for(const [key, value] of response.headers.entries()){
      headerRows.push(dvRow(key, value));
      headerCount++;
    }
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    // Resource Timing API — only populated with detail for same-origin
    // or Timing-Allow-Origin-permitted cross-origin requests.
    let timingHtml = '';
    try{
      const entries = performance.getEntriesByType('resource').filter(e => e.name === url || e.name === url + '/');
      const entry = entries[entries.length - 1];
      if(entry){
        const dns = dvFmtMs(entry.domainLookupEnd - entry.domainLookupStart);
        const tcp = dvFmtMs(entry.connectEnd - entry.connectStart);
        const ttfb = dvFmtMs(entry.responseStart - entry.requestStart);
        const download = dvFmtMs(entry.responseEnd - entry.responseStart);
        timingHtml = dvRow('DNS Lookup', dns || 'restricted by browser', dns ? '' : 'dv-na')
          + dvRow('TCP Connect', tcp || 'restricted by browser', tcp ? '' : 'dv-na')
          + dvRow('Time to First Byte', ttfb || 'restricted by browser', ttfb ? '' : 'dv-na')
          + dvRow('Download', download || 'restricted by browser', download ? '' : 'dv-na');
      }
    }catch(e){ /* Resource Timing unavailable — skip silently */ }

    dvBody.innerHTML = `
      <div class="dv-card">
        <h3>Response</h3>
        ${dvRow('Status', response.status + ' ' + response.statusText, response.ok ? 'dv-ok' : 'dv-fail')}
        ${dvRow('Response Type', response.type)}
        ${dvRow('Total Time', dvFmtMs(totalMs))}
        ${dvRow('Content-Type', contentType || 'restricted by browser', contentType ? '' : 'dv-na')}
        ${dvRow('Content-Length', contentLength ? dvFmtBytes(Number(contentLength)) : 'restricted by browser', contentLength ? '' : 'dv-na')}
        ${dvRow('Redirected', response.redirected ? 'Yes' : 'No')}
      </div>
      ${timingHtml ? `<div class="dv-card"><h3>Timing Breakdown</h3>${timingHtml}</div>` : ''}
      <div class="dv-card">
        <h3>Response Headers ${headerCount ? '(' + headerCount + ')' : ''}</h3>
        ${headerCount ? headerRows.join('') : dvRow('Headers', 'restricted by browser (CORS)', 'dv-na')}
        <div class="dv-note">Browsers only expose headers and precise timing for same-origin requests, or cross-origin requests where the server opts in via CORS / Timing-Allow-Origin. This is a browser security rule, not a limitation of this tool.</div>
      </div>
    `;
  }catch(err){
    dvBody.innerHTML = `
      <div class="dv-card">
        <h3>Request Failed</h3>
        ${dvRow('Reason', 'Network error or blocked by CORS', 'dv-fail')}
        <div class="dv-note">Most third-party sites block cross-origin requests made directly from a browser page (CORS). This is expected behavior for many URLs, not a bug in this tool. API endpoints that explicitly allow CORS will work.</div>
      </div>`;
  }
}

dvFab.addEventListener('click', dvOpenModal);
dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvInspect);
dvUrlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') dvInspect(); });

})();
