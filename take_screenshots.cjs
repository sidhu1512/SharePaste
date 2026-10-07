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

    // 1. The clean editor with some beautiful code snippet
    await page.goto(
      'http://localhost:8000/app.html#lzYtMwGzYjM9XGhlbGxvIHdvcmxkXG5cbmZ1bmN0aW9uIGdyZWV0KCkge1xuICBjb25zb2xlLmxvZygnSGVsbG8sIFNoYXJlUGFzdGUnKTtcbn1cblxuZ3JlZXQoKTs=',
      { waitUntil: 'networkidle0' }
    );
    await delay(1000);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/overview.png') });

    // 2. The QR popup on a short snippet
    // We need to click the QR share button
    await page.evaluate(() => {
      document.querySelector('.action-btn.share')?.click();
    });
    await delay(500);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/qr_code.png') });

    // Close modal
    await page.evaluate(() => {
      document.querySelector('.modal-close')?.click();
    });
    await delay(500);

    // 3. The inline copy feedback (Copied! tooltip)
    await page.evaluate(() => {
      document.querySelector('.action-btn.copy')?.click();
    });
    await delay(200);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/inline_copy.png') });

    // 4. The toolbar expanded
    // Assuming there is a toggle for the toolbar, but let's just make sure it's visible.
    await page.evaluate(() => {
      const el = document.querySelector('.toolbar-toggle');
      if (el) el.click();
    });
    await delay(500);
    await page.screenshot({ path: path.join(__dirname, 'docs/screenshots/toolbar_expanded.png') });

    // 5. The about modal
    await page.evaluate(() => {
      document.querySelector('.action-btn.about')?.click();
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
