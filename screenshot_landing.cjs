const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0' });

  // Make all scroll-reveal elements visible
  await page.evaluate(() => {
    document.querySelectorAll('.scroll-reveal').forEach((el) => el.classList.add('visible'));
  });

  await new Promise((r) => setTimeout(r, 600));

  // Get true full content height
  const bodyHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width: 1440, height: bodyHeight, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({
    path: path.join(__dirname, 'landing_page_screenshot.png'),
    fullPage: false,
  });
  await browser.close();
  console.log('Landing page full screenshot taken successfully at height:', bodyHeight);
  process.exit(0);
})();
