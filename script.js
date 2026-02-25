/*
 * SharePaste - Core Logic
 * Description: Serverless text sharing with Zstandard compression and WebRTC AirDrop Transfers.
 */

import { init, compress, decompress } from './zstd.js';

const MAX_LINES = 5000;          
const URL_WARN_LIMIT = 50000;    
const HIGHLIGHT_LIMIT = 800;     
const P2P_LIMIT = 2000; // Anything over this URL length triggers AirDrop mode instead of a dense QR

const editor = document.getElementById('editor');
const codeContent = document.getElementById('code-content');
const highlighting = document.getElementById('highlighting');
const stats = document.getElementById('stats');
const lineNumbers = document.getElementById('line-numbers');

const sendBtn = document.getElementById('send-btn');
const downloadBtn = document.getElementById('download-btn');
const lockBtn = document.getElementById('lock-btn');
const lockIcon = document.getElementById('lock-icon');

const shareModal = document.getElementById('share-modal');
const closeShare = document.getElementById('close-share');
const qrcodeDiv = document.getElementById('qrcode');
const qrWrapper = qrcodeDiv ? qrcodeDiv.parentElement : null; 
const shareUrlInput = document.getElementById('share-url');
const modalCopyBtn = document.getElementById('modal-copy-btn');

let isLocked = false;
let debounceTimer = null; 
let urlDebounceTimer = null; 
let currentRenderedLines = 0;
let currentPeer = null; // Holds the WebRTC host connection

async function main() {
    try {
        await init('./zstd.wasm');
    } catch (e) {
        console.error("WASM Load Issue:", e);
    }
    checkInitialHash();
}

function checkInitialHash() {
    const hash = window.location.hash;
    // Intercept if the phone is scanning a Live Sync QR
    if (hash.startsWith('#p2p=')) {
        receiveP2P(hash.split('=')[1]);
    } else if (hash.length > 1) {
        decodeUrl();
    }
}

window.addEventListener('hashchange', () => {
    checkInitialHash();
});

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
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        text = text.substring(0, limitIndex);
        editor.value = text;
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
        debounceTimer = setTimeout(() => {
            const lang = detectLanguage(text);
            codeContent.className = `language-${lang}`;
            if (window.Prism) Prism.highlightElement(codeContent); 
        }, 300);
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
    return 'javascript';
}

function updateUrl(saveToHistory = false, currentLines = 0) {
    const text = editor.value;
    if (!text) {
        if (saveToHistory) window.history.replaceState(null, null, ' ');
        stats.innerHTML = "0 LINES";
        return;
    }

    try {
        const buffer = new TextEncoder().encode(text);
        const compressed = compress(buffer, 4); 
        
        let binaryString = '';
        const chunkSize = 8192; 
        for (let i = 0; i < compressed.length; i += chunkSize) {
            binaryString += String.fromCharCode.apply(null, compressed.subarray(i, i + chunkSize));
        }
        
        const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        // Prevent massive base64 from crashing browser history limits
        if (saveToHistory && base64.length < URL_WARN_LIMIT) {
            window.history.replaceState(null, null, '#' + base64);
        }
        
        const linkLen = window.location.origin.length + 2 + base64.length;
        const lineClass = currentLines >= MAX_LINES ? "text-red-500 font-bold animate-pulse" : "text-zinc-500";
        const urlClass = linkLen >= P2P_LIMIT ? "text-blue-500 font-bold" : "text-zinc-500";

        stats.innerHTML = `<span class="${lineClass}">${currentLines} LINES</span><span class="text-zinc-700 mx-1">|</span><span class="${urlClass}">${(linkLen/1000).toFixed(1)}k URL</span>`;
    } catch (e) { console.error("Compression Error", e); }
}

function decodeUrl() {
    try {
        const hash = window.location.hash.slice(1);
        let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        
        const binaryString = atob(base64);
        const compressed = new Uint8Array(binaryString.length);
        for(let i=0; i<binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);
        
        const text = new TextDecoder().decode(decompress(compressed));
        editor.value = text;
        handleInput(); handleScroll();
    } catch (e) {
        editor.value = "// ERROR: Link data corrupted or failed to decode.";
        handleInput();
    }
}

/* =========================================
   NEW: P2P AIRDROP LOGIC
   ========================================= */
function openShareMenu() {
    updateUrl(true, editor.value.split('\n').length); 
    const longUrl = window.location.href;
    const urlLength = longUrl.length;
    
    // Always provide the permanent base64 URL in the text box for sharing via Discord/WhatsApp
    shareUrlInput.value = longUrl;
    modalCopyBtn.innerText = "Copy";
    modalCopyBtn.classList.remove("text-green-400");
    shareModal.classList.remove('hidden');

    qrcodeDiv.innerHTML = "";
    if (qrWrapper) qrWrapper.className = "p-2 bg-white rounded-lg flex flex-col justify-center items-center";

    // Standard Quick-Scan Mode (Direct to Domain, No redirect)
    if (urlLength <= P2P_LIMIT) {
        new window.QRCode(qrcodeDiv, { 
            text: longUrl, width: 180, height: 180, 
            colorDark: "#000000", colorLight: "#ffffff", 
            correctLevel: window.QRCode.CorrectLevel.L 
        });
        const msg = document.createElement("div");
        msg.className = "text-[10px] text-zinc-500 mt-2 text-center font-medium border-t border-zinc-100 pt-1 w-full";
        msg.innerText = "Scan to open on phone";
        qrcodeDiv.appendChild(msg);
    } 
    // Direct P2P Transfer (AirDrop) Mode
    else {
        setupP2PTransfer();
    }
}

function setupP2PTransfer() {
    if (currentPeer) { currentPeer.destroy(); currentPeer = null; }
    
    // Create a tiny temporary room ID
    const p2pId = 'sp-' + Math.random().toString(36).substring(2, 10);
    const shortUrl = `${window.location.origin}${window.location.pathname}#p2p=${p2pId}`;

    qrcodeDiv.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[180px] w-[180px] text-center">
            <div class="text-zinc-400 text-xs animate-pulse mb-2">Creating Secure Room...</div>
        </div>
    `;

    try {
        currentPeer = new window.Peer(p2pId);
        
        currentPeer.on('open', () => {
            qrcodeDiv.innerHTML = "";
            new window.QRCode(qrcodeDiv, { 
                text: shortUrl, width: 180, height: 180, 
                colorDark: "#000000", colorLight: "#ffffff", 
                correctLevel: window.QRCode.CorrectLevel.L 
            });
            
            const msg = document.createElement("div");
            msg.className = "text-[11px] text-blue-500 mt-2 text-center font-medium border-t border-zinc-100 pt-1 flex flex-col items-center w-full";
            msg.innerHTML = `<span class="font-bold tracking-wide">LIVE P2P SYNC</span><span class="text-zinc-500 text-[9px] mt-0.5">Keep tab open while scanning</span>`;
            qrcodeDiv.appendChild(msg);
        });

        currentPeer.on('connection', (conn) => {
            conn.on('open', () => {
                qrcodeDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-[180px] w-[180px] text-center">
                        <svg class="text-green-500 w-12 h-12 mb-2 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        <div class="text-zinc-500 text-xs font-medium">Transferred to Device!</div>
                    </div>
                `;
                
                // Blast the raw text directly to the phone via WebRTC
                conn.send({ text: editor.value });
                
                setTimeout(() => { 
                    if (currentPeer) { currentPeer.destroy(); currentPeer = null; }
                }, 2500);
            });
        });
        
    } catch (e) {
        qrcodeDiv.innerHTML = `<div class="text-red-500 text-xs text-center mt-6">P2P connection failed.<br>Copy the link instead.</div>`;
    }
}

// Function that runs when the phone scans the AirDrop QR Code
function receiveP2P(p2pId) {
    editor.value = "// ✨ Secure AirDrop Tunnel Active\n// 📡 Connecting to your PC...\n// Please wait.";
    handleInput();

    if (!window.Peer) {
        editor.value = "// ❌ Error: WebRTC library blocked by browser.";
        handleInput(); return;
    }

    const peer = new window.Peer();
    peer.on('open', () => {
        const conn = peer.connect(p2pId, { reliable: true });
        
        conn.on('open', () => {
            editor.value = "// 📡 Connected! Downloading payload from PC...";
            handleInput();
        });

        conn.on('data', (data) => {
            if (data && data.text) {
                editor.value = data.text;
                handleInput();
                // Forces the phone to generate its own Base64 URL so it saves permanently offline
                updateUrl(true, editor.value.split('\n').length); 
            }
            setTimeout(() => peer.destroy(), 1000);
        });
    });

    peer.on('error', (err) => {
        editor.value = `// ❌ Failed to connect to PC.\n// Ensure the "Share" modal is still open on your computer.\n// Refresh the page to try again.`;
        handleInput();
    });
}

function destroyPeer() {
    shareModal.classList.add('hidden');
    if (currentPeer) { currentPeer.destroy(); currentPeer = null; }
}

/* =========================================
   UTILITIES & EVENTS
   ========================================= */
function downloadCode() {
    const extMap = { python: 'py', java: 'java', javascript: 'js', cpp: 'cpp', html: 'html', css: 'css', text: 'txt' };
    const extension = extMap[detectLanguage(editor.value)] || 'txt';
    const blob = new Blob([editor.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SharePaste.${extension}`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); 
}

function toggleLock() {
    isLocked = !isLocked;
    editor.readOnly = isLocked;
    if (isLocked) {
        lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'; 
        lockBtn.classList.add('text-red-400', 'opacity-100');
        lockBtn.classList.remove('text-zinc-400'); 
        editor.classList.add('cursor-not-allowed', 'opacity-80');
    } else {
        lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';         
        lockBtn.classList.add('text-zinc-400'); 
        lockBtn.classList.remove('text-red-400', 'opacity-100');        
        editor.classList.remove('cursor-not-allowed', 'opacity-80');
    }
}

editor.addEventListener('scroll', handleScroll);
editor.addEventListener('input', handleInput);
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, '    ');
        } else {
            editor.setRangeText('    ', start, editor.selectionEnd, 'end');
            handleInput();
        }
    }
});

if (sendBtn) sendBtn.addEventListener('click', openShareMenu);
if (downloadBtn) downloadBtn.addEventListener('click', downloadCode);
if (lockBtn) lockBtn.addEventListener('click', toggleLock);
if (closeShare) closeShare.addEventListener('click', destroyPeer);
if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) destroyPeer(); });

if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            modalCopyBtn.innerText = "Copied!";
            modalCopyBtn.classList.add("text-green-400");
            setTimeout(() => { modalCopyBtn.innerText = "Copy"; modalCopyBtn.classList.remove("text-green-400"); }, 2000);
        });
    });
}

const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');
if (aboutBtn) aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
if (closeAbout) closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
if (aboutModal) aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });

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