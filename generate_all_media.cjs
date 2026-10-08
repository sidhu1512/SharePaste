const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Starting media generation...');
  const screenshotsDir = path.join(__dirname, 'docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=2'],
  });

  try {
    // -------------------------------------------------------------
    // 1. High-DPI Desktop Screenshots & Video
    // -------------------------------------------------------------
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto('http://localhost:8080/app.html', { waitUntil: 'networkidle0' });
    await delay(600);

    // Code sample
    const sampleCode = `// SharePaste: Zero-datastore client-side code sharing
import { compress, decompress } from './zstd.js';

export async function createShareableHash(code: string): Promise<string> {
  const buffer = new TextEncoder().encode(code);
  const compressed = await compress(buffer, 19); // Maximum Zstd ratio
  return btoa(String.fromCharCode(...compressed))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');
}

// 100% Client-side. Zero bytes transmitted to server.
console.log("Status: Ready to share via URL fragment #");`;

    // Setup screen recording
    const videoPath = path.join(__dirname, 'docs/sharepaste-tour.webm');
    const videoStream = fs.createWriteStream(videoPath);
    const recording = page.createScreenRecording({ frameRate: 30 });
    recording.pipe(videoStream);
    await recording._start();
    console.log('Video recording active...');

    await delay(800);

    // Type the sample code smoothly
    await page.focus('#editor');
    await page.evaluate(() => {
      document.querySelector('#editor').value = '';
    });

    const lines = sampleCode.split('\n');
    for (const line of lines) {
      await page.type('#editor', line + '\n', { delay: 18 });
      await delay(40);
    }
    await delay(1000);

    // Screenshot 1: Overview
    await page.screenshot({
      path: path.join(screenshotsDir, 'overview_retina.png'),
      fullPage: false,
    });
    console.log('Saved overview_retina.png');

    // Hover over floating toolbar
    await page.hover('#floating-toolbar');
    await delay(800);

    // Screenshot 2: Toolbar Expanded
    await page.screenshot({
      path: path.join(screenshotsDir, 'toolbar_retina.png'),
      fullPage: false,
    });
    console.log('Saved toolbar_retina.png');

    // Click Send/Share button to trigger Adaptive QR
    await page.click('#send-btn');
    await delay(1200);

    // Screenshot 3: Adaptive QR Modal
    await page.screenshot({
      path: path.join(screenshotsDir, 'qr_retina.png'),
      fullPage: false,
    });
    console.log('Saved qr_retina.png');

    await delay(1500);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await delay(800);

    // Open About Modal
    await page.click('#about-btn');
    await delay(1200);

    // Screenshot 4: About Modal
    await page.screenshot({
      path: path.join(screenshotsDir, 'about_retina.png'),
      fullPage: false,
    });
    console.log('Saved about_retina.png');

    await delay(1200);
    await page.keyboard.press('Escape');
    await delay(800);

    // Stop video recording
    await recording.stop();
    console.log('Screen recording finished:', videoPath);

    // Copy retina screenshots over the old ones as well so all existing references get upgraded
    fs.copyFileSync(
      path.join(screenshotsDir, 'overview_retina.png'),
      path.join(screenshotsDir, 'overview.png')
    );
    fs.copyFileSync(
      path.join(screenshotsDir, 'toolbar_retina.png'),
      path.join(screenshotsDir, 'toolbar_expanded.png')
    );
    fs.copyFileSync(
      path.join(screenshotsDir, 'qr_retina.png'),
      path.join(screenshotsDir, 'qr_popup.png')
    );
    fs.copyFileSync(
      path.join(screenshotsDir, 'about_retina.png'),
      path.join(screenshotsDir, 'about_modal.png')
    );

    // -------------------------------------------------------------
    // 2. Mobile Viewport Screenshot (iPhone 14 / Pixel style)
    // -------------------------------------------------------------
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
    await mobilePage.goto('http://localhost:8080/app.html', { waitUntil: 'networkidle0' });
    await delay(600);

    await mobilePage.evaluate((code) => {
      const ed = document.querySelector('#editor');
      ed.value = code;
      ed.dispatchEvent(new Event('input'));
    }, sampleCode);
    await delay(800);

    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'mobile_retina.png'),
    });
    console.log('Saved mobile_retina.png');

    await mobilePage.click('#send-btn');
    await delay(800);
    await mobilePage.screenshot({
      path: path.join(screenshotsDir, 'mobile_qr_retina.png'),
    });
    console.log('Saved mobile_qr_retina.png');

    await browser.close();
    console.log('All high-DPI screenshots and recordings generated successfully!');
  } catch (err) {
    console.error('Error generating media:', err);
    await browser.close();
  }
}

main();
