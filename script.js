/*
 * SharePaste - Core Logic
 * Description: Serverless text sharing with Zstandard compression and smart performance limits.
 * Author: Siddharth Bhadu
 */

import { init, compress, decompress } from './zstd.js';

/* =========================================
   1. CONFIGURATION & LIMITS
   ========================================= */
const MAX_LINES = 5000;          // Hard Limit: Truncates text to prevent browser freeze
const URL_WARN_LIMIT = 50000;    // Soft Limit: Visual Red Warning only
const HIGHLIGHT_LIMIT = 800;     // Disable syntax highlighting above this line count for speed
const TINY_URL_LIMIT = 18000;    // Max characters allowed for TinyURL generation

/* =========================================
   2. DOM ELEMENTS
   ========================================= */
const editor = document.getElementById('editor');
const codeContent = document.getElementById('code-content');
const highlighting = document.getElementById('highlighting');
const stats = document.getElementById('stats');
const lineNumbers = document.getElementById('line-numbers');

const sendBtn = document.getElementById('send-btn');
const downloadBtn = document.getElementById('download-btn');
const aboutBtn = document.getElementById('about-btn');
const lockBtn = document.getElementById('lock-btn');
const lockIcon = document.getElementById('lock-icon');
let isLocked = false;

const shareModal = document.getElementById('share-modal');
const closeShare = document.getElementById('close-share');
const qrcodeDiv = document.getElementById('qrcode');
const qrWrapper = qrcodeDiv ? qrcodeDiv.parentElement : null; 
const shareUrlInput = document.getElementById('share-url');
const modalCopyBtn = document.getElementById('modal-copy-btn');

const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

const snowBtn = document.getElementById('snow-btn');
const snowText = document.getElementById('snow-text');
const snowContainer = document.getElementById('snow-container');
let snowInterval = null;

let debounceTimer; 

/* =========================================
   3. INITIALIZATION
   ========================================= */
async function main() {
    try {
        await init('./zstd.wasm');
        console.log("WASM Loaded");
    } catch (e) {
        console.error("WASM Load Issue:", e);
    }
    // If URL has hash data, decode it immediately on load
    if (window.location.hash.length > 1) decodeUrl();
}

/* =========================================
   4. PERFORMANCE HANDLERS
   ========================================= */

function handleScroll() {
    highlighting.scrollTop = editor.scrollTop;
    highlighting.scrollLeft = editor.scrollLeft;
    if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
}

function handleInput() {
    let text = editor.value;
    
    // --- 1. FAST LINE COUNTING & TRUNCATION ---
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
        text = text.substring(0, limitIndex);
        editor.value = text;
        lineCount = MAX_LINES; 
    }

    // --- 2. HTML ESCAPE ---
    let safeText = text.replace(/&/g, "&amp;")
                       .replace(/</g, "&lt;")
                       .replace(/>/g, "&gt;")
                       .replace(/"/g, "&quot;")
                       .replace(/'/g, "&#039;");

    if (safeText[safeText.length - 1] === "\n") safeText += " "; 
    codeContent.innerHTML = safeText;

    // --- 3. UPDATE LINE NUMBERS ---
    if (lineNumbers) {
        if (lineNumbers.childElementCount !== lineCount) {
             lineNumbers.innerText = Array(lineCount).fill(0).map((_, i) => i + 1).join('\n');
        }
    }

    // --- 4. SMART HIGHLIGHTING ---
    if (lineCount > HIGHLIGHT_LIMIT) {
        codeContent.className = 'language-text'; 
    } else {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const lang = detectLanguage(text);
            codeContent.className = `language-${lang}`;
            Prism.highlightElement(codeContent); 
        }, 300);
    }

    // --- 5. UPDATE URL & STATS ---
    setTimeout(() => updateUrl(false, lineCount), 100);
}

function detectLanguage(code) {
    if (!code) return 'text';
    if (code.includes('def ') && code.includes('import ')) return 'python';
    if (code.includes('class ') && code.includes('public static void')) return 'java';
    if (code.includes('function') || code.includes('const ') || code.includes('=>')) return 'javascript';
    if (code.includes('#include') && code.includes('int main')) return 'cpp';
    if (code.includes('<html>') || code.includes('</div>')) return 'html';
    if (code.includes('body {') || code.includes('color:')) return 'css';
    return 'javascript';
}

/* =========================================
   5. CORE LOGIC (Compress/Decompress)
   ========================================= */
function updateUrl(saveToHistory = false, currentLines = 0) {
    const text = editor.value;
    
    if (!text) {
        if (saveToHistory) window.history.replaceState(null, null, ' ');
        stats.innerHTML = "0 LINES";
        return;
    }

    try {
        const buffer = new TextEncoder().encode(text);
        const compressed = compress(buffer, 10);
        const binaryString = Array.from(compressed, (byte) => String.fromCharCode(byte)).join('');
        const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        if (saveToHistory) window.history.replaceState(null, null, '#' + base64);
        
        const linkLen = window.location.origin.length + 2 + base64.length;
        
        const lineClass = currentLines >= MAX_LINES ? "text-red-500 font-bold animate-pulse" : "text-zinc-500";
        const urlClass = linkLen >= URL_WARN_LIMIT ? "text-red-500 font-bold animate-pulse" : "text-zinc-500";

        stats.innerHTML = `
            <span class="${lineClass}">${currentLines} LINES</span> 
            <span class="text-zinc-700 mx-1">|</span> 
            <span class="${urlClass}">${(linkLen/1000).toFixed(1)}k URL</span>
        `;

    } catch (e) {
        console.error("Compression Error", e);
    }
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
        
        handleInput(); 
        handleScroll();
    } catch (e) {
        editor.value = "// ERROR: Link data corrupted or failed to decode.";
        handleInput();
    }
}

/* =========================================
   6. UI UTILITIES (Smart QR Logic)
   ========================================= */
async function openShareMenu() {
    updateUrl(true, editor.value.split('\n').length); 
    const longUrl = window.location.href;
    const urlLength = longUrl.length;
    
    shareUrlInput.value = longUrl;
    modalCopyBtn.innerText = "Copy";
    modalCopyBtn.classList.remove("text-green-400");
    shareModal.classList.remove('hidden');

    qrcodeDiv.innerHTML = "";
    if (qrWrapper) qrWrapper.className = "p-2 bg-white rounded-lg";

    // CASE A: Small URL (Instant QR)
    if (urlLength <= 700) {
        new QRCode(qrcodeDiv, { 
            text: longUrl, width: 180, height: 180, 
            colorDark: "#000000", colorLight: "#ffffff", 
            correctLevel: QRCode.CorrectLevel.L 
        });
    } 
    
    // CASE B: Medium URL (Try Direct TinyURL)
    else if (urlLength <= TINY_URL_LIMIT) {
        qrcodeDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[180px] w-[180px] text-center">
                <div class="text-zinc-400 text-xs animate-pulse">Generating...</div>
            </div>
        `;
        
        const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
        
        try {
            const res = await fetch(apiUrl);
            
            if (res.ok) {
                const shortUrl = await res.text();
                qrcodeDiv.innerHTML = "";
                new QRCode(qrcodeDiv, { 
                    text: shortUrl, width: 180, height: 180, 
                    colorDark: "#000000", colorLight: "#ffffff", 
                    correctLevel: QRCode.CorrectLevel.L 
                });

                const msg = document.createElement("div");
                msg.className = "text-[10px] text-zinc-500 mt-2 text-center font-medium border-t border-zinc-100 pt-1";
                msg.innerText = "QR using TinyURL";
                qrcodeDiv.appendChild(msg);
                return;
            }
            throw new Error("Shortener API Error");
        } catch (e) {
            showDarkMessage("Connection Failed", "TinyURL blocked request.");
        }
    } 
    
    // CASE C: Massive URL (Too Large for QR)
    else {
        showDarkMessage("URL is too dense for QR", "Use the link below");
    }
}

function showDarkMessage(title, subtitle) {
    if (qrWrapper) {
        qrWrapper.className = "flex flex-col items-center justify-center p-6 border border-dashed border-zinc-800 rounded-lg bg-transparent w-full h-[200px]";
    }
    qrcodeDiv.innerHTML = `
        <div class="text-center">
            <div class="text-zinc-300 font-medium text-sm mb-1">${title}</div>
            <div class="text-zinc-600 text-xs">${subtitle}</div>
        </div>
    `;
}

function downloadCode() {
    const blob = new Blob([editor.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SharePaste.txt`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function toggleLock() {
    isLocked = !isLocked;
    editor.readOnly = isLocked;
    
    if (isLocked) {
        // Locked
        lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'; 
        lockBtn.classList.add('text-red-400', 'opacity-100');
        lockBtn.classList.remove('text-zinc-400'); 
        editor.classList.add('cursor-not-allowed', 'opacity-80');
    } else {
        // Unlocked
        lockIcon.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';         
        lockBtn.classList.add('text-zinc-400'); 
        lockBtn.classList.remove('text-red-400', 'opacity-100');        
        editor.classList.remove('cursor-not-allowed', 'opacity-80');
    }
}

/* =========================================
   7. EVENT LISTENERS
   ========================================= */
editor.addEventListener('scroll', handleScroll);
editor.addEventListener('input', handleInput);
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
    }
});

if (sendBtn) sendBtn.addEventListener('click', openShareMenu);
if (downloadBtn) downloadBtn.addEventListener('click', downloadCode);
if (lockBtn) lockBtn.addEventListener('click', toggleLock);

// Snow Effect Logic
if (snowBtn) {
    snowBtn.addEventListener('click', () => {
        if (snowInterval) {
            clearInterval(snowInterval); snowInterval = null;
            if(snowText) snowText.innerText = "Snow";
            snowBtn.classList.remove("text-white");
            snowBtn.classList.add("text-zinc-400"); // Updated to zinc-400
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

// Modal Closers
if (closeShare) closeShare.addEventListener('click', () => shareModal.classList.add('hidden'));
if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.add('hidden'); });

if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            modalCopyBtn.innerText = "Copied!";
            modalCopyBtn.classList.add("text-green-400");
            setTimeout(() => { modalCopyBtn.innerText = "Copy"; modalCopyBtn.classList.remove("text-green-400"); }, 2000);
        });
    });
}

if (aboutBtn) aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
if (closeAbout) closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
if (aboutModal) aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.add('hidden'); });

main();
