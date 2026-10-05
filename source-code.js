/* =====================================================================
   DV Standalone Widget: source-code.js
   Paste any URL, fetch its source into a full-page (100dvh x 100dvw,
   edge-to-edge) EDITABLE code editor — with Undo/Redo, Copy, Save,
   Export, a Saved Files browser, and a live full-page Preview.

   - Trigger lives in the host app's existing Quick Actions container
     (#dvQuickActions) as a standard .dv-quick-btn — no floating button.
     If the host app isn't present, the widget simply does nothing
     instead of erroring (safe to use standalone or drop entirely).
   - Default theme: LIGHT. Syncs automatically with the host app's dark
     mode toggle (watches <html class="dv-dark">).
   - Minimum text size: 19px, everywhere.
   - No browser alert/confirm/prompt anywhere — all feedback is in-UI.
   - Referrer-Policy forced to "no-referrer" (document <meta>, injected
     once, plus per-request) so fetched sites never see this app in logs.
   - CORS: direct fetch first (fully private). On failure (almost always
     CORS, a browser rule no client script can override) this retries
     through a public relay automatically, clearly labeled in the UI.

   100% self-contained. Delete this <script> tag (or the file) and
   nothing else breaks.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvSourceCodeHost')) return;

if(!document.querySelector('meta[name="referrer"]')){
  const dvMeta = document.createElement('meta');
  dvMeta.setAttribute('name', 'referrer');
  dvMeta.setAttribute('content', 'no-referrer');
  document.head.insertBefore(dvMeta, document.head.firstChild);
}

const DV_CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const DV_STORAGE_KEY = 'dvSourceCodeSavedFiles';
const DV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';

const dvHost = document.createElement('div');
dvHost.id = 'dvSourceCodeHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }

  .dv-widget-root{
    --dv-bg: #F0F2F5; --dv-surface: #FFFFFF; --dv-text: #050505;
    --dv-text-sec: #65676B; --dv-border: #DADDE1; --dv-accent: #1877F2;
    --dv-code-bg: #F6F8FA; --dv-code-text: #24292E; --dv-danger: #E41E3F;
    --dv-success: #31A24C;
    font-family: Roboto, Arial, sans-serif;
  }
  .dv-widget-root.dv-dark{
    --dv-bg: #18191A; --dv-surface: #242526; --dv-text: #E4E6EB;
    --dv-text-sec: #B0B3B8; --dv-border: #3A3B3C;
    --dv-code-bg: #0D1117; --dv-code-text: #C9D1D9;
  }

  .dv-modal{
    position: fixed; inset: 0; width: 100dvw; height: 100dvh;
    background: var(--dv-surface); color: var(--dv-text);
    z-index: 2147483001; display: none; flex-direction: column;
    overflow: hidden;
  }
  .dv-modal.dv-open{ display: flex; }

  .dv-bar{
    flex-shrink: 0; min-height: 60px; background: var(--dv-accent);
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
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
  .dv-go-btn{
    height: 44px; padding: 0 18px; border-radius: 10px; border: none;
    background: #050505; color: #fff; font-weight: 700; font-size: 19px;
    flex-shrink: 0;
  }
  .dv-go-btn:active{ filter: brightness(1.3); }

  .dv-toolbar{
    flex-shrink: 0; display: flex; gap: 8px; overflow-x: auto;
    padding: 10px; background: var(--dv-bg); border-bottom: 1px solid var(--dv-border);
  }
  .dv-toolbar::-webkit-scrollbar{ display: none; }
  .dv-tool-btn{
    flex-shrink: 0; display: flex; align-items: center; gap: 8px;
    height: 42px; padding: 0 14px; border-radius: 21px; border: 1.5px solid var(--dv-border);
    background: var(--dv-surface); color: var(--dv-text); font-size: 19px; font-weight: 500;
  }
  .dv-tool-btn:active{ background: var(--dv-border); }
  .dv-tool-btn svg{ width: 20px; height: 20px; flex-shrink: 0; }
  .dv-tool-btn:disabled{ opacity: .4; }

  .dv-status{
    flex-shrink: 0; padding: 8px 14px; font-size: 19px; color: var(--dv-text-sec);
    border-bottom: 1px solid var(--dv-border); background: var(--dv-bg); min-height: 20px;
  }
  .dv-status.dv-error{ color: var(--dv-danger); }
  .dv-status.dv-relay{ color: #B8860B; }
  .dv-status.dv-ok{ color: var(--dv-success); }

  .dv-editor-wrap{ flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .dv-editor{ flex: 1; min-height: 0; display: flex; overflow: auto; background: var(--dv-code-bg); }
  .dv-gutter{
    flex-shrink: 0; padding: 14px 10px; text-align: right;
    color: var(--dv-text-sec); font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    background: var(--dv-code-bg); user-select: none; border-right: 1px solid var(--dv-border);
    white-space: pre;
  }
  .dv-code{
    flex: 1; min-width: 0; margin: 0; padding: 14px; background: var(--dv-code-bg);
    font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre; color: var(--dv-code-text); border: none; resize: none;
    outline: none;
  }
  .dv-empty{
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: var(--dv-text-sec); font-size: 19px; text-align: center; padding: 20px;
  }

  .dv-sub-modal{
    position: fixed; inset: 0; width: 100dvw; height: 100dvh;
    background: var(--dv-surface); color: var(--dv-text);
    z-index: 2147483002; display: none; flex-direction: column;
  }
  .dv-sub-modal.dv-open{ display: flex; }
  .dv-sub-bar{
    flex-shrink: 0; min-height: 60px; background: var(--dv-accent);
    display: flex; align-items: center; gap: 10px; padding: 8px 14px;
  }
  .dv-sub-bar h2{ color: #fff; font-size: 20px; margin: 0; flex: 1; }
  .dv-sub-body{ flex: 1; min-height: 0; overflow-y: auto; padding: 14px; }
  .dv-saved-item{
    display: flex; align-items: center; gap: 12px; padding: 14px;
    border: 1.5px solid var(--dv-border); border-radius: 12px; margin-bottom: 10px;
    background: var(--dv-bg);
  }
  .dv-saved-item .dv-saved-name{ flex: 1; font-size: 19px; word-break: break-all; }
  .dv-saved-item .dv-saved-meta{ font-size: 19px; color: var(--dv-text-sec); }
  .dv-mini-btn{
    flex-shrink: 0; height: 40px; padding: 0 14px; border-radius: 8px; border: none;
    background: var(--dv-accent); color: #fff; font-size: 19px; font-weight: 700;
  }
  .dv-mini-btn.dv-danger{ background: var(--dv-danger); }
  .dv-mini-btn:active{ filter: brightness(1.2); }
  .dv-empty-note{ color: var(--dv-text-sec); font-size: 19px; text-align: center; padding: 30px 10px; }
  .dv-preview-frame{ flex: 1; min-height: 0; border: none; width: 100%; background: #fff; }
</style>

<div class="dv-widget-root" id="dvWidgetRoot">
  <div class="dv-modal" id="dvModal">
    <div class="dv-bar">
      <button class="dv-icon-btn" id="dvClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <input type="text" class="dv-url-input" id="dvUrlInput" placeholder="Paste a URL, e.g. https://example.com" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false">
      <button class="dv-go-btn" id="dvGoBtn">View</button>
    </div>
    <div class="dv-toolbar">
      <button class="dv-tool-btn" id="dvUndoBtn" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12h-1"/></svg><span>Undo</span></button>
      <button class="dv-tool-btn" id="dvRedoBtn" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a6 6 0 0 0 0 12h1"/></svg><span>Redo</span></button>
      <button class="dv-tool-btn" id="dvCopyBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span></button>
      <button class="dv-tool-btn" id="dvSaveBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Save</span></button>
      <button class="dv-tool-btn" id="dvExportBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Export</span></button>
      <button class="dv-tool-btn" id="dvSavedBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Saved</span></button>
      <button class="dv-tool-btn" id="dvPlayBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg><span>Preview</span></button>
    </div>
    <div class="dv-status" id="dvStatus"></div>
    <div class="dv-editor-wrap" id="dvEditorWrap">
      <div class="dv-empty" id="dvEmptyState">Paste a URL above and tap View — or just start typing/pasting code directly below.</div>
    </div>
  </div>

  <div class="dv-sub-modal" id="dvSavedModal">
    <div class="dv-sub-bar">
      <h2>Saved Files</h2>
      <button class="dv-icon-btn" id="dvSavedClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="dv-sub-body" id="dvSavedList"></div>
  </div>

  <div class="dv-sub-modal" id="dvPreviewModal">
    <div class="dv-sub-bar">
      <h2>Live Preview</h2>
      <button class="dv-icon-btn" id="dvPreviewClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <iframe class="dv-preview-frame" id="dvPreviewFrame" sandbox="allow-same-origin"></iframe>
  </div>
</div>
`;

const dvWidgetRoot = dvRoot.getElementById('dvWidgetRoot');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvUrlInput = dvRoot.getElementById('dvUrlInput');
const dvGoBtn = dvRoot.getElementById('dvGoBtn');
const dvStatus = dvRoot.getElementById('dvStatus');
const dvEditorWrap = dvRoot.getElementById('dvEditorWrap');
const dvUndoBtn = dvRoot.getElementById('dvUndoBtn');
const dvRedoBtn = dvRoot.getElementById('dvRedoBtn');
const dvCopyBtn = dvRoot.getElementById('dvCopyBtn');
const dvSaveBtn = dvRoot.getElementById('dvSaveBtn');
const dvExportBtn = dvRoot.getElementById('dvExportBtn');
const dvSavedBtn = dvRoot.getElementById('dvSavedBtn');
const dvPlayBtn = dvRoot.getElementById('dvPlayBtn');
const dvSavedModal = dvRoot.getElementById('dvSavedModal');
const dvSavedClose = dvRoot.getElementById('dvSavedClose');
const dvSavedList = dvRoot.getElementById('dvSavedList');
const dvPreviewModal = dvRoot.getElementById('dvPreviewModal');
const dvPreviewClose = dvRoot.getElementById('dvPreviewClose');
const dvPreviewFrame = dvRoot.getElementById('dvPreviewFrame');

let dvCodeEl = null;
let dvGutterEl = null;
let dvHistory = [];
let dvHistoryIndex = -1;
let dvHistoryDebounce = null;
let dvCurrentUrl = '';

function dvSyncTheme(){
  dvWidgetRoot.classList.toggle('dv-dark', document.documentElement.classList.contains('dv-dark'));
}
dvSyncTheme();
new MutationObserver(dvSyncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

function dvSetStatus(msg, kind){
  dvStatus.textContent = msg || '';
  dvStatus.classList.remove('dv-error', 'dv-relay', 'dv-ok');
  if(kind) dvStatus.classList.add('dv-' + kind);
}

function dvEnsureEditor(){
  if(dvCodeEl) return;
  dvEditorWrap.innerHTML = `
    <div class="dv-editor">
      <div class="dv-gutter" id="dvGutter">1</div>
      <textarea class="dv-code" id="dvCode" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
    </div>`;
  dvCodeEl = dvEditorWrap.querySelector('#dvCode');
  dvGutterEl = dvEditorWrap.querySelector('#dvGutter');
  dvCodeEl.addEventListener('input', dvOnEdit);
  dvCodeEl.addEventListener('scroll', ()=>{ dvGutterEl.scrollTop = dvCodeEl.scrollTop; });
}

function dvUpdateGutter(){
  const lineCount = dvCodeEl.value.split('\n').length;
  let out = '';
  for(let i = 1; i <= lineCount; i++) out += i + '\n';
  dvGutterEl.textContent = out.trimEnd();
}

function dvSetEditorValue(text, pushHistory){
  dvEnsureEditor();
  dvCodeEl.value = text;
  dvUpdateGutter();
  if(pushHistory !== false) dvPushHistory(text);
}

function dvOnEdit(){
  dvUpdateGutter();
  clearTimeout(dvHistoryDebounce);
  dvHistoryDebounce = setTimeout(()=> dvPushHistory(dvCodeEl.value), 500);
}

function dvPushHistory(text){
  if(dvHistory[dvHistoryIndex] === text) return;
  dvHistory = dvHistory.slice(0, dvHistoryIndex + 1);
  dvHistory.push(text);
  if(dvHistory.length > 50) dvHistory.shift();
  dvHistoryIndex = dvHistory.length - 1;
  dvUpdateUndoRedoButtons();
}

function dvUpdateUndoRedoButtons(){
  dvUndoBtn.disabled = dvHistoryIndex <= 0;
  dvRedoBtn.disabled = dvHistoryIndex >= dvHistory.length - 1;
}

function dvUndo(){
  if(dvHistoryIndex <= 0) return;
  dvHistoryIndex--;
  dvEnsureEditor();
  dvCodeEl.value = dvHistory[dvHistoryIndex];
  dvUpdateGutter();
  dvUpdateUndoRedoButtons();
}

function dvRedo(){
  if(dvHistoryIndex >= dvHistory.length - 1) return;
  dvHistoryIndex++;
  dvEnsureEditor();
  dvCodeEl.value = dvHistory[dvHistoryIndex];
  dvUpdateGutter();
  dvUpdateUndoRedoButtons();
}

async function dvFetchSource(){
  let url = dvUrlInput.value.trim();
  if(!url){ dvSetStatus('Enter a URL first.', 'error'); return; }
  if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
  dvCurrentUrl = url;

  dvSetStatus('Fetching…');
  const started = performance.now();

  try{
    const response = await fetch(url, { mode: 'cors', referrerPolicy: 'no-referrer' });
    const elapsed = Math.round(performance.now() - started);
    const text = await response.text();
    dvSetEditorValue(text);
    dvSetStatus(`${response.status} ${response.statusText} · ${text.length.toLocaleString()} chars · ${elapsed}ms · direct, private request`, 'ok');
    return;
  }catch(directErr){ /* fall through to relay */ }

  try{
    dvSetStatus('Direct request was blocked (CORS) — retrying through a relay…');
    const response = await fetch(DV_CORS_PROXY + encodeURIComponent(url), { referrerPolicy: 'no-referrer' });
    const elapsed = Math.round(performance.now() - started);
    const text = await response.text();
    dvSetEditorValue(text);
    dvSetStatus(`Fetched via CORS relay (allorigins.win) · ${text.length.toLocaleString()} chars · ${elapsed}ms`, 'relay');
  }catch(relayErr){
    dvSetStatus('Could not fetch this URL, even through the relay.', 'error');
  }
}

function dvCopyCode(){
  dvEnsureEditor();
  if(!dvCodeEl.value){ dvSetStatus('Nothing to copy yet.', 'error'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvCodeEl.value).then(()=> dvSetStatus('Copied to clipboard.', 'ok'));
  }
}

function dvLoadSavedFiles(){
  try{ return JSON.parse(localStorage.getItem(DV_STORAGE_KEY) || '[]'); }
  catch(e){ return []; }
}
function dvPersistSavedFiles(list){
  try{ localStorage.setItem(DV_STORAGE_KEY, JSON.stringify(list)); }catch(e){ /* storage unavailable */ }
}
function dvDeriveFilename(){
  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g,'-').slice(0,19);
  let base = 'untitled';
  if(dvCurrentUrl){
    try{ base = new URL(dvCurrentUrl).hostname; }catch(e){ base = 'source'; }
  }
  return `${base}-${stamp}.txt`;
}
function dvSaveCode(){
  dvEnsureEditor();
  if(!dvCodeEl.value){ dvSetStatus('Nothing to save yet.', 'error'); return; }
  const list = dvLoadSavedFiles();
  const name = dvDeriveFilename();
  list.unshift({ name, url: dvCurrentUrl, content: dvCodeEl.value, savedAt: Date.now() });
  dvPersistSavedFiles(list.slice(0, 100));
  dvSetStatus(`Saved as ${name}`, 'ok');
}
function dvExportCode(){
  dvEnsureEditor();
  if(!dvCodeEl.value){ dvSetStatus('Nothing to export yet.', 'error'); return; }
  const blob = new Blob([dvCodeEl.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = dvDeriveFilename();
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 500);
  dvSetStatus('Exported.', 'ok');
}

function dvOpenSavedModal(){
  const list = dvLoadSavedFiles();
  if(list.length === 0){
    dvSavedList.innerHTML = `<div class="dv-empty-note">No saved files yet. Tap Save while editing to add one.</div>`;
  } else {
    dvSavedList.innerHTML = list.map((item, idx)=> `
      <div class="dv-saved-item">
        <div style="flex:1; min-width:0;">
          <div class="dv-saved-name">${item.name}</div>
          <div class="dv-saved-meta">${new Date(item.savedAt).toLocaleString()}</div>
        </div>
        <button class="dv-mini-btn" data-load="${idx}">Open</button>
        <button class="dv-mini-btn dv-danger" data-del="${idx}">Delete</button>
      </div>`).join('');
    dvSavedList.querySelectorAll('[data-load]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const item = list[Number(btn.dataset.load)];
        dvCurrentUrl = item.url || '';
        dvUrlInput.value = dvCurrentUrl;
        dvSetEditorValue(item.content);
        dvSetStatus(`Loaded ${item.name}`, 'ok');
        dvCloseSavedModal();
      });
    });
    dvSavedList.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = Number(btn.dataset.del);
        const current = dvLoadSavedFiles();
        current.splice(i, 1);
        dvPersistSavedFiles(current);
        dvOpenSavedModal();
      });
    });
  }
  dvSavedModal.classList.add('dv-open');
}
function dvCloseSavedModal(){ dvSavedModal.classList.remove('dv-open'); }

function dvOpenPreview(){
  dvEnsureEditor();
  dvPreviewFrame.srcdoc = dvCodeEl.value || '<p style="font-family:sans-serif;padding:20px;">Nothing to preview yet.</p>';
  dvPreviewModal.classList.add('dv-open');
}
function dvClosePreview(){ dvPreviewModal.classList.remove('dv-open'); dvPreviewFrame.srcdoc = ''; }

function dvOpenModal(){ dvModal.classList.add('dv-open'); dvEnsureEditor(); dvUpdateUndoRedoButtons(); dvUrlInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvFetchSource);
dvUrlInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') dvFetchSource(); });
dvUndoBtn.addEventListener('click', dvUndo);
dvRedoBtn.addEventListener('click', dvRedo);
dvCopyBtn.addEventListener('click', dvCopyCode);
dvSaveBtn.addEventListener('click', dvSaveCode);
dvExportBtn.addEventListener('click', dvExportCode);
dvSavedBtn.addEventListener('click', dvOpenSavedModal);
dvSavedClose.addEventListener('click', dvCloseSavedModal);
dvPlayBtn.addEventListener('click', dvOpenPreview);
dvPreviewClose.addEventListener('click', dvClosePreview);

function dvInjectQuickAction(){
  const qa = document.getElementById('dvQuickActions');
  if(!qa) return;
  if(qa.querySelector('[data-dv-widget="source-code"]')) return;
  const btn = document.createElement('button');
  btn.className = 'dv-quick-btn';
  btn.setAttribute('data-dv-widget', 'source-code');
  btn.innerHTML = DV_ICON + '<span>View Source</span>';
  btn.addEventListener('click', dvOpenModal);
  qa.appendChild(btn);
}
dvInjectQuickAction();
const dvWatchTarget = document.getElementById('dvContent') || document.body;
if(dvWatchTarget){
  new MutationObserver(dvInjectQuickAction).observe(dvWatchTarget, { childList: true, subtree: true });
}

})();
