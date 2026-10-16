const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const redirect = html.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const [protocol, hostname, shouldRedirect] of [
  ['http:', 'book.adorabled.com', true],
  ['https:', 'book.adorabled.com', false],
  ['http:', '127.0.0.1', false],
  ['http:', 'localhost', false]
]) {
  let actual;
  vm.runInNewContext(redirect, { location: {
    protocol, hostname, host: hostname, pathname: '/rooms', search: '?guests=2', hash: '#book',
    replace: url => { actual = url; }
  } });
  assert.equal(actual, shouldRedirect ? 'https://book.adorabled.com/rooms?guests=2#book' : undefined);
}
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
// Test the actual card-step function with desktop/mobile computed CSS gaps.
const body = js.match(/function cardStep\(\) \{([\s\S]*?)\n    \}/)[1];
for (const [width, gap, expected] of [[340, '26px', 366], [335, '16px', 351]]) {
  const result = vm.runInNewContext('(function () {' + body + '})()', {
    track: { children: [{ offsetWidth: width }] },
    window: { getComputedStyle: () => ({ columnGap: gap }) }
  });
  assert.equal(result, expected);
}
console.log('PASS: production HTTPS redirect preserves path/query/hash; HTTPS and local preview do not redirect; carousel uses desktop/mobile CSS gaps.');
