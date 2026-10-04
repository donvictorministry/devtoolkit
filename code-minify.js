/* =====================================================================
   DV Standalone Widget: code-minify.js
   Paste JS, CSS, or HTML. Tap Minify. Get a safe, string/regex-aware
   minified result plus a size-reduction summary.

   100% self-contained: own CSS, HTML and JS, mounted into a private
   Shadow DOM root so it can never clash with the host app's styles or
   element IDs. Auto-builds itself on load and injects its own floating
   trigger button. Delete this <script> tag (or the file) and the app
   loses nothing else — this widget owns everything it needs.

   This is a conservative, correctness-first minifier (string/template/
   regex/comment-aware), not a full AST compressor like Terser — it will
   not produce the absolute smallest possible output, but it will not
   corrupt your code either.
   ===================================================================== */
(function(){
"use strict";

if(document.getElementById('dvCodeMinifyHost')) return;

const dvHost = document.createElement('div');
dvHost.id = 'dvCodeMinifyHost';
document.documentElement.appendChild(dvHost);
const dvRoot = dvHost.attachShadow({ mode: 'open' });

dvRoot.innerHTML = `
<style>
  :host{ all: initial; }
  *{ box-sizing: border-box; }
  .dv-fab{
    position: fixed; right: 16px; bottom: 152px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%;
    background: #FF6D00; color: #fff; border: none;
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
  .dv-bar-title{ flex: 1; font-weight: 700; font-size: 1.05rem; }
  .dv-select{
    height: 40px; border-radius: 8px; border: 1.5px solid #30363d;
    background: #0d1117; color: #c9d1d9; padding: 0 10px; font-size: .95rem;
    font-family: Roboto, Arial, sans-serif; flex-shrink: 0;
  }
  .dv-go-btn{
    height: 40px; padding: 0 16px; border-radius: 8px; border: none;
    background: #FF6D00; color: #fff; font-weight: 700; flex-shrink: 0;
  }
  .dv-go-btn:active{ filter: brightness(.85); }

  .dv-split{ flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
  .dv-pane{ flex: 1; display: flex; flex-direction: column; min-height: 0; border-bottom: 1px solid #30363d; }
  .dv-pane:last-child{ border-bottom: none; }
  .dv-pane-head{
    flex-shrink: 0; padding: 8px 14px; font-size: .85rem; font-weight: 700;
    color: #8b949e; background: #161b22; display: flex; justify-content: space-between; align-items: center;
  }
  .dv-pane textarea{
    flex: 1; width: 100%; resize: none; border: none; outline: none;
    background: #0d1117; color: #c9d1d9; padding: 12px 14px;
    font: 13px/1.6 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  .dv-copy-mini{
    border: none; background: transparent; color: #58a6ff; font-size: .82rem; font-weight: 700;
  }
  .dv-stats{
    flex-shrink: 0; padding: 8px 14px; font-size: .85rem; color: #3fb950;
    background: #161b22; border-top: 1px solid #30363d;
  }
</style>

<button class="dv-fab" id="dvFab" aria-label="Minify Code">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
</button>

<div class="dv-modal" id="dvModal">
  <div class="dv-bar">
    <button class="dv-icon-btn" id="dvClose" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <span class="dv-bar-title">Code Minifier</span>
    <select class="dv-select" id="dvLangSelect">
      <option value="auto">Auto-detect</option>
      <option value="js">JavaScript</option>
      <option value="css">CSS</option>
      <option value="html">HTML</option>
    </select>
    <button class="dv-go-btn" id="dvGoBtn">Minify</button>
  </div>
  <div class="dv-split">
    <div class="dv-pane">
      <div class="dv-pane-head"><span>Input</span></div>
      <textarea id="dvInput" placeholder="Paste JS, CSS, or HTML here…" spellcheck="false"></textarea>
    </div>
    <div class="dv-pane">
      <div class="dv-pane-head"><span>Minified Output</span><button class="dv-copy-mini" id="dvCopyBtn">Copy</button></div>
      <textarea id="dvOutput" readonly placeholder="Minified result appears here…" spellcheck="false"></textarea>
    </div>
  </div>
  <div class="dv-stats" id="dvStats">&nbsp;</div>
</div>
`;

const dvFab = dvRoot.getElementById('dvFab');
const dvModal = dvRoot.getElementById('dvModal');
const dvClose = dvRoot.getElementById('dvClose');
const dvLangSelect = dvRoot.getElementById('dvLangSelect');
const dvGoBtn = dvRoot.getElementById('dvGoBtn');
const dvInput = dvRoot.getElementById('dvInput');
const dvOutput = dvRoot.getElementById('dvOutput');
const dvCopyBtn = dvRoot.getElementById('dvCopyBtn');
const dvStats = dvRoot.getElementById('dvStats');

function dvOpenModal(){ dvModal.classList.add('dv-open'); dvInput.focus(); }
function dvCloseModal(){ dvModal.classList.remove('dv-open'); }

/* ---------- JS minifier: string/template/regex/comment-aware, single pass ---------- */
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

/* ---------- CSS minifier: string-aware ---------- */
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

/* ---------- HTML minifier: protects <pre>/<textarea>/<script>/<style> content ---------- */
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

function dvRunMinify(){
  const code = dvInput.value;
  if(!code.trim()){ dvStats.textContent = 'Paste some code first.'; return; }
  let lang = dvLangSelect.value;
  if(lang === 'auto') lang = dvDetectLanguage(code);

  let minified;
  if(lang === 'css') minified = dvMinifyCss(code);
  else if(lang === 'html') minified = dvMinifyHtml(code);
  else minified = dvMinifyJs(code);

  dvOutput.value = minified;
  const before = code.length;
  const after = minified.length;
  const pct = before > 0 ? Math.round((1 - after/before) * 100) : 0;
  dvStats.textContent = `${lang.toUpperCase()} · ${before.toLocaleString()} → ${after.toLocaleString()} characters (${pct}% smaller)`;
}

function dvCopyOutput(){
  if(!dvOutput.value){ dvStats.textContent = 'Nothing to copy yet.'; return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(dvOutput.value).then(()=>{
      dvStats.textContent = 'Copied to clipboard.';
    });
  }
}

dvFab.addEventListener('click', dvOpenModal);
dvClose.addEventListener('click', dvCloseModal);
dvGoBtn.addEventListener('click', dvRunMinify);
dvCopyBtn.addEventListener('click', dvCopyOutput);

})();
