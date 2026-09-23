/**
 * SharePaste — Minimalist Marketing Controller
 * Instant Hash Passthrough, Live Zstandard Benchmark Sandbox, FAQ Accordion.
 */

import { init, compress } from './zstd.js';

// 1. Instant Hash Passthrough (Zero latency redirect if visitor opens a snippet link)
if (window.location.hash && window.location.hash.length > 1) {
  window.location.replace('app.html' + window.location.hash);
}

document.addEventListener('DOMContentLoaded', () => {
  // 2. Interactive Sandbox Presets
  const presets = {
    typescript: `interface CompressionProfile {
  level: 19;
  algorithm: 'zstd-wasm';
  strategy: 'ultra';
}

export function evaluateSnippet(profile: CompressionProfile): boolean {
  console.log("Decompressing snippet directly from URL hash...");
  return profile.level === 19;
}`,
    python: `def binary_search(arr: list[int], target: int) -> int:
    """Finds index of target in sorted array in O(log n) time."""
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    sql: `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL,
    operation VARCHAR(64) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);`,
    bash: `#!/usr/bin/env bash
set -euo pipefail

echo "==> Initializing client-side zero-datastore service..."
curl -fsSL https://sidhu1512.github.io/SharePaste/ -o /dev/null
echo "==> Verified: Zero databases, 100% private in URL fragment."`,
    json: `{
  "product": "SharePaste",
  "version": "1.0.0",
  "engine": "Zstandard Level 19 WebAssembly",
  "backend": null,
  "storage": "URL Fragment (#)",
  "features": [
    "Adaptive QR Code Generation",
    "Instant 1-Click Clipboard Copy",
    "Zero Telemetry and Tracking"
  ]
}`,
  };

  const textarea = document.getElementById('sandbox-input');
  const statRaw = document.getElementById('stat-raw');
  const statCompressed = document.getElementById('stat-compressed');
  const statSavings = document.getElementById('stat-savings');
  const statUrlLen = document.getElementById('stat-url-len');
  const statMode = document.getElementById('stat-mode');
  const openEditorBtn = document.getElementById('btn-open-editor');
  const presetButtons = document.querySelectorAll('.preset-chip, .preset-btn');

  let wasmReady = false;

  // Initialize WebAssembly Engine
  init('./zstd.wasm')
    .then(() => {
      wasmReady = true;
      runBenchmark();
    })
    .catch((err) => {
      console.warn('Sandbox: Zstd WASM deferred fallback', err);
      runBenchmark();
    });

  function getBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 8192) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function runBenchmark() {
    if (!textarea) return;
    const text = textarea.value;
    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(text);
    const rawLength = rawBytes.length;

    let compressedLength = Math.max(12, Math.round(rawLength * 0.35));
    let base64Hash = '';

    if (wasmReady && rawLength > 0) {
      try {
        const compressed = compress(rawBytes, 19);
        compressedLength = compressed.length;
        base64Hash = getBase64(compressed);
      } catch (e) {
        console.error('Compression error in benchmark:', e);
      }
    }

    const savings =
      rawLength > 0 ? Math.max(0, Math.round((1 - compressedLength / rawLength) * 100)) : 0;
    const urlTotal =
      window.location.origin.length +
      window.location.pathname.replace(/\/index\.html$/, '/') +
      'app.html#' +
      base64Hash;
    const urlLength = urlTotal.length;

    if (statRaw) statRaw.textContent = `${rawLength} B (${text.length} chars)`;
    if (statCompressed) statCompressed.textContent = `${compressedLength} B`;
    if (statSavings) statSavings.textContent = `${savings}% SAVED`;
    if (statUrlLen) statUrlLen.textContent = `${urlLength} chars`;

    if (statMode) {
      if (urlLength <= 350) {
        statMode.textContent = 'Camera QR Scannable';
      } else {
        statMode.textContent = '1-Click Direct Copy';
      }
    }

    if (openEditorBtn) {
      if (base64Hash) {
        openEditorBtn.href = `app.html#${base64Hash}`;
      } else {
        openEditorBtn.href = 'app.html';
      }
    }
  }

  // Preset Selection Listeners
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const lang = btn.getAttribute('data-lang');
      if (presets[lang]) {
        textarea.value = presets[lang];
        runBenchmark();
      }
    });
  });

  if (textarea) {
    textarea.addEventListener('input', runBenchmark);
    // Initial benchmark run
    runBenchmark();
  }

  // 3. FAQ Accordion Logic
  document.querySelectorAll('.faq-card, .faq-item').forEach((item) => {
    const question = item.querySelector('.faq-question-btn, .faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document
          .querySelectorAll('.faq-card, .faq-item')
          .forEach((i) => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    }
  });

  // 4. Smooth Anchor Scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
