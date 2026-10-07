const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(__dirname, 'landing_page_screenshot.png') });
  await browser.close();
  process.exit(0);
})();
