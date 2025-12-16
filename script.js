/*
 * SharePaste - Serverless Text Sharing
 * Core Logic: Handles text compression, URL updates, and UI synchronization.
 */

// Import Zstandard WASM (WebAssembly) for high-performance compression
import { init, compress, decompress } from 'https://esm.sh/@bokuweb/zstd-wasm';

// DOM Elements
const editor = document.getElementById('editor');
const codeContent = document.getElementById('code-content');
const highlighting = document.getElementById('highlighting');
const stats = document.getElementById('stats');
const copyBtn = document.getElementById('copy-btn');
const copyText = document.getElementById('copy-text');
const qrBtn = document.getElementById('qr-btn');
const qrModal = document.getElementById('qr-modal');
const closeQr = document.getElementById('close-qr');
const qrcodeDiv = document.getElementById('qrcode');
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

/**
 * Detects the programming language based on simple keywords.
 * Used to set the Prism.js class for highlighting.
 */
function detectLanguage(code) {
    if (!code) return 'text';
    if (code.includes('def ') && code.includes('import ')) return 'python';
    if (code.includes('class ') && code.includes('public static void')) return 'java';
    if (code.includes('function') || code.includes('const ') || code.includes('=>')) return 'javascript';
    if (code.includes('#include') && code.includes('int main')) return 'cpp';
    if (code.includes('<html>') || code.includes('</div>')) return 'html';
    if (code.includes('body {') || code.includes('color:')) return 'css';
    return 'javascript'; // Default fallback
}

/**
 * Synchronizes the transparent textarea with the colored code block.
 * Handles HTML escaping and scroll positioning.
 */
function syncEditor() {
    let text = editor.value;

    // Escape HTML characters to prevent rendering issues in the pre/code block
    let safeText = text.replace(/&/g, "&amp;")
                       .replace(/</g, "&lt;")
                       .replace(/>/g, "&gt;")
                       .replace(/"/g, "&quot;")
                       .replace(/'/g, "&#039;");

    // Sync scroll positions
    highlighting.scrollTop = editor.scrollTop;
    highlighting.scrollLeft = editor.scrollLeft;

    // Apply syntax highlighting
    const lang = detectLanguage(text);
    codeContent.className = `language-${lang}`;
    
    // Add trailing space for proper newline rendering
    if (safeText[safeText.length - 1] === "\n") safeText += " "; 
    
    codeContent.innerHTML = safeText;
    Prism.highlightElement(codeContent);
}

/**
 * Initialize the Zstandard WASM engine.
 * Check for existing hash in URL to load content.
 */
async function main() {
    try {
        await init('./zstd.wasm');
    } catch (e) {
        console.error("Engine Failed to Load", e);
    }
    
    // If user opens a link with data, decode it
    if (window.location.hash.length > 1) {
        decodeUrl();
    }
}

/**
 * Compresses text and updates the URL (optionally).
 * @param {boolean} saveToHistory - If true, updates the browser address bar.
 */
function updateUrl(saveToHistory = false) {
    const text = editor.value;
    syncEditor();

    if (!text) {
        if (saveToHistory) window.history.replaceState(null, null, ' ');
        stats.innerText = "0 CHARS";
        return;
    }

    // 1. Convert Text to Binary
    const buffer = new TextEncoder().encode(text);
    
    // 2. Compress using Zstandard (Level 10)
    const compressed = compress(buffer, 10);
    
    // 3. Convert Binary to Base64 String
    const binaryString = Array.from(compressed, (byte) => String.fromCharCode(byte)).join('');
    
    // 4. Make Base64 URL-Safe (+ -> -, / -> _)
    const base64 = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Only clutter the address bar if explicitly requested (e.g., clicking 'Generate Link')
    if (saveToHistory) {
        window.history.replaceState(null, null, '#' + base64);
    }

    // Calculate projected length for stats
    const projectedLength = window.location.origin.length + 2 + base64.length;
    stats.innerText = `${projectedLength} CHARS `;
}

/**
 * Decodes the URL hash back into text.
 * Reverse of updateUrl().
 */
function decodeUrl() {
    try {
        const hash = window.location.hash.slice(1);
        
        // Reverse URL-Safe Base64
        let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        
        // Base64 -> Binary
        const binaryString = atob(base64);
        const compressed = new Uint8Array(binaryString.length);
        for(let i=0; i<binaryString.length; i++) compressed[i] = binaryString.charCodeAt(i);
        
        // Decompress -> Text
        const text = new TextDecoder().decode(decompress(compressed));
        
        editor.value = text;
        syncEditor();
        stats.innerText = `${window.location.href.length} CHARS`;
    } catch (e) {
        editor.value = "// ERROR: Link data is corrupted or incomplete.";
        syncEditor();
    }
}

/**
 * Generates a QR Code for the current link.
 * Uses TinyURL API if the link is too long for standard QR scanners.
 */
async function showQR() {
    // Ensure URL is up to date in address bar
    updateUrl(true);
    
    qrcodeDiv.innerHTML = "";
    const longUrl = window.location.href;
    let targetUrl = longUrl;

    // Show loading state
    qrcodeDiv.innerHTML = `<div class="text-zinc-500 text-xs animate-pulse p-4">Optimizing QR...</div>`;
    qrModal.classList.remove('hidden');

    // If URL is massive (>300 chars), try to shorten it for better scanning
    if (longUrl.length > 300) {
        try {
            const tinyRes = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
            if (tinyRes.ok) {
                targetUrl = await tinyRes.text();
            }
        } catch (e) {
            console.warn("Shortener failed, falling back to long URL");
        }
    }

    // Generate QR
    qrcodeDiv.innerHTML = "";
    new QRCode(qrcodeDiv, {
        text: targetUrl,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
}

// --- EVENT LISTENERS ---

// Typing: Update editor visuals but NOT the URL (Clean Mode)
editor.addEventListener('input', () => updateUrl(false));

// Scrolling: Keep highlight layer in sync
editor.addEventListener('scroll', syncEditor);

// Tab Key Support: Insert spaces instead of changing focus
editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
    }
});

// QR Modal Interactions
qrBtn.addEventListener('click', showQR);
closeQr.addEventListener('click', () => qrModal.classList.add('hidden'));
qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) qrModal.classList.add('hidden');
});

// About Modal Interactions
if (aboutBtn) {
    aboutBtn.addEventListener('click', () => aboutModal.classList.remove('hidden'));
}
if (closeAbout) {
    closeAbout.addEventListener('click', () => aboutModal.classList.add('hidden'));
}
aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.classList.add('hidden');
});

// Copy / Generate Link Button
copyBtn.addEventListener('click', () => {
    // Force URL update before copying
    updateUrl(true);
    
    navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = copyText.innerText;
        
        // Visual Feedback
        copyText.innerText = "Copied";
        copyBtn.classList.add("text-white");
        copyBtn.classList.remove("text-zinc-400");
        
        setTimeout(() => {
            copyText.innerText = originalText;
            copyBtn.classList.remove("text-white");
            copyBtn.classList.add("text-zinc-400");
        }, 2000);
    });
});

// Start Application
main();
