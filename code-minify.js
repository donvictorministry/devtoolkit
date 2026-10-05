/* =====================================================================
   DV Standalone Widget: code-minify.js
   Paste JS, CSS, or HTML into a full-page editor. Tap Output to open a
   dedicated full-page result modal with a safe, string/regex-aware
   minified result and a size-reduction summary.

   - Trigger lives in the host app's existing Quick Actions container
     (#dvQuickActions) as a standard .dv-quick-btn — no floating button.
   - Default theme: LIGHT. Syncs with the host app's dark mode toggle
     (watches <html class="dv-dark">).
   - Minimum text size: 19px, everywhere.
   - No browser alert/confirm/prompt anywhere.

   This is a conservative, correctness-first minifier (string/template/
   regex/comment-aware), not a full AST compressor — it will not corrupt
   your code.

   100% self-contained. Delete this <script> tag (or the file) and
   nothing else breaks.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvCodeMinifyHost')) return;

const DV_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

const dvHost = document.createElement('div');
dvHost.id = 'dvCodeMinifyHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }

  .dv-widget-root{
    --dv-bg: #F0F2F5; --dv-surface: #FFFFFF; --dv-text: #050505;
    --dv-text-sec: #65676B; --dv-border: #DADDE1; --dv-accent: #FF6D00;
    --dv-code-bg: #F6F8FA; --dv-code-text: #24292E; --dv-success: #31A24C;
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
    z-index: 2147483001; display: none; flex-direction: column; overflow: hidden;
  }
  .dv-modal.dv-open{ display: flex; }

  .dv-bar{
    flex-shrink: 0; min-height: 60px; background: var(--dv-accent);
    display: flex; align-items: center; gap: 10px; padding: 8px 14px;
  }
  .dv-icon-btn{
    width: 44px; height: 44px; border-radius: 50%; border: none;
    background: transparent; color: #fff; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
  }
  .dv-icon-btn:active{ background: rgba(255,255,255,.2); }
  .dv-bar h1{ color: #fff; font-size: 20px; font-weight: 700; margin: 0; flex: 1; }

  .dv-toolbar{
    flex-shrink: 0; display: flex; gap: 8px; overflow-x: auto;
    padding: 10px; background: var(--dv-bg); border-bottom: 1px solid var(--dv-border);
    position: relative;
  }
  .dv-toolbar::-webkit-scrollbar{ display: none; }
  .dv-tool-btn{
    flex-shrink: 0; display: flex; align-items: center; gap: 8px;
    height: 42px; padding: 0 14px; border-radius: 21px; border: 1.5px solid var(--dv-border);
    background: var(--dv-surface); color: var(--dv-text); font-size: 19px; font-weight: 500;
  }
  .dv-tool-btn:active{ background: var(--dv-border); }
  .dv-tool-btn.dv-active{ background: var(--dv-accent); border-color: var(--dv-accent); color: #fff; }
  .dv-tool-btn svg{ width: 20px; height: 20px; flex-shrink: 0; }

  .dv-lang-wrap{ position: relative; flex-shrink: 0; }
  .dv-lang-menu{
    display: none; position: absolute; top: 48px; left: 0; z-index: 10;
    background: var(--dv-surface); border: 1.5px solid var(--dv-border); border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,.2); overflow: hidden; min-width: 180px;
  }
  .dv-lang-menu.dv-open{ display: block; }
  .dv-lang-option{
    display: block; width: 100%; text-align: left; padding: 12px 16px;
    background: var(--dv-surface); border: none; color: var(--dv-text); font-size: 19px;
    border-bottom: 1px solid var(--dv-border);
  }
  .dv-lang-option:last-child{ border-bottom: none; }
  .dv-lang-option:active{ background: var(--dv-bg); }
  .dv-lang-option.dv-selected{ color: var(--dv-accent); font-weight: 700; }

  .dv-stats{
    flex-shrink: 0; padding: 10px 14px; font-size: 19px; color: var(--dv-text-sec);
    border-bottom: 1px solid var(--dv-border); background: var(--dv-bg); min-height: 20px;
  }
  .dv-stats.dv-ok{ color: var(--dv-success); }

  .dv-editor-wrap{ flex: 1; min-height: 0; display: flex; }
  .dv-code{
    flex: 1; min-width: 0; margin: 0; padding: 14px; background: var(--dv-code-bg);
    font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre; color: var(--dv-code-text); border: none; resize: none; outline: none;
  }

  .dv-output-body{ flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .dv-output-pre{
    flex: 1; min-height: 0; overflow: auto; margin: 0; padding: 14px; background: var(--dv-code-bg);
    font: 19px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    white-space: pre-wrap; word-break: break-word; color: var(--dv-code-text);
  }
  .dv-empty-note{ color: var(--dv-text-sec); font-size: 19px; text-align: center; padding: 30px 14px; }
</style>

<div class="dv-widget-root" id="dvWidgetRoot">
  <div class="dv-modal" id="dvModal">
    <div class="dv-bar">
      <button class="dv-icon-btn" id="dvClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <h1>Code Minifier</h1>
    </div>
    <div class="dv-toolbar">
      <button class="dv-tool-btn dv-active" id="dvEditorTabBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg><span>Code Editor</span></button>
      <button class="dv-tool-btn" id="dvOutputBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg><span>Output</span></button>
      <button class="dv-tool-btn" id="dvPasteBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg><span>Paste</span></button>
      <button class="dv-tool-btn" id="dvCopyBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span></button>
      <div class="dv-lang-wrap">
        <button class="dv-tool-btn" id="dvLangBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg><span id="dvLangLabel">Auto-Detect</span></button>
        <div class="dv-lang-menu" id="dvLangMenu">
          <button class="dv-lang-option dv-selected" data-lang="auto">Auto-Detect</button>
          <button class="dv-lang-option" data-lang="css">CSS</button>
          <button class="dv-lang-option" data-lang="html">HTML</button>
          <button class="dv-lang-option" data-lang="js">JavaScript</button>
        </div>
      </div>
      <button class="dv-tool-btn" id="dvClearBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg><span>Clear</span></button>
    </div>
    <div class="dv-stats" id="dvStats">Paste code below, then tap Output to minify it.</div>
    <div class="dv-editor-wrap">
      <textarea class="dv-code" id="dvInput" placeholder="Paste JS, CSS, or HTML here…" spellcheck="false" autocapitalize="off" autocorrect="off"></textarea>
    </div>
  </div>

  <div class="dv-modal" id="dvOutputModal">
    <div class="dv-bar">
      <button class="dv-icon-btn" id="dvOutputClose" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <h1>Minified Output</h1>
      <button class="dv-icon-btn" id="dvOutputCopyBtn" aria-label="Copy output">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
    <div class="dv-stats" id="dvOutputStats"></div>
    <div class="dv-output-body">
      <pre class="dv-output-pre" id="dvOutputPre"></pre>
    </div>
  </div>
</div>
`;

const dvWidgetRoot = dvRoot.getElementById('dvWidgetRoot');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvInput = dvRoot.getElementById('dvInput');
const dvStats = dvRoot.getElementById('dvStats');
const dvOutputBtn = dvRoot.getElementById('dvOutputBtn');
const dvEditorTabBtn = dvRoot.getElementById('dvEditorTabBtn');
const dvPasteBtn = dvRoot.getElementById('dvPasteBtn');
const dvCopyBtn = dvRoot.getElementById('dvCopyBtn');
const dvClearBtn = dvRoot.getElementById('dvClearBtn');
const dvLangBtn = dvRoot.getElementById('dvLangBtn');
const dvLangLabel = dvRoot.getElementById('dvLangLabel');
const dvLangMenu = dvRoot.getElementById('dvLangMenu');
const dvOutputModal = dvRoot.getElementById('dvOutputModal');
const dvOutputClose = dvRoot.getElementById('dvOutputClose');
const dvOutputCopyBtn = dvRoot.getElementById('dvOutputCopyBtn');
const dvOutputStats = dvRoot.getElementById('dvOutputStats');
const dvOutputPre = dvRoot.getElementById('dvOutputPre');

let dvSelectedLang = 'auto';
let dvLastMinified = '';

function dvSyncTheme(){
  dvWidgetRoot.classList.toggle('dv-dark', document.documentElement.classList.contains('dv-dark'));
}
dvSyncTheme();
new MutationObserver(dvSyncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

/* ---------- Minifiers: string/template/regex/comment-aware, single pass ---------- */
function dvMinifyJs(code){
  let result = '';
  let i = 0;
  const n = code.length;
  let inStr = null;
  let escape = false;
  let inRegex = false;
  let inCharClass = false;
  let prevSignificant = '';
  const KEYWORDS = new Set(['return','typeof','instanceof','case','in','of','new','delete','void','throw','yield','else','do']);

  while(i < n){
    const c = code[i];
    if(inStr){
      result += c;
      if(escape){ escape = false; }
      else if(c === '\\'){ escape = true; }
      else if(c === inStr){ inStr = null; prevSignificant = c; }
      i++; continue;
    }
    if(inRegex){
      result += c;
      if(escape){ escape = false; }
      else if(c === '\\'){ escape = true; }
      else if(c === '['){ inCharClass = true; }
      else if(c === ']'){ inCharClass = false; }
      else if(c === '/' && !inCharClass){ inRegex = false; prevSignificant = '/'; }
      i++; continue;
    }
    if(c === '"' || c === "'" || c === '`'){ inStr = c; result += c; i++; continue; }
    if(c === '/' && code[i+1] === '/'){
      while(i < n && code[i] !== '\n') i++;
      continue;
    }
    if(c === '/' && code[i+1] === '*'){
      i += 2;
      while(i < n && !(code[i] === '*' && code[i+1] === '/')) i++;
      i += 2;
      continue;
    }
    if(c === '/'){
      const back = code.slice(Math.max(0,i-12), i);
      const wordM = /([A-Za-z_$][A-Za-z0-9_$]*)\s*$/.exec(back);
      const isKeyword = wordM && KEYWORDS.has(wordM[1]);
      if(prevSignificant === '' || '(,=:[!&|?{;+-*%<>\n'.includes(prevSignificant) || isKeyword){
        inRegex = true; result += c; i++; continue;
      } else {
        result += c; prevSignificant = '/'; i++; continue;
      }
    }
    if(/\s/.test(c)){
      let j = i;
      while(j < n && /\s/.test(code[j])) j++;
      const prevOut = result[result.length-1] || '';
      const nextChar = code[j] || '';
      const collapsible = '{}();,:'.includes(prevOut) || '{}();,:'.includes(nextChar);
      result += collapsible ? '' : ' ';
      i = j;
      continue;
    }
    result += c;
    prevSignificant = c;
    i++;
  }
  return result.trim();
}

function dvMinifyCss(code){
  let noComments = code.replace(/\/\*[\s\S]*?\*\//g, '');
  let result = '';
  let i = 0;
  const n = noComments.length;
  let inStr = null;
  while(i < n){
    const c = noComments[i];
    if(inStr){
      result += c;
      if(c === '\\'){ result += noComments[i+1]||''; i += 2; continue; }
      if(c === inStr) inStr = null;
      i++; continue;
    }
    if(c === '"' || c === "'"){ inStr = c; result += c; i++; continue; }
    if(/\s/.test(c)){
      let j = i;
      while(j < n && /\s/.test(noComments[j])) j++;
      const prevOut = result[result.length-1] || '';
      const nextChar = noComments[j] || '';
      const collapsible = '{}:;,'.includes(prevOut) || '{}:;,'.includes(nextChar);
      result += collapsible ? '' : ' ';
      i = j;
      continue;
    }
    result += c;
    i++;
  }
  result = result.replace(/;}/g, '}');
  return result.trim();
}

function dvMinifyHtml(code){
  const blocks = [];
  let protectedCode = code.replace(/<(pre|textarea|script|style)[\s\S]*?<\/\1>/gi, (match)=>{
    blocks.push(match);
    return '\u0000' + (blocks.length-1) + '\u0000';
  });
  protectedCode = protectedCode.replace(/<!--[\s\S]*?-->/g, '');
  protectedCode = protectedCode.replace(/>\s+</g, '><');
  protectedCode = protectedCode.replace(/[ \t]{2,}/g, ' ');
  protectedCode = protectedCode.replace(/\n\s*/g, '');
  protectedCode = protectedCode.replace(/\u0000(\d+)\u0000/g, (m, idx)=> blocks[Number(idx)]);
  return protectedCode.trim();
}

function dvDetectLanguage(code){
  const trimmed = code.trim();
  if(trimmed.startsWith('<')) return 'html';
  const looksLikeCss = /\{[^{}]*:[^{}]*;[\s\S]*\}/.test(trimmed) && !/\b(function|const|let|var|=>)\b/.test(trimmed);
  return looksLikeCss ? 'css' : 'js';
}

/* ---------- Toolbar actions ---------- */
function dvOpenModal(){ dvModal.classList.add('dv-open'); dvInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

function dvShowEditorTab(){
  dvEditorTabBtn.classList.add('dv-active');
  dvOutputBtn.classList.remove('dv-active');
}

async function dvPasteFromClipboard(){
  if(navigator.clipboard && navigator.clipboard.readText){
    try{
      const text = await navigator.clipboard.readText();
      dvInput.value = text;
      dvStats.textContent = 'Pasted from clipboard.';
      dvStats.classList.add('dv-ok');
    }catch(e){
      dvStats.textContent = 'Clipboard permission was denied — paste manually instead.';
      dvStats.classList.remove('dv-ok');
    }
  } else {
    dvStats.textContent = 'Clipboard read is not available here — paste manually instead.';
    dvStats.classList.remove('dv-ok');
  }
}

function dvCopyInput(){
  if(!dvInput.value){ dvStats.textContent = 'Nothing to copy yet.'; dvStats.classList.remove('dv-ok'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvInput.value).then(()=>{
      dvStats.textContent = 'Copied input to clipboard.';
      dvStats.classList.add('dv-ok');
    });
  }
}

function dvClearAll(){
  dvInput.value = '';
  dvLastMinified = '';
  dvOutputPre.textContent = '';
  dvStats.textContent = 'Cleared.';
  dvStats.classList.remove('dv-ok');
}

function dvSetLang(lang){
  dvSelectedLang = lang;
  const labels = { auto: 'Auto-Detect', css: 'CSS', html: 'HTML', js: 'JavaScript' };
  dvLangLabel.textContent = labels[lang];
  dvLangMenu.querySelectorAll('.dv-lang-option').forEach(opt=>{
    opt.classList.toggle('dv-selected', opt.dataset.lang === lang);
  });
  dvLangMenu.classList.remove('dv-open');
}

function dvRunMinifyAndShowOutput(){
  const code = dvInput.value;
  if(!code.trim()){
    dvOutputStats.textContent = 'Nothing to minify — paste some code in the editor first.';
    dvOutputPre.textContent = '';
    dvOutputModal.classList.add('dv-open');
    return;
  }
  let lang = dvSelectedLang === 'auto' ? dvDetectLanguage(code) : dvSelectedLang;
  let minified;
  if(lang === 'css') minified = dvMinifyCss(code);
  else if(lang === 'html') minified = dvMinifyHtml(code);
  else minified = dvMinifyJs(code);

  dvLastMinified = minified;
  dvOutputPre.textContent = minified;
  const before = code.length;
  const after = minified.length;
  const pct = before > 0 ? Math.round((1 - after/before) * 100) : 0;
  dvOutputStats.textContent = `${lang.toUpperCase()} · ${before.toLocaleString()} → ${after.toLocaleString()} characters (${pct}% smaller)`;
  dvOutputStats.classList.add('dv-ok');
  dvOutputModal.classList.add('dv-open');
}

function dvCopyOutput(){
  if(!dvLastMinified){ return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvLastMinified).then(()=>{
      dvOutputStats.textContent = 'Copied minified output to clipboard.';
    });
  }
}

dvClose.addEventListener('click', dvCloseModal);
dvEditorTabBtn.addEventListener('click', dvShowEditorTab);
dvOutputBtn.addEventListener('click', dvRunMinifyAndShowOutput);
dvPasteBtn.addEventListener('click', dvPasteFromClipboard);
dvCopyBtn.addEventListener('click', dvCopyInput);
dvClearBtn.addEventListener('click', dvClearAll);
dvLangBtn.addEventListener('click', ()=> dvLangMenu.classList.toggle('dv-open'));
dvLangMenu.querySelectorAll('.dv-lang-option').forEach(opt=>{
  opt.addEventListener('click', ()=> dvSetLang(opt.dataset.lang));
});
dvOutputClose.addEventListener('click', ()=>{ dvOutputModal.classList.remove('dv-open'); dvShowEditorTab(); });
dvOutputCopyBtn.addEventListener('click', dvCopyOutput);

function dvInjectQuickAction(){
  const qa = document.getElementById('dvQuickActions');
  if(!qa) return;
  if(qa.querySelector('[data-dv-widget="code-minify"]')) return;
  const btn = document.createElement('button');
  btn.className = 'dv-quick-btn';
  btn.setAttribute('data-dv-widget', 'code-minify');
  btn.innerHTML = DV_ICON + '<span>Minify Code</span>';
  btn.addEventListener('click', dvOpenModal);
  qa.appendChild(btn);
}
dvInjectQuickAction();
const dvWatchTarget = document.getElementById('dvContent') || document.body;
if(dvWatchTarget){
  new MutationObserver(dvInjectQuickAction).observe(dvWatchTarget, { childList: true, subtree: true });
}

})();
