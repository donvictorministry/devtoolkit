/* =====================================================================
   DV Standalone Widget: source-code.js
   Paste any URL, view its fetched source in a full-page (100dvh x 100dvw,
   edge-to-edge) dedicated code viewer.

   - Default theme: LIGHT. Syncs automatically with the host app's dark
     mode toggle (watches <html class="dv-dark">) if present — falls
     back to light-only if used standalone, with no errors either way.
   - Minimum text size: 19px, everywhere, no exceptions.
   - No browser alert/confirm/prompt anywhere — all feedback is in-UI.
   - Referrer-Policy is forced to "no-referrer" (both a document-level
     <meta> tag, injected once, and per-request) so the site whose
     source you're viewing never sees this app in its logs.
    That fallback path is clearly labeled in the UI, since my
     URL and the response do pass through a third party at that point.

   100% self-contained: own CSS, HTML and JS, mounted into a private
   Shadow DOM root. Delete this <script> tag (or the file) and nothing
   else breaks — this widget owns everything it needs.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvSourceCodeHost')) return;

/* ---------- Referrer-Policy: block it at the document level (idempotent) ---------- */
if(!document.querySelector('meta[name="referrer"]')){
  const dvMeta = document.createElement('meta');
  dvMeta.setAttribute('name', 'referrer');
  dvMeta.setAttribute('content', 'no-referrer');
  document.head.insertBefore(dvMeta, document.head.firstChild);
}

const DV_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const dvHost = document.createElement('div');
dvHost.id = 'dvSourceCodeHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }

  .dv-widget-root{
    --dv-bg: #F0F2F5;
    --dv-surface: #FFFFFF;
    --dv-text: #050505;
    --dv-text-sec: #65676B;
    --dv-border: #DADDE1;
    --dv-accent: #1877F2;
    --dv-code-bg: #F6F8FA;
    --dv-code-text: #24292E;
    --dv-danger: #E41E3F;
    font-family: Roboto, Arial, sans-serif;
  }
  .dv-widget-root.dv-dark{
    --dv-bg: #18191A;
    --dv-surface: #242526;
    --dv-text: #E4E6EB;
    --dv-text-sec: #B0B3B8;
    --dv-border: #3A3B3C;
    --dv-code-bg: #0D1117;
    --dv-code-text: #C9D1D9;
  }

  .dv-fab{
    position: fixed; right: 16px; bottom: 24px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--dv-accent); color: #fff; border: none;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 18px rgba(0,0,0,.3);
  }
  .dv-fab:active{ transform: scale(.94); }
  .dv-fab svg{ width: 26px; height: 26px; }

  .dv-modal{
    position: fixed; inset: 0;
    width: 100dvw; height: 100dvh;
    background: var(--dv-surface); color: var(--dv-text);
    z-index: 2147483001;
    display: none; flex-direction: column;
  }
  .dv-modal.dv-open{ display: flex; }

  .dv-bar{
    flex-shrink: 0; height: 60px; background: var(--dv-accent);
    display: flex; align-items: center; gap: 8px; padding: 0 10px;
  }
  .dv-icon-btn{
    width: 44px; height: 44px; border-radius: 50%; border: none;
    background: transparent; color: #fff; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .dv-icon-btn:active{ background: rgba(255,255,255,.2); }
  .dv-url-input{
    flex: 1; min-width: 0; height: 44px; border-radius: 10px;
    border: none; background: rgba(255,255,255,.95); color: #050505;
    padding: 0 14px; font-size: 19px; font-family: Roboto, Arial, sans-serif;
  }

  .dv-url-input:focus{ outline: 2px solid #fff; }

  .dv-status{
    flex-shrink: 0; padding: 10px 14px; font-size: 19px; color: var(--dv-text-sec);
    border-bottom: 1px solid var(--dv-border); min-height: 24px; background: var(--dv-bg);
  }
  .dv-status.dv-error{ color: var(--dv-danger); }
  .dv-status.dv-relay{ color: #B8860B; }

  #dvEditorWrap{ flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; position: relative; width: 100%; height: 100%; }
  .dv-editor{ flex: 1; display: flex; overflow: auto; min-height: 0; background: var(--dv-code-bg); width: 100%; height: 100%; }
  .dv-gutter{
    flex-shrink: 0; padding: 14px 10px; text-align: right;
    color: var(--dv-text-sec); font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    background: var(--dv-code-bg); user-select: none; border-right: 1px solid var(--dv-border);
    white-space: pre;
  }
  .dv-code{
    flex: 1; margin: 0; padding: 14px; background: var(--dv-code-bg);
    font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre; color: var(--dv-code-text); min-width: 0; overflow: visible;
  }
  .dv-iframe{ flex: 1; width: 100%; height: 100%; border: none; background: #ffffff; }
  .dv-empty{
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: var(--dv-text-sec); font-size: 19px; text-align: center; padding: 20px;
    background: var(--dv-bg);
  }
</style>

<div class="dv-widget-root" id="dvWidgetRoot">
  <button class="dv-fab" id="dvFab" aria-label="View Source">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  </button>

  <div class="dv-modal" id="dvModal">
    <div class="dv-bar">
      <button class="dv-icon-btn" id="dvClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <input type="text" class="dv-url-input" id="dvUrlInput" placeholder="Paste a URL, e.g. https://example.com" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false">
      <button class="dv-icon-btn" id="dvGoBtn" aria-label="View Code">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </button>
      <button class="dv-icon-btn" id="dvPlayBtn" aria-label="Play Live Preview">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
      </button>
      <button class="dv-icon-btn" id="dvCopyBtn" aria-label="Copy source">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
       
    <div class="dv-status" id="dvStatus"></div>
    <div id="dvEditorWrap">
      <div class="dv-empty" id="dvEmptyState">Paste a URL above and tap View to fetch and display its source.</div>
    </div>
  </div>
</div>
`;

const dvWidgetRoot = dvRoot.getElementById('dvWidgetRoot');
const dvFab = dvRoot.getElementById('dvFab');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvUrlInput = dvRoot.getElementById('dvUrlInput');
const dvGoBtn = dvRoot.getElementById('dvGoBtn');
const dvPlayBtn = dvRoot.getElementById('dvPlayBtn');
const dvCopyBtn = dvRoot.getElementById('dvCopyBtn');
const dvStatus = dvRoot.getElementById('dvStatus');
const dvEditorWrap = dvRoot.getElementById('dvEditorWrap');

let dvLastFetchedSource = '';
let dvCurrentMode = 'code';

/* ---------- Theme sync: light by default, follows the host app's dark-mode toggle if present ---------- */
function dvSyncTheme(){
  const hostIsDark = document.documentElement.classList.contains('dv-dark');
  dvWidgetRoot.classList.toggle('dv-dark', hostIsDark);
}
dvSyncTheme();
new MutationObserver(dvSyncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

function dvOpenModal(){ dvModal.classList.add('dv-open'); dvUrlInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

function dvSetStatus(msg, kind){
  dvStatus.textContent = msg || '';
  dvStatus.classList.toggle('dv-error', kind === 'error');
  dvStatus.classList.toggle('dv-relay', kind === 'relay');
}

function dvRenderSource(text){
  dvLastFetchedSource = text;
  dvCurrentMode = 'code';
  const lines = text.split('\n');
  const gutter = lines.map((_, i)=> (i+1)).join('\n');
  dvEditorWrap.innerHTML = `
    <div class="dv-editor">
      <div class="dv-gutter">${gutter}</div>
      <pre class="dv-code"></pre>
    </div>`;
  dvEditorWrap.querySelector('.dv-code').textContent = text;
}

function dvRenderPreview(text){
  dvLastFetchedSource = text;
  dvCurrentMode = 'preview';
  dvEditorWrap.innerHTML = `<iframe class="dv-iframe" sandbox="allow-scripts allow-same-origin"></iframe>`;
  const frame = dvEditorWrap.querySelector('.dv-iframe');
  frame.srcdoc = text;
}

async function dvFetchSource(targetMode = 'code'){
  let url = dvUrlInput.value.trim();
  if(!url){ dvSetStatus('Enter a URL first.', 'error'); return; }
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;

  dvSetStatus('Fetching…');
  const started = performance.now();

  try{
    const response = await fetch(url, { mode: 'cors', referrerPolicy: 'no-referrer' });
    const elapsed = Math.round(performance.now() - started);
    const text = await response.text();
    if(targetMode === 'preview'){ dvRenderPreview(text); } else { dvRenderSource(text); }
    dvSetStatus(`${response.status} ${response.statusText} · ${text.length.toLocaleString()} characters · ${elapsed}ms · direct, private request`);
    return;
  }catch(directErr){
    // Direct request failed — retry through relay
  }

  try{
    dvSetStatus('Direct request was blocked (CORS) — retrying through a relay…');
    const proxied = DV_CORS_PROXY + encodeURIComponent(url);
    const response = await fetch(proxied, { referrerPolicy: 'no-referrer' });
    const elapsed = Math.round(performance.now() - started);
    const text = await response.text();
    if(targetMode === 'preview'){ dvRenderPreview(text); } else { dvRenderSource(text); }
    dvSetStatus(`Fetched via CORS relay (allorigins.win) · ${text.length.toLocaleString()} characters · ${elapsed}ms — target site CORS policy blocked direct request.`, 'relay');
  }catch(relayErr){
    dvSetStatus('Could not fetch this URL, even through the relay. The site may be offline, invalid, or blocking relays too.', 'error');
  }
}

function dvCopySource(){
  if(!dvLastFetchedSource){ dvSetStatus('Nothing to copy yet.', 'error'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvLastFetchedSource).then(()=> dvSetStatus('Copied to clipboard.'));
  }
}

function dvOnViewClick(){
  if(dvLastFetchedSource && dvCurrentMode !== 'code'){
    dvRenderSource(dvLastFetchedSource);
  } else {
    dvFetchSource('code');
  }
}

function dvOnPlayClick(){
  if(dvLastFetchedSource && dvCurrentMode !== 'preview'){
    dvRenderPreview(dvLastFetchedSource);
  } else {
    dvFetchSource('preview');
  }
}

dvFab.addEventListener('click', dvOpenModal);
dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvOnViewClick);
dvPlayBtn.addEventListener('click', dvOnPlayClick);
dvCopyBtn.addEventListener('click', dvCopySource);
dvUrlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') dvFetchSource(dvCurrentMode); });
dvFab.addEventListener('click', dvOpenModal);
dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvFetchSource);
dvCopyBtn.addEventListener('click', dvCopySource);
dvUrlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') dvFetchSource(); });

})();
