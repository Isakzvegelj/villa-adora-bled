// Dependency-free Chromium/CDP smoke test. Localhost server lives only during this command.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, '../review');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
});
let browser;
const pending = new Map();
let id = 0;
let buffer = '';
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const number = ++id;
    const timer = setTimeout(() => { pending.delete(number); reject(new Error('CDP timeout: ' + method)); }, 20000);
    pending.set(number, { resolve, reject, timer });
    browser.stdio[3].write(JSON.stringify({ id: number, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = spawn('chromium', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  browser.stdio[4].on('data', chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf('\0')) >= 0) {
      const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!raw) continue;
      const message = JSON.parse(raw);
      const entry = pending.get(message.id);
      if (!entry) continue;
      pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
    }
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, sessionId);
  for (const [label, width, height] of [['mobile', 390, 844], ['compact', 1024, 900], ['desktop', 1440, 1000]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: label === 'mobile' });
    await cdp('Page.navigate', { url });
    const ready = await cdp('Runtime.evaluate', { expression: "new Promise(resolve => { const check = () => document.readyState === 'complete' ? resolve(true) : setTimeout(check, 100); check(); })", awaitPromise: true, returnByValue: true });
    assert.equal(ready.result.value, true);
    if (label === 'mobile') {
      await cdp('Runtime.evaluate', { expression: "document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); new Promise(resolve => setTimeout(resolve, 300))", awaitPromise: true });
      const menu = await cdp('Runtime.evaluate', { expression: `(() => { const toggle = document.getElementById('navToggle'); const links = document.getElementById('navLinks'); const closed = getComputedStyle(links).visibility; toggle.click(); const opened = toggle.getAttribute('aria-expanded'); document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); return JSON.stringify({closed, opened, afterEscape:toggle.getAttribute('aria-expanded'), heroCTA:getComputedStyle(document.querySelector('.mobile-book')).display}); })()`, returnByValue: true });
      const menuState = JSON.parse(menu.result.value);
      assert.equal(menuState.closed, 'hidden');
      assert.equal(menuState.opened, 'true');
      assert.equal(menuState.afterEscape, 'false');
      assert.equal(menuState.heroCTA, 'block');
    }
    await cdp('Runtime.evaluate', { expression: "document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('book').scrollIntoView(); new Promise(resolve => setTimeout(resolve, 1200))", awaitPromise: true });
    const result = await cdp('Runtime.evaluate', { expression: `JSON.stringify({width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bookingFrames: document.querySelectorAll('.book-widget iframe').length, title: document.getElementById('booking-title').getBoundingClientRect().top, mobileCTA: getComputedStyle(document.querySelector('.mobile-book')).display, loadedImages: Array.from(document.images).filter(i => i.loading !== 'lazy').every(i => i.complete && i.naturalWidth > 0)})`, returnByValue: true });
    const state = JSON.parse(result.result.value);
    assert(state.scrollWidth <= state.width + 1, label + ' horizontal overflow');
    assert.equal(state.bookingFrames, 1);
    assert(state.title >= 0 && state.title < height, label + ' booking title not visible');
    assert.equal(state.mobileCTA, 'none', 'Sticky link should not cover the booking form');
    assert(state.loadedImages, label + ' hero not loaded');
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(out, `booking-${label}-form.png`), Buffer.from(screenshot.data, 'base64'));
    for (const theme of ['light', 'dark']) {
      await cdp('Runtime.evaluate', { expression: `if (document.documentElement.getAttribute('data-theme') !== '${theme}') document.getElementById('themeToggle').click();` });
      const themeResult = await cdp('Runtime.evaluate', { expression: `JSON.stringify({theme:document.documentElement.getAttribute('data-theme'), checked:document.getElementById('themeToggle').getAttribute('aria-checked'), saved:localStorage.getItem('adora-theme'), background:getComputedStyle(document.body).backgroundColor, imageFilter:getComputedStyle(document.querySelector('.hero-bg')).filter, iframeScheme:getComputedStyle(document.querySelector('.book-widget iframe')).colorScheme, switchWidth:document.getElementById('themeToggle').getBoundingClientRect().width})`, returnByValue: true });
      const themeState = JSON.parse(themeResult.result.value);
      assert.equal(themeState.theme, theme);
      assert.equal(themeState.checked, String(theme === 'dark'));
      assert.equal(themeState.imageFilter, 'none');
      assert.equal(themeState.iframeScheme, 'light');
      assert(themeState.switchWidth >= 44);
      if (theme === 'dark') {
        assert.equal(themeState.saved, 'dark');
        assert.equal(themeState.background, 'rgb(16, 29, 29)');
      }
      await cdp('Runtime.evaluate', { expression: "new Promise(resolve => setTimeout(resolve, 350))", awaitPromise: true });
      const themedShot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `booking-${label}-${theme}.png`), Buffer.from(themedShot.data, 'base64'));
      await cdp('Runtime.evaluate', { expression: "document.getElementById('new-photos').scrollIntoView(); Promise.all(Array.from(document.querySelectorAll('.photo-story-grid img')).map(image => { image.loading = 'eager'; return image.decode(); }))", awaitPromise: true });
      const photos = await cdp('Runtime.evaluate', { expression: "JSON.stringify({count:document.querySelectorAll('.photo-story-grid img').length, loaded:Array.from(document.querySelectorAll('.photo-story-grid img')).every(i=>i.complete && i.naturalWidth>0), overflow:document.documentElement.scrollWidth>innerWidth, tour:document.querySelector('.tour-link-panel a').href, navRight:document.getElementById('navLinks').getBoundingClientRect().right, toggleLeft:document.getElementById('themeToggle').getBoundingClientRect().left})", returnByValue: true });
      const photoState = JSON.parse(photos.result.value);
      assert.equal(photoState.count, 3);
      assert(photoState.loaded, 'All new images load');
      assert.equal(photoState.overflow, false);
      assert.equal(photoState.tour, 'https://momento360.com/e/uc/62a1edc6e44e402f8b51e489626fbe62');
      if (width > 980) assert(photoState.navRight < photoState.toggleLeft, 'Navigation and theme switch must not overlap');
      const photoShot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(out, `photos-${label}-${theme}.png`), Buffer.from(photoShot.data, 'base64'));
      await cdp('Runtime.evaluate', { expression: "document.getElementById('book').scrollIntoView(); new Promise(resolve => setTimeout(resolve, 200))", awaitPromise: true });
      console.log('PASS', label, theme, JSON.stringify(themeState), 'new photos loaded and clean tour link');
    }
    await cdp('Page.navigate', { url });
    await cdp('Runtime.evaluate', { expression: "new Promise(resolve => { const check = () => document.readyState === 'complete' ? resolve(true) : setTimeout(check, 100); check(); })", awaitPromise: true });
    const persisted = await cdp('Runtime.evaluate', { expression: "document.documentElement.getAttribute('data-theme')", returnByValue: true });
    assert.equal(persisted.result.value, 'dark', 'Theme survives reload');
    console.log('PASS', label, JSON.stringify(state), 'and theme persistence');
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (browser) browser.kill();
  server.close();
  for (const entry of pending.values()) clearTimeout(entry.timer);
});
