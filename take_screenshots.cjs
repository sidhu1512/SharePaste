const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(__dirname));

const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

const server = app.listen(8000, async () => {
  console.log('Server running on port 8000');
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('http://localhost:8000/app.html', { waitUntil: 'networkidle0' });
    await delay(500);

    // Inject code to trigger app logic
    await page.evaluate(() => {
      const editor = document.querySelector('#editor');
      editor.value = 'function greet() {\n  console.log("Hello, SharePaste!");\n}\n\ngreet();';
      editor.dispatchEvent(new Event('input'));
    });
    await delay(1500); // wait for prism

    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/overview.png') });

    // 2. The toolbar expanded
    await page.hover('#floating-toolbar');
    await delay(500);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/toolbar_expanded.png') });

    // 3. The QR popup on a short snippet
    await page.evaluate(() => {
      document.querySelector('#send-btn')?.click();
    });
    await delay(500);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/qr_popup.png') });

    // Close modal (use Escape key to close the QR modal)
    await page.keyboard.press('Escape');
    await delay(500);

    // 4. The inline copy feedback (Copied! tooltip)
    await page.evaluate(() => {
      document.querySelector('#tb-copy')?.click();
    });
    await delay(200);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/copy_feedback.png') });

    // 5. The about modal
    await page.evaluate(() => {
      document.querySelector('#about-btn')?.click();
    });
    await delay(500);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/about_modal.png') });

    await browser.close();
    console.log('Screenshots taken successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
    process.exit(0);
  }
});
