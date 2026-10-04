/* =====================================================================
   DV Standalone Widget: source-code.js
   Paste any URL, view its fetched source in a full-page (100dvh x 100dvw,
   edge-to-edge) dedicated code viewer.

   100% self-contained: own CSS, HTML and JS, mounted into a private
   Shadow DOM root so it can never clash with the host app's styles or
   element IDs. Auto-builds itself on load and injects its own floating
   trigger button. Delete this <script> tag (or the file) and the app
   loses nothing else — this widget owns everything it needs.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvSourceCodeHost')) return; // guard against double-injection

const dvHost = document.createElement('div');
dvHost.id = 'dvSourceCodeHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }
  .dv-fab{
    position: fixed; right: 16px; bottom: 24px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%;
    background: #1877F2; color: #fff; border: none;
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
  .dv-url-input:focus{ outline: none; border-color: #1877F2; }
  .dv-go-btn{
    height: 40px; padding: 0 16px; border-radius: 8px; border: none;
    background: #1877F2; color: #fff; font-weight: 700; flex-shrink: 0;
  }
  .dv-go-btn:active{ filter: brightness(.85); }

  .dv-status{
    flex-shrink: 0; padding: 8px 14px; font-size: .9rem; color: #8b949e;
    border-bottom: 1px solid #30363d; min-height: 20px;
  }
  .dv-status.dv-error{ color: #f85149; }

  .dv-editor{
    flex: 1; display: flex; overflow: auto; min-height: 0;
  }
  .dv-gutter{
    flex-shrink: 0; padding: 12px 10px; text-align: right;
    color: #6e7681; font: 13px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    background: #0d1117; user-select: none; border-right: 1px solid #21262d;
    white-space: pre;
  }
  .dv-code{
    flex: 1; margin: 0; padding: 12px 14px;
    font: 13px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre; color: #c9d1d9; min-width: 0;
  }
  .dv-empty{
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: #6e7681; font-size: 1rem; text-align: center; padding: 20px;
  }
</style>

<button class="dv-fab" id="dvFab" aria-label="View Source">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
</button>

<div class="dv-modal" id="dvModal">
  <div class="dv-bar">
    <button class="dv-icon-btn" id="dvClose" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <input type="text" class="dv-url-input" id="dvUrlInput" placeholder="Paste a URL, e.g. https://example.com" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false">
    <button class="dv-go-btn" id="dvGoBtn">View</button>
    <button class="dv-icon-btn" id="dvCopyBtn" aria-label="Copy source">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
  </div>
  <div class="dv-status" id="dvStatus"></div>
  <div id="dvEditorWrap">
    <div class="dv-empty" id="dvEmptyState">Paste a URL above and tap View to fetch and display its source.</div>
  </div>
</div>
`;

const dvFab = dvRoot.getElementById('dvFab');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvUrlInput = dvRoot.getElementById('dvUrlInput');
const dvGoBtn = dvRoot.getElementById('dvGoBtn');
const dvCopyBtn = dvRoot.getElementById('dvCopyBtn');
const dvStatus = dvRoot.getElementById('dvStatus');
const dvEditorWrap = dvRoot.getElementById('dvEditorWrap');

let dvLastFetchedSource = '';

function dvOpenModal(){ dvModal.classList.add('dv-open'); dvUrlInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

function dvSetStatus(msg, isError){
  dvStatus.textContent = msg || '';
  dvStatus.classList.toggle('dv-error', !!isError);
}

function dvRenderSource(text){
  dvLastFetchedSource = text;
  const lines = text.split('\n');
  const gutter = lines.map((_, i)=> (i+1)).join('\n');
  dvEditorWrap.innerHTML = `
    <div class="dv-editor">
      <div class="dv-gutter">${gutter}</div>
      <pre class="dv-code"></pre>
    </div>`;
  // set via textContent to avoid the fetched HTML being parsed/executed
  dvEditorWrap.querySelector('.dv-code').textContent = text;
}

async function dvFetchSource(){
  let url = dvUrlInput.value.trim();
  if(!url){ dvSetStatus('Enter a URL first.', true); return; }
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;

  dvSetStatus('Fetching…');
  const started = performance.now();
  try{
    const response = await fetch(url, { mode: 'cors' });
    const elapsed = Math.round(performance.now() - started);
    const text = await response.text();
    dvRenderSource(text);
    dvSetStatus(`${response.status} ${response.statusText} · ${text.length.toLocaleString()} characters · ${elapsed}ms`);
  }catch(err){
    dvSetStatus(
      'Could not fetch this URL. Most sites block cross-origin requests from the browser (CORS) — this is a browser security restriction, not a bug here. Try an endpoint that allows CORS, or a same-origin page.',
      true
    );
  }
}

function dvCopySource(){
  if(!dvLastFetchedSource){ dvSetStatus('Nothing to copy yet.', true); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvLastFetchedSource).then(()=> dvSetStatus('Copied to clipboard.'));
  }
}

dvFab.addEventListener('click', dvOpenModal);
dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvFetchSource);
dvCopyBtn.addEventListener('click', dvCopySource);
dvUrlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') dvFetchSource(); });

})();
