const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../extension');

test('popup records, persists, cancels and restores a custom shortcut', async () => {
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
    chrome: { commands: { getAll: async () => [{ name: 'skip-short', shortcut: 'Command+Shift+9' }] }, storage: { local: {
      get: async () => ({ enabled: true }),
      set: async settings => { saved.push(JSON.parse(JSON.stringify(settings))); }
    } } }
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const key = (code, modifiers = {}) => handlers.keydown({
    code, preventDefault() {}, stopImmediatePropagation() {}, ...modifiers
  });
  await flush();
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
