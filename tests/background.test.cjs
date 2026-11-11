const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('toolbar icon restores saved state and changes color when toggled', async () => {
  let enabled = false, changed, installed, startup;
  const icons = [], titles = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/background.js'), 'utf8'), {
    console,
    chrome: {
      commands: { onCommand: { addListener() {} } },
      storage: {
        local: { get: async () => ({ enabled }) },
        onChanged: { addListener: fn => { changed = fn; } }
      },
      runtime: {
        onInstalled: { addListener: fn => { installed = fn; } },
        onStartup: { addListener: fn => { startup = fn; } }
      },
      action: {
        setIcon: async args => { icons.push(args.path); },
        setTitle: async args => { titles.push(args.title); }
      }
    }
  });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  await flush();
  assert.equal(icons.at(-1)[16], 'icons/off-16.png');
  assert.match(titles.at(-1), /Đã tắt/);
  enabled = true;
  changed({ enabled: { newValue: true } }, 'local');
  await flush();
  assert.equal(icons.at(-1)[32], 'icons/on-32.png');
  assert.match(titles.at(-1), /Đang bật/);
  enabled = false;
  startup();
  await flush();
  assert.equal(icons.at(-1)[16], 'icons/off-16.png');
  installed();
  await flush();
  assert.equal(icons.at(-1)[16], 'icons/off-16.png');
});

test('native skip targets PiP owner instead of the focused unrelated tab', async () => {
  let command;
  const sent = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/background.js'), 'utf8'), {
    console,
    chrome: {
      commands: { onCommand: { addListener: fn => { command = fn; } } },
      tabs: {
        query: async () => [{ id: 1 }, { id: 2 }, { id: 3 }],
        sendMessage: async (id, message) => {
          if (message.type === 'shorts-query-pip') {
            if (id === 1) throw new Error('No content script in unrelated tab');
            return { pip: id === 3 };
          }
          sent.push(id);
          return { ok: true };
        }
      },
      storage: {
        local: { get: async () => ({ enabled: false }) },
        onChanged: { addListener() {} }
      },
      runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} } },
      action: { setIcon: async () => {}, setTitle: async () => {} }
    }
  });
  command('skip-short', { id: 1 });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(sent, [3]);
});
