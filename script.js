import { init, compress, decompress } from './zstd.js';

const MAX_LINES = 10000;
const HIGHLIGHT_LIMIT = 10000;
const QR_MAX_URL_LENGTH = 350; // Max URL length that produces a scannable QR at 172px (≥2.6 px/module)

// Core Editor Elements
const editor = document.getElementById('editor');
const codeContent = document.getElementById('code-content');
const highlighting = document.getElementById('highlighting');
const stats = document.getElementById('stats');
const statusBar = document.getElementById('status-bar');
const lineNumbers = document.getElementById('line-numbers');
const editorContainer = document.getElementById('editor-container');
const dropOverlay = document.getElementById('drop-overlay');

// Header Actions
const brandLink = document.getElementById('brand-link');
const newBtn = document.getElementById('new-btn');
const sendBtn = document.getElementById('send-btn');
const downloadBtn = document.getElementById('download-btn');
const aboutBtn = document.getElementById('about-btn');
const snowBtn = document.getElementById('snow-btn');
const snowText = document.getElementById('snow-text');
const snowContainer = document.getElementById('snow-container');

// Toolbar Elements
const tbCopy = document.getElementById('tb-copy');
const tbLock = document.getElementById('tb-lock');
const tbLines = document.getElementById('tb-lines');
const tbWrap = document.getElementById('tb-wrap');
const tbTheme = document.getElementById('tb-theme');
const tbExpand = document.getElementById('tb-expand');
const tbLang = document.getElementById('tb-lang');
const langLabel = document.getElementById('lang-label');
const langDropdown = document.getElementById('lang-dropdown');
const floatingToolbar = document.getElementById('floating-toolbar');
const tbToggle = document.getElementById('tb-toggle');

// Share & Feedback Elements
const sendBtnIcon = document.getElementById('send-btn-icon');
const shareCopiedTooltip = document.getElementById('share-copied-tooltip');
const sharePopup = document.getElementById('share-popup');
const shareBackdrop = document.getElementById('share-backdrop');
const qrcodeDiv = document.getElementById('qrcode');
const closeShare = document.getElementById('close-share');
const qrStatus = document.getElementById('qr-status');
const shareUrlInput = document.getElementById('share-url');

// Modals
const aboutModal = document.getElementById('about-modal');
const aboutCard = document.getElementById('about-card');
const closeAbout = document.getElementById('close-about');

// Runtime State
let debounceTimer = null;
let urlDebounceTimer = null;
let currentRenderedLines = 0;
let isLocked = false;
let isWrapped = false;
let manualLanguage = null; // null means auto-detect
let activeLanguage = 'javascript';

// Language Label Display Map
const langDisplayMap = {
  javascript: 'JS',
  typescript: 'TS',
  python: 'Python',
  markup: 'HTML',
  css: 'CSS',
  cpp: 'C++',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
  json: 'JSON',
  sql: 'SQL',
  markdown: 'MD',
  bash: 'Bash',
  none: 'Text',
};

// Themes
const themes = [
  {
    name: 'tomorrow',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
    bg: '#1e1e22',
  },
  {
    name: 'okaidia',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css',
    bg: '#272822',
  },
  {
    name: 'twilight',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-twilight.min.css',
    bg: '#141414',
  },
  {
    name: 'funky',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-funky.min.css',
    bg: '#000000',
  },
];
let currentThemeIndex = 0;

/* =========================================
   INITIALIZATION
   ========================================= */

async function main() {
  if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
    window.Prism.plugins.autoloader.languages_path =
      'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
  }

  try {
    await init('./zstd.wasm');
  } catch (e) {
    console.error('Zstd WASM init error:', e);
  }

  // Ensure browser tab displays the dark monochrome theme favicon
  const iconEl = document.querySelector("link[rel~='icon']");
  if (iconEl) {
    iconEl.href =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%23050505'/%3E%3Crect x='1' y='1' width='30' height='30' rx='7' fill='none' stroke='%2327272a' stroke-width='1'/%3E%3Cpath d='M11 11L6 16L11 21' fill='none' stroke='%23e4e4e7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M21 11L26 16L21 21' fill='none' stroke='%23e4e4e7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='18' y1='9' x2='14' y2='23' stroke='%2371717a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E";
  }

  checkInitialHash();
  updateActionButtonsState();
  editor.focus();
}

function checkInitialHash() {
  const hash = window.location.hash;
  if (hash.length > 1) {
    decodeUrl();
  } else {
    handleInput();
  }
  updateActionButtonsState();
}

window.addEventListener('hashchange', checkInitialHash);

/* =========================================
   TOOLBAR FEATURES
   ========================================= */

// Copy Code Button (in-button visual feedback only)
if (tbCopy) {
  tbCopy.addEventListener('click', () => {
    const text = editor.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const iconCopy = document.getElementById('icon-copy');
      iconCopy.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
      tbCopy.classList.add('text-white');
      setTimeout(() => {
        iconCopy.innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`;
        tbCopy.classList.remove('text-white');
      }, 1600);
    });
  });
}

// Read-Only Lock Button
if (tbLock) {
  tbLock.addEventListener('click', () => {
    isLocked = !isLocked;
    editor.readOnly = isLocked;
    const iconLock = document.getElementById('icon-lock');
    if (isLocked) {
      iconLock.innerHTML =
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>';
      tbLock.classList.add('text-red-400', 'active');
      editor.classList.add('cursor-not-allowed', 'opacity-80');
    } else {
      iconLock.innerHTML =
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
      tbLock.classList.remove('text-red-400', 'active');
      editor.classList.remove('cursor-not-allowed', 'opacity-80');
    }
  });
}

// Line Numbers Toggle
if (tbLines) {
  tbLines.addEventListener('click', () => {
    editorContainer.classList.toggle('hide-lines');
    tbLines.classList.toggle('active');
    handleScroll();
  });
}

// Word Wrap Toggle
if (tbWrap) {
  tbWrap.addEventListener('click', () => {
    isWrapped = !isWrapped;
    editorContainer.classList.toggle('is-wrapped', isWrapped);
    tbWrap.classList.toggle('active', isWrapped);
    handleScroll();
  });
}

// Theme Switcher
if (tbTheme) {
  tbTheme.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const theme = themes[currentThemeIndex];
    document.getElementById('prism-theme').href = theme.url;
    editorContainer.style.background = theme.bg;
  });
}

// Fullscreen Toggle
if (tbExpand) {
  tbExpand.addEventListener('click', () => {
    editorContainer.classList.toggle('is-fullscreen');
    const iconExpand = document.getElementById('icon-expand');
    if (editorContainer.classList.contains('is-fullscreen')) {
      document.body.style.overflow = 'hidden';
      iconExpand.innerHTML = `<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>`;
      tbExpand.classList.add('active');
    } else {
      document.body.style.overflow = 'auto';
      iconExpand.innerHTML = `<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line>`;
      tbExpand.classList.remove('active');
    }
    handleScroll();
  });
}

// Language Selector Dropdown
if (tbLang && langDropdown) {
  tbLang.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('hidden');
  });

  document.querySelectorAll('.lang-option').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chosen = btn.getAttribute('data-lang');
      if (chosen === 'auto') {
        manualLanguage = null;
        const detected = detectLanguage(editor.value);
        activeLanguage = detected;
        langLabel.textContent = langDisplayMap[detected] || 'Auto';
      } else {
        manualLanguage = chosen;
        activeLanguage = chosen;
        langLabel.textContent = langDisplayMap[chosen] || chosen.toUpperCase();
      }
      applyHighlighting();
      langDropdown.classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    if (!langDropdown.contains(e.target) && e.target !== tbLang) {
      langDropdown.classList.add('hidden');
    }
  });

  // Mobile tap & toggle support for the floating toolbar
  if (tbToggle) {
    tbToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (floatingToolbar) {
        floatingToolbar.classList.toggle('is-open');
      }
    });
  }

  // Mobile tap & toggle support for status bar
  if (statusBar) {
    statusBar.addEventListener('click', (e) => {
      e.stopPropagation();
      statusBar.classList.toggle('is-open');
    });
  }

  document.addEventListener('pointerdown', (e) => {
    if (floatingToolbar && !floatingToolbar.contains(e.target)) {
      floatingToolbar.classList.remove('is-open');
    }
    if (statusBar && !statusBar.contains(e.target)) {
      statusBar.classList.remove('is-open');
    }
  });
}

/* =========================================
   CORE LOGIC & SYNTAX HIGHLIGHTING
   ========================================= */

function updateActionButtonsState() {
  const hasContent = !!(editor && editor.value && editor.value.trim().length > 0);

  if (downloadBtn) {
    if (hasContent) {
      downloadBtn.removeAttribute('disabled');
      downloadBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
      downloadBtn.classList.add('cursor-pointer', 'hover:text-white', 'hover:bg-zinc-800/60');
    } else {
      downloadBtn.setAttribute('disabled', 'true');
      downloadBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
      downloadBtn.classList.remove('cursor-pointer', 'hover:text-white', 'hover:bg-zinc-800/60');
    }
  }

  if (sendBtn) {
    if (hasContent) {
      sendBtn.removeAttribute('disabled');
      sendBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
      sendBtn.classList.add('cursor-pointer', 'hover:text-white', 'hover:bg-zinc-800/60');
    } else {
      sendBtn.setAttribute('disabled', 'true');
      sendBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
      sendBtn.classList.remove('cursor-pointer', 'hover:text-white', 'hover:bg-zinc-800/60');
    }
  }
}

function handleScroll() {
  highlighting.scrollTop = editor.scrollTop;
  highlighting.scrollLeft = editor.scrollLeft;
  if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
}

function handleInput() {
  let text = editor.value;
  updateActionButtonsState();
  let lineCount = 1;
  let limitIndex = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lineCount++;
      if (lineCount > MAX_LINES) {
        limitIndex = i;
        break;
      }
    }
  }

  if (limitIndex !== -1) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    text = text.substring(0, limitIndex);
    editor.value = text;
    editor.setSelectionRange(Math.min(start, text.length), Math.min(end, text.length));
    lineCount = MAX_LINES;
  }

  let displayContent = text;
  if (displayContent.endsWith('\n')) displayContent += ' ';
  codeContent.textContent = displayContent;

  if (lineNumbers && lineCount !== currentRenderedLines) {
    currentRenderedLines = lineCount;
    lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  }

  applyHighlightingDebounced();

  clearTimeout(urlDebounceTimer);
  urlDebounceTimer = setTimeout(() => updateUrl(false, lineCount), 400);
}

function applyHighlightingDebounced() {
  const text = editor.value;
  const lineCount = currentRenderedLines || 1;

  if (lineCount > HIGHLIGHT_LIMIT) {
    codeContent.className = 'language-none';
    return;
  }

  clearTimeout(debounceTimer);
  const delay = text.length > 50000 ? 800 : text.length > 10000 ? 400 : 200;
  debounceTimer = setTimeout(applyHighlighting, delay);
}

function applyHighlighting() {
  const text = editor.value;
  if (manualLanguage) {
    activeLanguage = manualLanguage;
  } else {
    activeLanguage = detectLanguage(text);
    if (langLabel) {
      langLabel.textContent = text.trim() ? langDisplayMap[activeLanguage] || 'Auto' : 'Auto';
    }
  }

  codeContent.className = `language-${activeLanguage}`;
  if (window.Prism && activeLanguage !== 'none') {
    Prism.highlightElement(codeContent);
  }
}

// Comprehensive, Accurate Language Detection
function detectLanguage(code) {
  if (!code || !code.trim()) return 'javascript';

  // 1. Java check (prioritized: catches package, imports, types, main, System.out)
  if (
    /public\s+static\s+void\s+main/.test(code) ||
    /System\.(out|err)\.(println|print|printf)/.test(code) ||
    /^\s*import\s+(static\s+)?(java|javax|org|com|android)\.[\w.*]+;/m.test(code) ||
    /^\s*package\s+[\w.]+;/m.test(code) ||
    /@\s*(Override|Nullable|NonNull|Autowired|Component|Service|Test|Bean|Entity)\b/.test(code) ||
    /\b(public|private|protected)\s+(static\s+)?(final\s+)?(class|interface|enum|void|int|long|boolean|double|float|char|String)\b/.test(
      code
    ) ||
    (/\bclass\s+\w+/.test(code) &&
      code.includes('{') &&
      code.includes(';') &&
      !code.includes('def '))
  ) {
    return 'java';
  }

  // 2. C / C++
  if (
    /#include\s*<[\w./]+>|#include\s*"[\w./]+"/.test(code) ||
    /\bstd::(cout|cin|cerr|vector|string|map|set)\b/.test(code) ||
    /\bint\s+main\s*\([^)]*\)\s*\{/.test(code)
  ) {
    return 'cpp';
  }

  // 3. Rust
  if (
    /^\s*(pub\s+)?fn\s+\w+\s*(<[^>]+>)?\s*\(/m.test(code) ||
    /\b(let\s+mut|impl\s+\w+|use\s+std::|println!|eprintln!)\b/.test(code)
  ) {
    return 'rust';
  }

  // 4. Go
  if (/^\s*package\s+\w+/.test(code) && !code.includes(';')) return 'go';
  if (
    /^\s*func\s+(\([^)]+\)\s+)?\w+\s*\(/.test(code) ||
    /\bfmt\.(Print|Println|Printf|Sprintf)\b/.test(code)
  )
    return 'go';

  // 5. HTML / XML
  if (
    /<!DOCTYPE\s+html/i.test(code) ||
    (/<[a-z][\s\S]*>/i.test(code) && (code.includes('</') || code.includes('/>')))
  )
    return 'markup';

  // 6. Python (strict: requires Python-specific constructs, not semicolons or braces)
  const hasPyDef = /^\s*def\s+\w+\s*\([^)]*\)\s*(->\s*[^:]+)?\s*:/m.test(code);
  const hasPyClass = /^\s*class\s+\w+\s*(\([^)]*\))?\s*:/m.test(code);
  const hasPyImport =
    /^\s*(import\s+[a-zA-Z_]\w*(\s*,\s*[a-zA-Z_]\w*)*|from\s+[a-zA-Z_]\w*\s+import\s+[\w*,\s()]+)$/m.test(
      code
    );
  const hasPyControl = /^\s*(if|elif|else|for|while|try|except|finally|with)\s+.*:\s*$/m.test(code);
  const hasPyDunder = /__(init|name|main|repr|str)__/.test(code);
  const hasPyPrint = /^\s*print\s*\(/m.test(code);

  if (
    hasPyDef ||
    hasPyClass ||
    (hasPyImport && !code.includes(';')) ||
    hasPyControl ||
    hasPyDunder ||
    (hasPyPrint && !code.includes(';'))
  ) {
    return 'python';
  }

  // 7. TypeScript
  if (
    /\b(interface\s+\w+\s*\{|type\s+\w+\s*=|as\s+const\b|:\s*(string|number|boolean|any|void|unknown|never)\b)/.test(
      code
    )
  )
    return 'typescript';

  // 8. CSS
  if (/^[\s\w.-]+\s*\{[^}]*[\w-]+\s*:\s*[^;]+;/m.test(code) || /@(media|keyframes)\s+/.test(code))
    return 'css';

  // 9. SQL
  if (
    /^\s*(SELECT\s+[\w*,\s]+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/im.test(
      code
    )
  )
    return 'sql';

  // 10. JSON
  if (/^\s*\{\s*"[\w-]+"\s*:\s*/.test(code) || /^\s*\[\s*\{\s*"/.test(code)) return 'json';

  // 11. Bash / Shell
  if (
    /^#!\/bin\/(bash|sh|zsh)/.test(code) ||
    /^\s*(sudo\s+|apt\s+|npm\s+run|git\s+commit|chmod\s+\+x)/m.test(code)
  )
    return 'bash';

  // 12. Markdown
  if (/^#+\s+[\w\s]+/m.test(code) || /^```[a-z]+/m.test(code)) return 'markdown';

  // Default JavaScript
  return 'javascript';
}

function updateUrl(saveToHistory = false, currentLines = 0) {
  const text = editor.value;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = currentLines || (text ? text.split('\n').length : 0);

  if (!text) {
    if (saveToHistory) window.history.replaceState(null, null, window.location.pathname);
    stats.innerHTML = '0 LINES · 0 WORDS · 0 CHARS';
    return;
  }

  try {
    const buffer = new TextEncoder().encode(text);
    const compressed = compress(buffer, 19);

    let binaryString = '';
    for (let i = 0; i < compressed.length; i += 8192) {
      binaryString += String.fromCharCode.apply(null, compressed.subarray(i, i + 8192));
    }

    const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (saveToHistory && base64.length < 50000) {
      window.history.replaceState(null, null, '#' + base64);
    }

    const linkLen =
      window.location.origin.length + window.location.pathname.length + 1 + base64.length;
    const compressionRatio =
      charCount > 0 ? Math.round((1 - compressed.length / buffer.length) * 100) : 0;
    const ratioText = compressionRatio > 0 ? ` · ${compressionRatio}% SAVED` : '';
    const urlPillClass =
      linkLen >= QR_MAX_URL_LENGTH ? 'text-zinc-400 font-medium' : 'text-zinc-400';

    stats.innerHTML = `${lines} LINES · ${wordCount} WORDS · <span class="${urlPillClass}">${(linkLen / 1000).toFixed(1)}k URL${ratioText}</span>`;
  } catch (e) {
    stats.innerHTML = `${lines} LINES · ${wordCount} WORDS · ${charCount} CHARS`;
  }
}

function decodeUrl() {
  try {
    const hash = window.location.hash.slice(1);
    let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binaryString = atob(base64);
    const compressed = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);

    editor.value = new TextDecoder().decode(decompress(compressed));
    handleInput();
    handleScroll();
  } catch (e) {
    editor.value = '// ERROR: Snippet link corrupted or truncated.';
    handleInput();
  }
}

/* =========================================
   NEW SNIPPET ACTION (NO ALERTS / DIALOGS)
   ========================================= */

function resetSnippet() {
  editor.value = '';
  window.history.replaceState(null, null, window.location.pathname);
  manualLanguage = null;
  if (langLabel) langLabel.textContent = 'Auto';
  handleInput();
  handleScroll();
  closeSharePopup();
  editor.focus();
}

// Header brand logo is static - click is disabled

/* =========================================
   STREAMLINED SHARE ACTION (QR FOR SHORT, DIRECT COPY FOR LARGE)
   ========================================= */

let shareCopiedTimer = null;

function triggerShareAction() {
  const text = editor.value;
  if (!text || !text.trim()) return;

  // 1. Update URL hash with latest compressed content
  updateUrl(true, text.split('\n').length);
  const shareUrl = window.location.href;
  const urlLength = shareUrl.length;

  if (shareUrlInput) shareUrlInput.value = shareUrl;

  // 2. Always copy URL directly to clipboard
  navigator.clipboard.writeText(shareUrl).catch(() => {});

  if (urlLength <= QR_MAX_URL_LENGTH) {
    // Short snippet: open QR popup for scanning from phone
    openQrPopup(shareUrl);
  } else {
    // Large snippet: no popup! Direct copy with inline checkmark & small msg near icon
    closeSharePopup();
    showShareCopiedFeedback();
  }
}

// Show subtle inline "Copied!" feedback and change share icon to checkmark for some seconds
function showShareCopiedFeedback() {
  if (!sendBtn || !sendBtnIcon) return;

  // Change icon to checkmark
  sendBtnIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
  sendBtn.classList.add('text-white', 'bg-zinc-800/60');
  sendBtn.classList.remove('text-zinc-400');

  // Show small message near button
  if (shareCopiedTooltip) {
    shareCopiedTooltip.classList.remove('hidden');
    shareCopiedTooltip.classList.add('flex');
  }

  if (shareCopiedTimer) clearTimeout(shareCopiedTimer);
  shareCopiedTimer = setTimeout(resetShareButton, 2200);
}

// Revert share button back to original paper plane icon
function resetShareButton() {
  if (!sendBtn || !sendBtnIcon) return;
  sendBtnIcon.innerHTML = `
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    `;
  sendBtn.classList.remove('text-white', 'bg-zinc-800/60');
  sendBtn.classList.add('text-zinc-400');

  if (shareCopiedTooltip) {
    shareCopiedTooltip.classList.add('hidden');
    shareCopiedTooltip.classList.remove('flex');
  }
}

function openQrPopup(shareUrl) {
  if (!sharePopup || !qrcodeDiv) return;

  // Show popup and backdrop
  sharePopup.classList.remove('hidden');
  shareBackdrop.classList.remove('hidden');

  qrcodeDiv.innerHTML = '';
  new window.QRCode(qrcodeDiv, {
    text: shareUrl,
    width: 172,
    height: 172,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: window.QRCode.CorrectLevel.L,
  });

  if (qrStatus) {
    qrStatus.innerHTML = `
            <svg class="text-zinc-400 w-3 h-3 inline shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Link copied to clipboard</span>
        `;
  }
}

function closeSharePopup() {
  if (sharePopup) sharePopup.classList.add('hidden');
  if (shareBackdrop) shareBackdrop.classList.add('hidden');
}

// Close button & backdrop dismiss (click anywhere outside closes automatically)
if (closeShare) closeShare.addEventListener('click', closeSharePopup);
if (shareBackdrop) shareBackdrop.addEventListener('click', closeSharePopup);

// Light dismiss: clicking anywhere outside closes the QR popup
document.addEventListener('pointerdown', (e) => {
  if (sharePopup && !sharePopup.classList.contains('hidden')) {
    if (!sharePopup.contains(e.target) && !sendBtn.contains(e.target)) {
      closeSharePopup();
    }
  }
});

/* =========================================
   SMART CODE EDITING ERGONOMICS
   ========================================= */

editor.addEventListener('scroll', handleScroll);
editor.addEventListener('input', handleInput);

editor.addEventListener('keydown', (e) => {
  // Tab & Shift+Tab handling
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    if (e.shiftKey) {
      // Unindent 4 spaces
      const before = editor.value.substring(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const line = editor.value.substring(lineStart, start);
      if (line.endsWith('    ')) {
        editor.setRangeText('', start - 4, start, 'end');
        handleInput();
      }
    } else {
      // Indent 4 spaces
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, '    ');
      } else {
        editor.setRangeText('    ', start, end, 'end');
        handleInput();
      }
    }
  }

  // Smart Indentation on Enter
  if (e.key === 'Enter') {
    e.preventDefault();
    const start = editor.selectionStart;
    const textBefore = editor.value.substring(0, start);
    const lastNewLine = textBefore.lastIndexOf('\n');
    const currentLine = textBefore.substring(lastNewLine + 1);

    // Match existing line indentation
    const match = currentLine.match(/^(\s*)/);
    let indent = match ? match[1] : '';

    // Increase indent if line ends with opening brace, colon, or bracket
    const trimmed = currentLine.trim();
    if (
      trimmed.endsWith('{') ||
      trimmed.endsWith(':') ||
      trimmed.endsWith('(') ||
      trimmed.endsWith('[')
    ) {
      indent += '    ';
    }

    const insert = '\n' + indent;
    editor.setRangeText(insert, start, editor.selectionEnd, 'end');
    handleInput();
  }
});

/* =========================================
   GLOBAL KEYBOARD SHORTCUTS
   ========================================= */

window.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to Share
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (editor.value && editor.value.trim()) {
      triggerShareAction();
    }
  }

  // Ctrl/Cmd + Alt + N for New Snippet in New Tab
  if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    window.open(window.location.origin + window.location.pathname, '_blank');
  }

  // Escape to close all popups & modals
  if (e.key === 'Escape') {
    closeSharePopup();
    if (aboutModal) aboutModal.classList.add('hidden');
    if (langDropdown) langDropdown.classList.add('hidden');
  }
});

/* =========================================
   FILE DOWNLOAD
   ========================================= */

if (downloadBtn) {
  downloadBtn.addEventListener('click', (e) => {
    const text = editor.value;
    if (!text || !text.trim()) {
      e.preventDefault();
      return;
    }

    const extMap = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      rust: 'rs',
      go: 'go',
      cpp: 'cpp',
      java: 'java',
      html: 'html',
      markup: 'html',
      css: 'css',
      json: 'json',
      sql: 'sql',
      markdown: 'md',
      bash: 'sh',
    };
    const ext = extMap[activeLanguage] || 'txt';
    const filename = `SharePaste_${Date.now()}.${ext}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', (e) => {
    if (!editor.value || !editor.value.trim()) {
      e.preventDefault();
      return;
    }
    triggerShareAction();
  });
}

/* =========================================
   DRAG AND DROP FILE IMPORT
   ========================================= */

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('is-dragging');
});

window.addEventListener('dragleave', (e) => {
  if (e.clientX === 0 && e.clientY === 0) {
    document.body.classList.remove('is-dragging');
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('is-dragging');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      editor.value = event.target.result;

      // Infer language from file extension
      const ext = file.name.split('.').pop().toLowerCase();
      const extToLang = {
        py: 'python',
        js: 'javascript',
        mjs: 'javascript',
        ts: 'typescript',
        rs: 'rust',
        go: 'go',
        cpp: 'cpp',
        c: 'cpp',
        h: 'cpp',
        hpp: 'cpp',
        java: 'java',
        html: 'markup',
        xml: 'markup',
        css: 'css',
        json: 'json',
        sql: 'sql',
        md: 'markdown',
        sh: 'bash',
        bash: 'bash',
        txt: 'none',
      };
      if (extToLang[ext]) {
        manualLanguage = extToLang[ext];
        activeLanguage = manualLanguage;
        if (langLabel)
          langLabel.textContent = langDisplayMap[manualLanguage] || manualLanguage.toUpperCase();
      }

      handleInput();
      handleScroll();
    };
    reader.readAsText(file);
  }
});

/* =========================================
   ABOUT MODAL
   ========================================= */

if (aboutBtn) {
  aboutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSharePopup();
    aboutModal.classList.remove('hidden');
  });
}
if (closeAbout) closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));

// Autoclose on click anywhere outside the about card or on backdrop
if (aboutModal) {
  aboutModal.addEventListener('pointerdown', (e) => {
    if (!aboutCard || !aboutCard.contains(e.target)) {
      aboutModal.classList.add('hidden');
    }
  });
}

/* =========================================
   SNOW EFFECT TOGGLE
   ========================================= */

let snowInterval = null;
if (snowBtn) {
  snowBtn.addEventListener('click', () => {
    if (snowInterval) {
      clearInterval(snowInterval);
      snowInterval = null;
      if (snowText) snowText.innerText = 'Snow';
      snowBtn.classList.remove('text-white');
      snowBtn.classList.add('text-zinc-400');
    } else {
      snowInterval = setInterval(() => {
        const s = document.createElement('div');
        s.innerText = '❅';
        s.classList.add('snowflake');
        s.style.left = Math.random() * 100 + 'vw';
        s.style.fontSize = Math.random() * 10 + 10 + 'px';
        s.style.opacity = Math.random() * 0.5 + 0.1;
        s.style.animationDuration = Math.random() * 3 + 3 + 's';
        snowContainer.appendChild(s);
        setTimeout(() => s.remove(), 4000);
      }, 100);
      if (snowText) snowText.innerText = 'Stop';
      snowBtn.classList.add('text-white');
      snowBtn.classList.remove('text-zinc-400');
    }
  });
}

/* =========================================
   BOOTSTRAP APPLICATION
   ========================================= */

main();
