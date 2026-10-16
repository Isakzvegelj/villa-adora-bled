const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');
function setup({ saved = null, dark = false, blocked = false } = {}) {
  const attrs = {}, toggleAttrs = {}, events = {}, mediaEvents = {}, toggleEvents = {};
  const writes = [];
  const toggle = { hidden: true, setAttribute: (key, value) => { toggleAttrs[key] = value; }, addEventListener: (name, callback) => { toggleEvents[name] = callback; } };
  const meta = {};
  vm.runInNewContext(code, {
    document: {
      documentElement: { setAttribute: (key, value) => { attrs[key] = value; }, getAttribute: key => attrs[key] },
      getElementById: () => toggle,
      querySelector: () => meta,
      addEventListener: (name, callback) => { events[name] = callback; }
    },
    window: { matchMedia: () => ({ matches: dark, addEventListener: (name, callback) => { mediaEvents[name] = callback; } }) },
    localStorage: {
      getItem: () => { if (blocked) throw Error('blocked'); return saved; },
      setItem: (key, value) => { if (blocked) throw Error('blocked'); writes.push([key, value]); }
    }
  });
  return { attrs, toggleAttrs, events, mediaEvents, toggleEvents, toggle, writes, meta };
}
let state = setup({ dark: true });
assert.equal(state.attrs['data-theme'], 'dark', 'System preference applied before DOMContentLoaded');
assert.equal(state.writes.length, 0, 'Automatic preference should not be saved');
state.events.DOMContentLoaded();
assert.equal(state.toggle.hidden, false);
assert.equal(state.toggleAttrs['aria-checked'], 'true');
state.mediaEvents.change({ matches: false });
assert.equal(state.attrs['data-theme'], 'light');
state.toggleEvents.click();
assert.equal(state.attrs['data-theme'], 'dark');
assert.deepEqual(state.writes[0], ['adora-theme', 'dark']);
state.mediaEvents.change({ matches: false });
assert.equal(state.attrs['data-theme'], 'dark', 'Manual choice overrides later OS changes');
state = setup({ saved: 'light', dark: true });
assert.equal(state.attrs['data-theme'], 'light', 'Saved theme overrides OS on reload');
state = setup({ saved: 'invalid', dark: true });
assert.equal(state.attrs['data-theme'], 'dark');
state = setup({ blocked: true });
state.events.DOMContentLoaded();
state.toggleEvents.click();
assert.equal(state.attrs['data-theme'], 'dark', 'Switch works with blocked storage');
assert.equal(state.meta.content, '#101d1d');
console.log('PASS: pre-paint system preference, saved override, manual persistence, live OS changes, switch semantics and blocked-storage fallback.');
