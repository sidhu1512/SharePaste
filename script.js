import { init, compress, decompress } from './zstd.js';

const MAX_LINES = 10000;          
const HIGHLIGHT_LIMIT = 10000;  
const P2P_LIMIT = 800;          // FIXED: Lowered so 1.3k triggers P2P seamlessly
const SHORTEN_LIMIT = 2000;     // FIXED: Hard cap to prevent CORS/AllOrigins 500 error on massive URLs

const editor = document.getElementById('editor');
const codeContent = document.getElementById('code-content');
const highlighting = document.getElementById('highlighting');
const stats = document.getElementById('stats');
const lineNumbers = document.getElementById('line-numbers');
const editorContainer = document.getElementById('editor-container');

// Toolbar Buttons
const tbCopy = document.getElementById('tb-copy');
const tbLock = document.getElementById('tb-lock');
const tbLines = document.getElementById('tb-lines');
const tbTheme = document.getElementById('tb-theme');
const tbExpand = document.getElementById('tb-expand');

// Modals
const sendBtn = document.getElementById('send-btn');
const downloadBtn = document.getElementById('download-btn');
const shareModal = document.getElementById('share-modal');
const closeShare = document.getElementById('close-share');
const qrcodeDiv = document.getElementById('qrcode');
const qrWrapper = qrcodeDiv ? qrcodeDiv.parentElement : null; 
const shareUrlInput = document.getElementById('share-url');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const shortenLinkBtn = document.getElementById('shorten-link-btn');
const urlWarning = document.getElementById('url-warning');

let debounceTimer = null; 
let urlDebounceTimer = null; 
let currentRenderedLines = 0;
let currentPeer = null; 
let isLocked = false;

// Themes
const themes = [
    { name: 'tomorrow', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css', bg: '#2d2d2d' },
    { name: 'okaidia', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css', bg: '#272822' },
    { name: 'twilight', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-twilight.min.css', bg: '#141414' },
    { name: 'funky', url: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-funky.min.css', bg: '#000000' }
];
let currentThemeIndex = 0;

async function main() {
    try { await init('./zstd.wasm'); } catch (e) { console.error(e); }
    checkInitialHash();
}

function checkInitialHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#p2p=')) receiveP2P(hash.split('=')[1]);
    else if (hash.length > 1) decodeUrl();
}

window.addEventListener('hashchange', checkInitialHash);

/* =========================================
   TOOLBAR FEATURES
   ========================================= */

tbCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(editor.value).then(() => {
        const iconCopy = document.getElementById('icon-copy');
        iconCopy.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
        tbCopy.classList.add('text-green-400');
        setTimeout(() => {
            iconCopy.innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>`;
            tbCopy.classList.remove('text-green-400');
        }, 2000);
    });
});

tbLock.addEventListener('click', () => {
    isLocked = !isLocked;
    editor.readOnly = isLocked;
    const iconLock = document.getElementById('icon-lock');
    if (isLocked) {
        iconLock.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'; 
        tbLock.classList.add('text-red-400', 'active');
        editor.classList.add('cursor-not-allowed', 'opacity-80');
    } else {
        iconLock.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';         
        tbLock.classList.remove('text-red-400', 'active');
        editor.classList.remove('cursor-not-allowed', 'opacity-80');
    }
});

tbLines.addEventListener('click', () => {
    editorContainer.classList.toggle('hide-lines');
    tbLines.classList.toggle('active');
    handleScroll();
});

tbTheme.addEventListener('click', () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const theme = themes[currentThemeIndex];
    document.getElementById('prism-theme').href = theme.url;
    editorContainer.style.background = theme.bg;
});

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

/* =========================================
   CORE LOGIC
   ========================================= */

function handleScroll() {
    highlighting.scrollTop = editor.scrollTop;
    highlighting.scrollLeft = editor.scrollLeft;
    if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
}

function handleInput() {
    let text = editor.value;
    let lineCount = 1;
    let limitIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            lineCount++;
            if (lineCount > MAX_LINES) { limitIndex = i; break; }
        }
    }

    if (limitIndex !== -1) {
        const start = editor.selectionStart; const end = editor.selectionEnd;
        text = text.substring(0, limitIndex); editor.value = text;
        editor.setSelectionRange(Math.min(start, text.length), Math.min(end, text.length));
        lineCount = MAX_LINES; 
    }

    let displayContent = text;
    if (displayContent.endsWith('\n')) displayContent += " "; 
    codeContent.textContent = displayContent;

    if (lineNumbers && lineCount !== currentRenderedLines) {
        currentRenderedLines = lineCount;
        lineNumbers.textContent = Array.from({length: lineCount}, (_, i) => i + 1).join('\n');
    }

    if (lineCount > HIGHLIGHT_LIMIT) {
        codeContent.className = 'language-text'; 
    } else {
        clearTimeout(debounceTimer);
        const delay = text.length > 50000 ? 1000 : text.length > 10000 ? 600 : 300;
        debounceTimer = setTimeout(() => {
            const lang = detectLanguage(text);
            codeContent.className = `language-${lang}`;
            if (window.Prism) Prism.highlightElement(codeContent); 
        }, delay);
    }

    clearTimeout(urlDebounceTimer);
    urlDebounceTimer = setTimeout(() => updateUrl(false, lineCount), 400);
}

function detectLanguage(code) {
    if (!code) return 'text';
    if (/^\s*(import|from)\s+\w+/m.test(code) || /^\s*def\s+\w+\s*\(/m.test(code)) return 'python';
    if (/(public\s+)?class\s+\w+/.test(code) || /public\s+static\s+void\s+main/.test(code)) return 'java';
    if (/#include\s*</.test(code) || /int\s+main\s*\(/.test(code)) return 'cpp';
    if (/<\/?[a-z][\s\S]*>/i.test(code)) return 'html';
    if (/[a-z-]+\s*:\s*[^;]+;/i.test(code) && code.includes('{') && code.includes('}')) return 'css';
    if (/function\s*\w*\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|=>/.test(code)) return 'javascript';
    return 'text'; // Fallback
}

function updateUrl(saveToHistory = false, currentLines = 0) {
    const text = editor.value;
    if (!text) {
        if (saveToHistory) window.history.replaceState(null, null, ' ');
        stats.innerHTML = "0 LINES"; return;
    }

    try {
        const buffer = new TextEncoder().encode(text);
        const compressed = compress(buffer, 4); 
        
        let binaryString = '';
        for (let i = 0; i < compressed.length; i += 8192) {
            binaryString += String.fromCharCode.apply(null, compressed.subarray(i, i + 8192));
        }
        
        const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        if (saveToHistory && base64.length < 50000) window.history.replaceState(null, null, '#' + base64);
        
        const linkLen = window.location.origin.length + 2 + base64.length;
        const urlClass = linkLen >= P2P_LIMIT ? "text-blue-500 font-bold" : "text-zinc-500";
        stats.innerHTML = `<span class="text-zinc-500">${currentLines} LINES</span><span class="text-zinc-700 mx-1">|</span><span class="${urlClass}">${(linkLen/1000).toFixed(1)}k URL</span>`;
    } catch (e) {}
}

function decodeUrl() {
    try {
        const hash = window.location.hash.slice(1);
        let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const binaryString = atob(base64);
        const compressed = new Uint8Array(binaryString.length);
        for(let i=0; i<binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);
        
        editor.value = new TextDecoder().decode(decompress(compressed));
        handleInput(); handleScroll();
    } catch (e) {
        editor.value = "// ERROR: Link data corrupted."; handleInput();
    }
}

/* =========================================
   SHARE, P2P & WHATSAPP SHORTENER
   ========================================= */

function openShareMenu() {
    updateUrl(true, editor.value.split('\n').length); 
    const longUrl = window.location.href;
    const urlLength = longUrl.length;
    
    shareUrlInput.value = longUrl;
    modalCopyBtn.innerText = "Copy";
    modalCopyBtn.classList.remove("text-green-400");
    
    // Reset WhatsApp button
    shortenLinkBtn.innerHTML = "Shorten Link (For WhatsApp)";
    shortenLinkBtn.classList.remove('bg-green-600', 'text-white', 'pointer-events-none');
    shortenLinkBtn.classList.add('bg-zinc-800', 'text-zinc-300', 'hover:bg-zinc-700');
    
    // Check WhatsApp limit logic
    if (urlLength > SHORTEN_LIMIT) {
        // Prevent CORS / 500 Error Crash by entirely hiding and disabling
        urlWarning.innerText = "⚠️ Link is too massive for URL shorteners. Scan the QR code below for Live Sync instead!";
        urlWarning.classList.remove('hidden');
        shortenLinkBtn.classList.add('hidden');
    } else if (urlLength > P2P_LIMIT) {
        urlWarning.innerText = "⚠️ Link might be too long for WhatsApp. Generate a short link below!";
        urlWarning.classList.remove('hidden');
        shortenLinkBtn.classList.remove('hidden');
    } else {
        urlWarning.classList.add('hidden');
        shortenLinkBtn.classList.add('hidden');
    }
    
    shareModal.classList.remove('hidden');
    qrcodeDiv.innerHTML = "";
    if (qrWrapper) qrWrapper.className = "p-2 bg-white rounded-lg flex flex-col justify-center items-center";

    // P2P Trigger at 800 threshold so QR is ALWAYS readable
    if (urlLength <= P2P_LIMIT) {
        new window.QRCode(qrcodeDiv, { text: longUrl, width: 180, height: 180, colorDark: "#000000", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.L });
        const msg = document.createElement("div");
        msg.className = "text-[10px] text-zinc-500 mt-2 text-center font-medium border-t border-zinc-100 pt-1 w-full";
        msg.innerText = "Scan to open on phone";
        qrcodeDiv.appendChild(msg);
    } else {
        setupP2PTransfer();
    }
}

// Fixed WhatsApp Shortener (With strict limit check & persistent success UI)
shortenLinkBtn.addEventListener('click', async () => {
    const longUrl = window.location.href;
    if (longUrl.length > SHORTEN_LIMIT) return; // Hard block 
    
    shortenLinkBtn.innerHTML = `<span class="animate-pulse">Shortening...</span>`;
    
    try {
        const targetUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        
        if (res.ok) {
            const shortUrl = await res.text();
            shareUrlInput.value = shortUrl;
            
            // Auto copy to clipboard seamlessly
            navigator.clipboard.writeText(shortUrl);
            
            // Change button to green success state (No Auto-Hide)
            shortenLinkBtn.classList.remove('bg-zinc-800', 'text-zinc-300', 'hover:bg-zinc-700');
            shortenLinkBtn.classList.add('bg-green-600', 'text-white', 'pointer-events-none');
            shortenLinkBtn.innerHTML = "✅ Shortened & Copied!";
            urlWarning.classList.add('hidden');
        } else throw new Error();
    } catch (e) {
        shortenLinkBtn.innerHTML = "❌ Failed. Network Error.";
        setTimeout(() => shortenLinkBtn.innerHTML = "Shorten Link (For WhatsApp)", 3000);
    }
});

function setupP2PTransfer() {
    if (currentPeer) { currentPeer.destroy(); currentPeer = null; }
    const p2pId = 'sp-' + Math.random().toString(36).substring(2, 10);
    const shortUrl = `${window.location.origin}${window.location.pathname}#p2p=${p2pId}`;

    qrcodeDiv.innerHTML = `<div class="text-zinc-400 text-xs animate-pulse mb-2">Creating Secure Room...</div>`;

    try {
        currentPeer = new window.Peer(p2pId);
        currentPeer.on('open', () => {
            qrcodeDiv.innerHTML = "";
            new window.QRCode(qrcodeDiv, { text: shortUrl, width: 180, height: 180, colorDark: "#000000", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.L });
            const msg = document.createElement("div");
            msg.className = "text-[11px] text-blue-500 mt-2 text-center font-medium border-t border-zinc-100 pt-1 w-full flex flex-col";
            msg.innerHTML = `<span class="font-bold">LIVE P2P SYNC</span><span class="text-zinc-500 text-[9px]">Keep tab open while scanning</span>`;
            qrcodeDiv.appendChild(msg);
        });
        currentPeer.on('connection', (conn) => {
            conn.on('open', () => {
                qrcodeDiv.innerHTML = `<div class="text-green-500 font-bold text-sm mt-10">Transferred to Device!</div>`;
                conn.send({ text: editor.value });
                setTimeout(() => { if (currentPeer) currentPeer.destroy(); currentPeer = null; }, 2500);
            });
        });
    } catch (e) {}
}

function receiveP2P(p2pId) {
    editor.value = "// 📡 Connecting to PC...\n// Please wait."; handleInput();
    if (!window.Peer) return;
    const peer = new window.Peer();
    peer.on('open', () => {
        const conn = peer.connect(p2pId, { reliable: true });
        conn.on('data', (data) => {
            if (data && data.text) { editor.value = data.text; handleInput(); updateUrl(true, editor.value.split('\n').length); }
            setTimeout(() => peer.destroy(), 1000);
        });
    });
}

/* =========================================
   GENERIC EVENT BINDINGS
   ========================================= */
editor.addEventListener('scroll', handleScroll);
editor.addEventListener('input', handleInput);
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        if (document.queryCommandSupported && document.queryCommandSupported('insertText')) { document.execCommand('insertText', false, '    '); } 
        else { editor.setRangeText('    ', start, editor.selectionEnd, 'end'); handleInput(); }
    }
});

// Fixed Downloads (Applies .py, .java, .js etc)
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const text = editor.value;
        if (!text.trim()) return;
        
        const extMap = { python: 'py', java: 'java', javascript: 'js', cpp: 'cpp', html: 'html', css: 'css', text: 'txt' };
        const extension = extMap[detectLanguage(text)] || 'txt';
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SharePaste.${extension}`; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

if (sendBtn) sendBtn.addEventListener('click', openShareMenu);

if (closeShare) closeShare.addEventListener('click', () => { shareModal.classList.add('hidden'); if(currentPeer) currentPeer.destroy(); });
if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) { shareModal.classList.add('hidden'); if(currentPeer) currentPeer.destroy(); }});
if (modalCopyBtn) modalCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrlInput.value).then(() => {
        modalCopyBtn.innerText = "Copied!"; modalCopyBtn.classList.add("text-green-400");
        setTimeout(() => { modalCopyBtn.innerText = "Copy"; modalCopyBtn.classList.remove("text-green-400"); }, 2000);
    });
});

const aboutBtn = document.getElementById('about-btn'), aboutModal = document.getElementById('about-modal'), closeAbout = document.getElementById('close-about');
if (aboutBtn) aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
if (closeAbout) closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
if (aboutModal) aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });

// Restored Snow Logic
const snowBtn = document.getElementById('snow-btn');
const snowText = document.getElementById('snow-text');
const snowContainer = document.getElementById('snow-container');
let snowInterval = null;

if (snowBtn) {
    snowBtn.addEventListener('click', () => {
        if (snowInterval) {
            clearInterval(snowInterval); snowInterval = null;
            if(snowText) snowText.innerText = "Snow";
            snowBtn.classList.remove("text-white");
            snowBtn.classList.add("text-zinc-400");
        } else {
            snowInterval = setInterval(() => {
                const s = document.createElement('div');
                s.innerText = '❅'; s.classList.add('snowflake');
                s.style.left = Math.random() * 100 + 'vw';
                s.style.fontSize = (Math.random() * 10 + 10) + 'px';
                s.style.opacity = Math.random() * 0.5 + 0.1;
                s.style.animationDuration = (Math.random() * 3 + 3) + 's';
                snowContainer.appendChild(s);
                setTimeout(() => s.remove(), 4000);
            }, 100);
            if(snowText) snowText.innerText = "Stop";
            snowBtn.classList.add("text-white");
            snowBtn.classList.remove("text-zinc-400");
        }
    });
}

main();