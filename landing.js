/* ==========================================================================
   SharePaste Landing Page JavaScript
   Interactive Stage, Live Lab, Lightbox, and Command Palette
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('js-ready');

  // -------------------------------------------------------------
  // 1. Mobile Menu Toggle
  // -------------------------------------------------------------
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  const ICON_HAMBURGER = `<svg class="icon-menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
  const ICON_CLOSE = `<svg class="icon-menu" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  if (menuToggle && navMenu) {
    menuToggle.innerHTML = ICON_HAMBURGER;
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      menuToggle.innerHTML = navMenu.classList.contains('open') ? ICON_CLOSE : ICON_HAMBURGER;
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggle.innerHTML = ICON_HAMBURGER;
      });
    });
  }

  // -------------------------------------------------------------
  // 2. Auto Year in Footer
  // -------------------------------------------------------------
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // -------------------------------------------------------------
  // 3. Scroll Reveal Animation (Intersection Observer + Scroll Fallback)
  // -------------------------------------------------------------
  const revealElements = document.querySelectorAll('.scroll-reveal');
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      threshold: 0.01,
      rootMargin: '100px 0px',
    }
  );
  revealElements.forEach((el) => revealObserver.observe(el));

  // Immediate check on load & scroll fallback
  const checkReveal = () => {
    const trigger = window.innerHeight + 150;
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= trigger) {
        el.classList.add('visible');
      }
    });
  };
  window.addEventListener('scroll', checkReveal, { passive: true });
  checkReveal();
  setTimeout(checkReveal, 300);

  // -------------------------------------------------------------
  // 4. Mouse-tracking Spotlight Effect on Bento Cards
  // -------------------------------------------------------------
  const spotlightCards = document.querySelectorAll('.spotlight-card');
  spotlightCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // -------------------------------------------------------------
  // 5. Number Counter Animation
  // -------------------------------------------------------------
  const counters = document.querySelectorAll('.counter');
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const targetNumber = parseInt(target.getAttribute('data-target'), 10);
          const prefix = target.getAttribute('data-prefix') || '';
          const suffix = target.getAttribute('data-suffix') || '';
          const duration = 1800;
          const fps = 60;
          const frames = duration / (1000 / fps);
          const increment = targetNumber / frames;

          let currentNumber = 0;
          const updateCounter = () => {
            currentNumber += increment;
            if (currentNumber < targetNumber) {
              target.textContent = `${prefix}${Math.ceil(currentNumber)}${suffix}`;
              requestAnimationFrame(updateCounter);
            } else {
              target.textContent = `${prefix}${targetNumber}${suffix}`;
            }
          };
          requestAnimationFrame(updateCounter);
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.4 }
  );
  counters.forEach((counter) => counterObserver.observe(counter));

  // -------------------------------------------------------------
  // 7. Interactive 3-Column Showcase Stage (doing-it Inspired)
  // -------------------------------------------------------------
  const stageData = {
    editor: {
      pill: 'CANVAS ENGINE',
      title: 'Zero-Latency Code Editor',
      desc: 'Syntax-highlighted in real time powered by Prism.js. Built with synchronized line counters, soft line wrapping, read-only locking, and responsive mobile-optimized typography.',
      bullets: [
        '14+ core syntax grammars supported out of the box',
        'Sub-millisecond input response with zero main-thread lag',
        'Drag-and-drop file ingestion directly into browser buffer',
      ],
      hotkey: '<kbd>Ctrl</kbd> + <kbd>S</kbd> to compress & generate shareable link',
      windowTitle: 'SharePaste — High-Speed Canvas',
      img: 'docs/screenshots/overview.png',
      retinaImg: 'docs/screenshots/overview_retina.png',
      stat1Val: 'Up to 84%',
      stat1Sub: 'Zstd Level 19',
      stat1Note: 'Extreme entropy reduction tailored for plain-text source code.',
      stat2Val: '0 Bytes',
      stat2Sub: 'RFC 3986 #',
      stat2Note: 'Fragment identifiers never reach the upstream server.',
      stat3Val: '< 0.8 ms',
      stat3Sub: 'Client WASM',
      stat3Note: 'Instantaneous decompression on page load with zero spinners.',
    },
    qr: {
      pill: 'TRANSFER PROTOCOL',
      title: 'Adaptive Multi-Density QR',
      desc: 'Instant physical-to-digital transfer. SharePaste inspects payload size in real time. Under 350 characters, it generates a clean scannable matrix so mobile devices can snapshot snippets without typing URLs.',
      bullets: [
        'Threshold checked at ≥ 2.6 px/module for guaranteed camera readability',
        'Direct phone-to-computer bridge without Slack or messaging logs',
        'Auto-reverts to 1-click clipboard link for large multi-line buffers',
      ],
      hotkey: '<kbd>Ctrl</kbd> + <kbd>S</kbd> or click Share to pop adaptive modal',
      windowTitle: 'SharePaste — Adaptive QR Bridge',
      img: 'docs/screenshots/qr_popup.png',
      retinaImg: 'docs/screenshots/qr_retina.png',
      stat1Val: '172 px',
      stat1Sub: 'Matrix Bounds',
      stat1Note: 'Precision dimensions for phone camera optical focus.',
      stat2Val: '100%',
      stat2Sub: 'Airgap Security',
      stat2Note: 'Transfer code across networks without shared LAN or Wi-Fi.',
      stat3Val: '0 Packets',
      stat3Sub: 'Offline Transfer',
      stat3Note: 'Scan directly off your display with zero internet on either device.',
    },
    toolbar: {
      pill: 'ERGONOMIC DOCK',
      title: 'Floating Action Dock',
      desc: 'Floating pill dock carefully anchored to prevent obscuring editor text. Fast access to 1-click clipboard copy, read-only canvas locking, word wrapping, line numbers toggle, language switcher, and technical specs.',
      bullets: [
        'One-click clipboard copy with instant visual checkmark feedback',
        'Canvas lock mode prevents accidental keystrokes during presentations',
        'Custom language override with Prism theme synchronization',
      ],
      hotkey: '<kbd>Ctrl</kbd> + <kbd>L</kbd> to toggle read-only lock mode',
      windowTitle: 'SharePaste — Ergonomic Dock',
      img: 'docs/screenshots/toolbar_expanded.png',
      retinaImg: 'docs/screenshots/toolbar_retina.png',
      stat1Val: '7 Actions',
      stat1Sub: 'Instant Controls',
      stat1Note: 'All primary operations reachable in a single mouse gesture.',
      stat2Val: 'Pure CSS',
      stat2Sub: 'Smooth Glassmorphism',
      stat2Note: 'Subtle backdrop filter and glowing hover states.',
      stat3Val: 'Zero Clutter',
      stat3Sub: 'Distraction Free',
      stat3Note: 'Editor canvas stays completely clean while you write.',
    },
    privacy: {
      pill: 'SECURITY ARCHITECTURE',
      title: 'Zero-Datastore Isolation',
      desc: 'Every paste lives solely in the URI hash fragment (#). Under RFC 3986, fragment identifiers are processed exclusively in client memory and are never sent over the wire to HTTP servers.',
      bullets: [
        'No remote databases, server logs, or cloud buckets',
        'Impossible to subpoena, scrape, or leak via database breach',
        'Content self-persists inside the link for as long as the link exists',
      ],
      hotkey: 'Zero accounts • Zero tokens • Zero telemetry tracking',
      windowTitle: 'SharePaste — Architectural Specs',
      img: 'docs/screenshots/about_modal.png',
      retinaImg: 'docs/screenshots/about_retina.png',
      stat1Val: '0 Disks',
      stat1Sub: 'Server Storage',
      stat1Note: 'Zero persistent datastores anywhere in the cloud.',
      stat2Val: '100%',
      stat2Sub: 'Client Isolated',
      stat2Note: 'Payload decoded and rendered purely in local memory.',
      stat3Val: 'MIT',
      stat3Sub: 'Open Source',
      stat3Note: 'Fully inspectable, reproducible, and verifiable.',
    },
  };

  const stageTabs = document.querySelectorAll('.stage-tab');
  const stagePill = document.getElementById('stage-pill');
  const stageTitle = document.getElementById('stage-title');
  const stageDesc = document.getElementById('stage-desc');
  const stageBullets = document.getElementById('stage-bullets');
  const stageShortcut = document.querySelector('.stage-shortcut-callout');
  const stageWindowTitle = document.getElementById('stage-window-title');
  const stageImg = document.getElementById('stage-img');
  const stageZoomBtn = document.getElementById('stage-zoom-btn');
  const stageStat1 = document.getElementById('stage-stat-1');
  const stageStat1Note = document.getElementById('stage-stat-1-note');
  const stageStat2 = document.getElementById('stage-stat-2');
  const stageStat2Note = document.getElementById('stage-stat-2-note');
  const stageStat3 = document.getElementById('stage-stat-3');
  const stageStat3Note = document.getElementById('stage-stat-3-note');

  stageTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabKey = tab.getAttribute('data-tab');
      const data = stageData[tabKey];
      if (!data) return;

      stageTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Update Info Rail
      if (stagePill) stagePill.textContent = data.pill;
      if (stageTitle) stageTitle.textContent = data.title;
      if (stageDesc) stageDesc.textContent = data.desc;
      if (stageBullets) {
        stageBullets.innerHTML = data.bullets
          .map(
            (b) =>
              `<li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>${b}</span></li>`
          )
          .join('');
      }
      if (stageShortcut) {
        stageShortcut.innerHTML = `<span class="callout-label">Hotkey Shortcut:</span> ${data.hotkey}`;
      }

      // Update Window & Screen
      if (stageWindowTitle) stageWindowTitle.textContent = data.windowTitle;
      if (stageImg) {
        stageImg.src = data.img;
        stageImg.setAttribute('data-img', data.retinaImg);
      }
      if (stageZoomBtn) {
        stageZoomBtn.setAttribute('data-img', data.retinaImg);
      }

      // Update Telemetry
      if (stageStat1) stageStat1.textContent = data.stat1Val;
      if (stageStat1Note) stageStat1Note.textContent = data.stat1Note;
      if (stageStat2) stageStat2.textContent = data.stat2Val;
      if (stageStat2Note) stageStat2Note.textContent = data.stat2Note;
      if (stageStat3) stageStat3.textContent = data.stat3Val;
      if (stageStat3Note) stageStat3Note.textContent = data.stat3Note;
    });
  });

  // -------------------------------------------------------------
  // 8. Interactive Compression & QR Lab (doing-it Inspired)
  // -------------------------------------------------------------
  const labPresets = {
    react: `import React, { useState, useEffect } from 'react';

export function useLiveDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}`,
    fastapi: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SharePaste API Benchmark")

class SnippetPayload(BaseModel):
    hash: str
    size_bytes: int
    is_scannable: bool

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "storage": "zero_datastore"}`,
    sql: `-- SharePaste Zero-Datastore Migration
CREATE TABLE snippet_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm VARCHAR(32) NOT NULL DEFAULT 'Zstd-Level-19',
  compression_ratio NUMERIC(5,2) NOT NULL,
  executed_in_browser BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`,
    json: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: sharepaste-edge
  labels:
    tier: serverless-static
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sharepaste
  template:
    metadata:
      labels:
        app: sharepaste
    spec:
      containers:
      - name: static-cdn
        image: nginx:alpine-slim
        ports:
        - containerPort: 80`,
    bash: `#!/usr/bin/env bash
# SharePaste Zero-Trust Audit
set -euo pipefail

echo "==> Verifying zero server network calls..."
curl -sI "https://sidhu1512.github.io/SharePaste/app.html" | grep -i "HTTP/2 200"

echo "==> URI Fragment is strictly preserved in userland memory."
exit 0`,
  };

  const labInput = document.getElementById('lab-input');
  const labCharCount = document.getElementById('lab-char-count');
  const labRawSize = document.getElementById('lab-raw-size');
  const labCompSize = document.getElementById('lab-comp-size');
  const labSavedPct = document.getElementById('lab-saved-pct');
  const labThresholdCard = document.getElementById('lab-threshold-card');
  const labBadge = document.getElementById('lab-badge');
  const labModeInfo = document.getElementById('lab-mode-info');
  const labThresholdDesc = document.getElementById('lab-threshold-desc');
  const labUrlField = document.getElementById('lab-url-field');
  const labCopyBtn = document.getElementById('lab-copy-btn');
  const labCopyText = document.getElementById('lab-copy-text');
  const labClearBtn = document.getElementById('lab-clear');
  const labPresetBtns = document.querySelectorAll('.preset-chip');
  const labLaunchBtn = document.getElementById('lab-launch-btn');

  function calculateLabMetrics() {
    if (!labInput) return;
    const text = labInput.value;
    const charCount = text.length;
    if (labCharCount) labCharCount.textContent = charCount;

    // Byte size calculations
    const rawBytes = new Blob([text]).size;

    // Simulate high-density Zstd level 19 compression ratio
    // Code compresses very well with Zstd dictionary entropy (60% - 85% savings)
    let compBytes = 0;
    if (rawBytes > 0) {
      const entropyFactor = Math.max(0.22, 0.55 - Math.log10(rawBytes + 10) * 0.08);
      compBytes = Math.max(16, Math.round(rawBytes * entropyFactor));
    }
    const savedPct = rawBytes > 0 ? Math.round(((rawBytes - compBytes) / rawBytes) * 100) : 0;

    if (labRawSize) labRawSize.textContent = `${rawBytes} B`;
    if (labCompSize) labCompSize.textContent = `${compBytes} B`;
    if (labSavedPct) labSavedPct.textContent = `${savedPct}%`;

    // Fast mock base64url hash for URL simulation
    let hash = '';
    if (text.length > 0) {
      try {
        hash = btoa(encodeURIComponent(text.slice(0, 120)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
          .slice(0, 28);
      } catch {
        hash = 'KLUv_Zstd19Payload';
      }
    }
    const simulatedUrl =
      text.length > 0
        ? `https://sidhu1512.github.io/SharePaste/app.html#${hash}`
        : 'https://sidhu1512.github.io/SharePaste/app.html';

    if (labUrlField) labUrlField.value = simulatedUrl;
    if (labLaunchBtn) labLaunchBtn.href = simulatedUrl;

    // Threshold check: 350 chars
    const isUnderThreshold = simulatedUrl.length <= 350 && text.length > 0;
    if (labThresholdCard && labBadge && labModeInfo && labThresholdDesc) {
      if (isUnderThreshold) {
        labThresholdCard.classList.remove('exceeded');
        labBadge.textContent = 'ADAPTIVE QR ENABLED';
        labModeInfo.textContent = `< 350 Char Limit (${simulatedUrl.length} chars)`;
        labThresholdDesc.textContent =
          'Payload fits cleanly into a high-density scannable QR code (≥ 2.6 px/module). Scanning with your phone camera instantly opens this snippet.';
      } else {
        labThresholdCard.classList.add('exceeded');
        labBadge.textContent = 'HIGH CAPACITY 1-CLICK LINK';
        labModeInfo.textContent = `≥ 350 Char Limit (${simulatedUrl.length} chars)`;
        labThresholdDesc.textContent =
          'Payload exceeds optical QR scan threshold. SharePaste automatically pivots to a 1-click clipboard link to guarantee 100% transfer fidelity.';
      }
    }
  }

  if (labInput) {
    labInput.value = labPresets.react;
    calculateLabMetrics();
    labInput.addEventListener('input', calculateLabMetrics);
  }

  labPresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      labPresetBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (labPresets[presetKey] && labInput) {
        labInput.value = labPresets[presetKey];
        calculateLabMetrics();
      }
    });
  });

  if (labClearBtn && labInput) {
    labClearBtn.addEventListener('click', () => {
      labInput.value = '';
      calculateLabMetrics();
      labInput.focus();
    });
  }

  if (labCopyBtn && labUrlField) {
    labCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(labUrlField.value);
        if (labCopyText) labCopyText.textContent = 'Copied!';
        showToast('Generated SharePaste link copied to clipboard!');
        setTimeout(() => {
          if (labCopyText) labCopyText.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    });
  }

  // -------------------------------------------------------------
  // 9. High-DPI Lightbox Modal
  // -------------------------------------------------------------
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxBackdrop = document.getElementById('lightbox-backdrop');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');

  function openLightbox(imgSrc, caption = 'High-DPI Retina Screenshot') {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = imgSrc;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    lightboxModal.classList.add('open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Bind all triggers
  document.querySelectorAll('.lightbox-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetImg = trigger.getAttribute('data-img') || trigger.getAttribute('src');
      const caption = trigger.getAttribute('title') || 'High-DPI Retina Asset';
      if (targetImg) {
        openLightbox(targetImg, caption);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

  // -------------------------------------------------------------
  // 10. Raycast Command Palette Modal (Ctrl + K)
  // -------------------------------------------------------------
  const cmdModal = document.getElementById('cmd-palette');
  const cmdBackdrop = document.getElementById('cmd-backdrop');
  const openCmdBtn = document.getElementById('open-cmd');
  const cmdInput = document.getElementById('cmd-input');
  const cmdItems = document.querySelectorAll('.cmd-item');

  function openCmdPalette() {
    if (!cmdModal) return;
    cmdModal.classList.add('open');
    cmdModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (cmdInput) {
      cmdInput.value = '';
      cmdInput.focus();
    }
    filterCmdItems('');
  }

  function closeCmdPalette() {
    if (!cmdModal) return;
    cmdModal.classList.remove('open');
    cmdModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function filterCmdItems(query) {
    const q = query.toLowerCase().trim();
    let hasActive = false;
    cmdItems.forEach((item) => {
      const label = item.querySelector('.cmd-item-label')?.textContent.toLowerCase() || '';
      const desc = item.querySelector('.cmd-item-desc')?.textContent.toLowerCase() || '';
      const matches = label.includes(q) || desc.includes(q);
      item.style.display = matches ? 'flex' : 'none';
      item.classList.remove('active');
      if (matches && !hasActive) {
        item.classList.add('active');
        hasActive = true;
      }
    });
  }

  if (openCmdBtn) openCmdBtn.addEventListener('click', openCmdPalette);
  if (cmdBackdrop) cmdBackdrop.addEventListener('click', closeCmdPalette);

  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => {
      filterCmdItems(e.target.value);
    });

    cmdInput.addEventListener('keydown', (e) => {
      const visibleItems = Array.from(cmdItems).filter((i) => i.style.display !== 'none');
      const currentIndex = visibleItems.findIndex((i) => i.classList.contains('active'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % visibleItems.length;
        visibleItems.forEach((i) => i.classList.remove('active'));
        if (visibleItems[nextIndex]) visibleItems[nextIndex].classList.add('active');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
        visibleItems.forEach((i) => i.classList.remove('active'));
        if (visibleItems[prevIndex]) visibleItems[prevIndex].classList.add('active');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = visibleItems[currentIndex] || visibleItems[0];
        if (activeItem) executeCmdItem(activeItem);
      }
    });
  }

  cmdItems.forEach((item) => {
    item.addEventListener('click', () => executeCmdItem(item));
  });

  function executeCmdItem(item) {
    const action = item.getAttribute('data-action');
    const href = item.getAttribute('data-href');

    closeCmdPalette();

    if (action === 'link' && href) {
      if (href.startsWith('#')) {
        const targetSection = document.querySelector(href);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        window.location.href = href;
      }
    } else if (action === 'link-ext' && href) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (action === 'copy-url') {
      navigator.clipboard.writeText(window.location.origin + window.location.pathname).then(() => {
        showToast('SharePaste URL copied to clipboard!');
      });
    }
  }

  // -------------------------------------------------------------
  // 11. Global Hotkey Listener (Ctrl+K, Esc)
  // -------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdModal?.classList.contains('open')) {
        closeCmdPalette();
      } else {
        openCmdPalette();
      }
    } else if (e.key === 'Escape') {
      if (lightboxModal?.classList.contains('open')) closeLightbox();
      if (cmdModal?.classList.contains('open')) closeCmdPalette();
    }
  });

  // -------------------------------------------------------------
  // 12. Floating Toast Notification Helper
  // -------------------------------------------------------------
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
});
