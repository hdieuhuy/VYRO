const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../extension');

async function setupPopup(platform = 'youtube', connected = true, pipMode = 'custom') {
  const elements = new Map();
  const handlers = {};
  const saved = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', disabled: true, checked: false, handlers: {},
      setAttribute() {},
      addEventListener(type, callback) { this.handlers[type] = callback; }
    });
    return elements.get(id);
  }
  vm.runInNewContext(['shortcut.js', 'popup.js'].map(name => fs.readFileSync(path.join(root, name), 'utf8')).join('\n'), {
    navigator: { platform: 'MacIntel' },
    document: {
      getElementById: element,
      addEventListener: (type, callback) => { handlers[type] = callback; }
    },
    chrome: { runtime: { getManifest: () => ({ version: '1.6.1' }) }, tabs: { query: async () => [{ id: 7 }], sendMessage: async () => {
      if (!connected) throw new Error('Content script not loaded');
      return { platform, pipMode };
    } }, commands: { getAll: async () => [{ name: 'skip-short', shortcut: 'Command+Shift+9' }] }, storage: { local: {
      get: async () => ({ enabled: true, enabledTikTok: false, enabledFacebook: false }),
      set: async settings => { saved.push(JSON.parse(JSON.stringify(settings))); }
    } } }
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const key = (code, modifiers = {}) => handlers.keydown({
    code, preventDefault() {}, stopImmediatePropagation() {}, ...modifiers
  });
  await flush();
  return { element, saved, key, flush };
}

test('popup records, persists, cancels and restores a custom shortcut', async () => {
  const { element, saved, key, flush } = await setupPopup();
  assert.equal(element('shortcut-value').textContent, '⌘ + /');
  assert.equal(element('record').disabled, false);
  element('record').handlers.click();
  key('KeyJ', { ctrlKey: true, shiftKey: true });
  await flush();
  assert.equal(saved.at(-1).shortcut.code, 'KeyJ');
  assert.equal(element('shortcut-value').textContent, 'Ctrl + Shift + J');
  element('record').handlers.click();
  key('Escape');
  assert.equal(saved.length, 1);
  assert.equal(element('shortcut-value').textContent, 'Ctrl + Shift + J');
  element('record').handlers.click();
  key('KeyX');
  assert.equal(saved.length, 1);
  assert.match(element('shortcut-status').textContent, /Giữ Ctrl/);
  key('Tab');
  element('reset-shortcut').handlers.click();
  await flush();
  assert.equal(saved.at(-1).shortcut.code, 'Slash');
  assert.equal(saved.at(-1).shortcut.metaKey, true);
  assert.equal(element('shortcut-value').textContent, '⌘ + /');
});

test('popup reports missing content script and shows loaded build version', async () => {
  const { element } = await setupPopup('tiktok', false);
  assert.match(element('build-version').textContent, /1\.6\.1/);
  assert.match(element('connection-status').textContent, /Chưa kết nối/);
  assert.match(element('connection-status').textContent, /tải lại tab/);
});


test('popup detects TikTok and saves its auto switch without changing YouTube', async () => {
  const { element, saved, flush } = await setupPopup('tiktok');
  assert.equal(element('platform').value, 'tiktok');
  assert.equal(element('enabled').checked, false);
  element('enabled').checked = true;
  await element('enabled').handlers.change();
  assert.deepEqual(saved.at(-1), { enabledTikTok: true });
  assert.match(element('status').textContent, /TikTok/);
  element('platform').value = 'youtube';
  element('platform').handlers.change();
  await flush();
  assert.equal(element('enabled').checked, true);
  element('enabled').checked = false;
  await element('enabled').handlers.change();
  assert.deepEqual(saved.at(-1), { enabled: false });
});

test('popup detects Facebook Reels and keeps its auto setting separate', async () => {
  const { element, saved, flush } = await setupPopup('facebook');
  assert.equal(element('platform').value, 'facebook');
  assert.equal(element('enabled').checked, false);
  element('enabled').checked = true;
  await element('enabled').handlers.change();
  assert.deepEqual(saved.at(-1), { enabledFacebook: true });
  assert.match(element('status').textContent, /Facebook Reels/);
  assert.match(element('status').textContent, /Reel được tài trợ luôn bật/);
  element('platform').value = 'tiktok'; element('platform').handlers.change(); await flush();
  element('enabled').checked = true; await element('enabled').handlers.change();
  assert.deepEqual(saved.at(-1), { enabledTikTok: true });
  element('platform').value = 'facebook'; element('platform').handlers.change(); await flush();
  assert.match(element('status').textContent, /Facebook Reels/);
});

test('popup explains native PiP on YouTube watch and keeps the auto setting scoped to Shorts', async () => {
  const { element } = await setupPopup('youtube', true, 'native-youtube');
  assert.match(element('connection-status').textContent, /PiP YouTube/);
  assert.match(element('connection-status').textContent, /gốc Chrome/);
  assert.match(element('status').textContent, /áp dụng cho Shorts/);
});
