const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');
const shortcutSource = fs.readFileSync(path.join(__dirname, '../extension/shortcut.js'), 'utf8');
const tiktokSource = fs.readFileSync(path.join(__dirname, '../extension/tiktok.js'), 'utf8');

async function setup(platform = 'youtube') {
  let tick, change, message, clock = 2000, clicks = 0;
  const listeners = {};
  const written = [];
  let pipOptions;
  const rect = { left: 100, top: 0, right: 500, bottom: 700 };
  const renderer = { hasAttribute: () => true, querySelector: () => null, nextElementSibling: null };
  function video() {
    const handlers = {};
    return {
      loop: true, ended: false, paused: false, seeking: false,
      currentTime: 0, duration: 10, currentSrc: 'blob:one',
      getBoundingClientRect: () => rect,
      closest: selector => selector === 'ytd-reel-video-renderer' || selector.includes('article') ? renderer : null,
      addEventListener: (type, callback) => { handlers[type] = callback; },
      removeEventListener: type => { delete handlers[type]; },
      emit: type => handlers[type]?.()
    };
  }
  const first = video();
  const button = {
    getBoundingClientRect: () => rect,
    getAttribute: () => null,
    click: () => { clicks++; }
  };
  const doc = {
    hidden: false, videos: [first], buttons: [button], blockers: [],
    querySelectorAll: selector => selector === 'video' ? doc.videos : selector.includes('verify-page') ? doc.blockers : doc.buttons,
    addEventListener: (type, callback) => { listeners[type] = callback; }
  };
  const location = { hostname: platform === 'tiktok' ? 'www.tiktok.com' : 'www.youtube.com',
    pathname: platform === 'tiktok' ? '/@creator/video/123456789' : '/shorts/one' };
  vm.runInNewContext(tiktokSource + '\n' + shortcutSource + '\n' + source, {
    location, document: doc, innerWidth: 1200, innerHeight: 800,
    performance: { now: () => clock },
    navigator: { platform: 'MacIntel' },
    ShortsPip: { create: options => { pipOptions = options; return { update() {}, isOpen: () => false, video: () => null, renderer: () => null }; } },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', overflowY: 'auto' }),
    chrome: { runtime: { sendMessage: async () => {}, onMessage: { addListener: fn => { message = fn; } } }, storage: {
      local: { get: async () => ({ enabled: true, enabledTikTok: true }), set: async settings => {
        written.push(settings);
        change(Object.fromEntries(Object.entries(settings).map(([key, newValue]) => [key, { newValue }])), 'local');
      } },
      onChanged: { addListener: callback => { change = callback; } }
    } },
    setInterval: callback => { tick = callback; }
  });
  await Promise.resolve();
  return {
    first, video, doc, renderer, location,
    tick: () => tick(), advanceClock: ms => { clock += ms; },
    clicks: () => clicks,
    setEnabled: enabled => change({ [platform === 'tiktok' ? 'enabledTikTok' : 'enabled']: { newValue: enabled } }, 'local')
    , setShortcut: shortcut => change({ shortcut: { newValue: shortcut } }, 'local'),
    key: (overrides = {}) => {
      let prevented = false;
      const event = { code: 'Slash', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false,
        preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => {}, ...overrides };
      listeners.keydown(event);
      return prevented;
    },
    message: data => { let response; message(data, {}, value => { response = value; }); return response; },
    pipOptions: () => pipOptions, written,
    change: changes => change(changes, 'local')
  };
}

test('ending advances once, while pause/progress does not advance', async () => {
  const app = await setup();
  assert.equal(app.first.loop, true);
  app.first.currentTime = 5;
  app.first.paused = true;
  app.first.emit('timeupdate');
  app.tick();
  assert.equal(app.clicks(), 0);
  app.first.ended = true;
  app.first.emit('ended');
  app.tick();
  app.first.emit('ended');
  assert.equal(app.clicks(), 1);
});

test('disable stops navigation and leaves native looping untouched', async () => {
  const app = await setup();
  app.setEnabled(false);
  assert.equal(app.first.loop, true);
  app.first.emit('ended');
  assert.equal(app.clicks(), 0);
  app.location.pathname = '/watch';
  app.setEnabled(true);
  app.tick();
  assert.equal(app.first.loop, true);
  assert.equal(app.clicks(), 0);
});

test('manual navigation and reused player track the new Short', async () => {
  const app = await setup();
  app.first.emit('ended');
  app.advanceClock(2000);
  app.location.pathname = '/shorts/two';
  app.first.currentSrc = 'blob:two';
  app.tick();
  app.first.emit('ended');
  assert.equal(app.clicks(), 2);
});

test('hidden tabs and offscreen preloaded players cannot advance', async () => {
  const app = await setup();
  const hidden = app.video();
  hidden.getBoundingClientRect = () => ({ left: 0, right: 400, top: 900, bottom: 1600 });
  app.doc.videos.unshift(hidden);
  app.tick();
  hidden.emit('ended');
  assert.equal(app.clicks(), 0);
  app.doc.hidden = true;
  app.first.emit('ended');
  assert.equal(app.clicks(), 0);
  app.tick();
  assert.equal(app.first.loop, true);
});

test('loop fallback advances only on a playing end-to-start wrap', async () => {
  const app = await setup();
  app.first.currentTime = 9.9;
  app.first.emit('timeupdate');
  app.advanceClock(200);
  app.first.currentTime = 0.1;
  app.first.emit('timeupdate');
  assert.equal(app.clicks(), 1);
});

test('marked advertisements never advance', async () => {
  const app = await setup();
  app.renderer.querySelector = () => ({});
  app.tick();
  app.first.emit('ended');
  assert.equal(app.clicks(), 0);
  assert.equal(app.first.loop, true);
});

test('scroll fallback uses an existing next Short', async () => {
  const app = await setup();
  let scrolled = 0;
  app.doc.buttons = [];
  app.renderer.nextElementSibling = {
    matches: () => true,
    scrollIntoView: () => { scrolled++; }
  };
  app.first.emit('ended');
  assert.equal(scrolled, 1);
  assert.equal(app.clicks(), 0);
});

test('missing next control or item keeps the current page', async () => {
  const app = await setup();
  app.doc.buttons = [];
  app.first.emit('ended');
  assert.equal(app.location.pathname, '/shorts/one');
  assert.equal(app.clicks(), 0);
  assert.equal(app.first.loop, true);
});

test('ignored next click retries by scrolling instead of freezing at the end', async () => {
  const app = await setup();
  let scrolled = 0;
  app.first.ended = true;
  app.first.paused = true;
  app.first.emit('ended');
  assert.equal(app.clicks(), 1);
  app.renderer.nextElementSibling = {
    matches: () => true,
    scrollIntoView: () => { scrolled++; }
  };
  app.advanceClock(1300);
  app.tick();
  assert.equal(scrolled, 1);
  assert.equal(app.first.loop, true);
});

test('polling recognizes a native loop even when timeupdate is missing', async () => {
  const app = await setup();
  app.first.currentTime = 9.8;
  app.tick();
  app.advanceClock(250);
  app.first.currentTime = 0.05;
  app.tick();
  assert.equal(app.clicks(), 1);
});

test('ignored click falls back to the scrollable feed without a next renderer', async () => {
  const app = await setup();
  let scrolled = 0;
  app.first.parentElement = {
    scrollHeight: 3000, clientHeight: 700,
    scrollBy: options => { scrolled += options.top; }
  };
  app.first.emit('ended');
  app.advanceClock(1300);
  app.tick();
  assert.equal(app.first.loop, true);
  assert.equal(scrolled, 700);
});

test('navigation selector supports buttons outside the ytd-shorts wrapper', async () => {
  const app = await setup();
  app.doc.querySelectorAll = selector => {
    if (selector === 'video') return app.doc.videos;
    assert.ok(selector.includes("button[aria-label='Video tiếp theo']"));
    assert.ok(!selector.includes('ytd-shorts '));
    return app.doc.buttons;
  };
  app.first.emit('ended');
  assert.equal(app.clicks(), 1);
});

test('Win/Cmd + Slash skips mid-video with automatic mode disabled', async () => {
  const app = await setup();
  app.setEnabled(false);
  app.first.paused = true;
  app.first.currentTime = 4;
  assert.equal(app.key(), true);
  assert.equal(app.clicks(), 1);
});

test('custom shortcut replaces default immediately', async () => {
  const app = await setup();
  app.setShortcut({ code: 'KeyJ', ctrlKey: true });
  assert.equal(app.key(), false);
  assert.equal(app.key({ code: 'KeyJ', ctrlKey: true, metaKey: false }), true);
  assert.equal(app.clicks(), 1);
});

test('shortcut ignores typing, held keys, composition, hidden tabs and normal videos', async () => {
  const app = await setup();
  for (const overrides of [
    { target: { tagName: 'INPUT' } },
    { composedPath: () => [{ isContentEditable: true }] },
    { target: { getAttribute: () => 'textbox' } },
    { repeat: true }, { isComposing: true }, { shiftKey: true }
  ]) assert.equal(app.key(overrides), false);
  app.doc.hidden = true;
  assert.equal(app.key(), false);
  app.doc.hidden = false;
  app.location.pathname = '/watch';
  assert.equal(app.key(), false);
  assert.equal(app.clicks(), 0);
});

test('native command can skip the real PiP source while the tab is hidden', async () => {
  const app = await setup();
  app.setEnabled(false);
  app.doc.hidden = true;
  app.doc.pictureInPictureElement = app.first;
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, true);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, true);
  assert.equal(app.clicks(), 1);
});

test('native command cannot control a hidden tab without PiP', async () => {
  const app = await setup();
  app.doc.hidden = true;
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, false);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, false);
  assert.equal(app.clicks(), 0);
});

test('TikTok: ended and keyboard skip navigate via TikTok controls', async () => {
  const app = await setup('tiktok');
  assert.equal(app.message({ type: 'vyro-status' }).platform, 'tiktok');
  app.first.emit('ended');
  assert.equal(app.clicks(), 1);
  app.advanceClock(1500);
  app.location.pathname = '/@other/video/987654321';
  app.first.currentSrc = 'blob:new';
  assert.equal(app.key(), true);
  assert.equal(app.clicks(), 2);
});

test('TikTok: auto-next can be disabled independently; manual skip and PiP remain', async () => {
  const app = await setup('tiktok');
  app.setEnabled(false);
  app.change({ enabled: { newValue: true } }); // YouTube setting must not re-enable TikTok.
  app.first.emit('ended');
  assert.equal(app.clicks(), 0);
  assert.equal(app.message({ type: 'vyro-status' }).enabled, false);
  assert.equal(app.key(), true);
  assert.equal(app.clicks(), 1);
  app.pipOptions().toggleAuto();
  assert.equal(app.written.at(-1).enabledTikTok, true);
  assert.equal(app.written.at(-1).enabled, undefined);
});

test('TikTok: native looping moves next without requiring ended', async () => {
  const app = await setup('tiktok');
  app.first.currentTime = 9.9; app.first.emit('timeupdate');
  app.advanceClock(250);
  app.first.currentTime = 0.1; app.first.emit('timeupdate');
  assert.equal(app.clicks(), 1);
});

test('TikTok: excludes LIVE/profile pages and pauses navigation at visible login verification', async () => {
  const app = await setup('tiktok');
  for (const route of ['/@creator/live', '/live', '/@creator', '/upload']) {
    app.location.pathname = route;
    app.tick();
    assert.equal(app.key(), false);
    assert.equal(app.message({ type: 'vyro-status' }).supported, false);
  }
  app.location.pathname = '/foryou';
  app.doc.blockers = [{ getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 500 }) }];
  app.tick();
  assert.equal(app.key(), false);
  assert.equal(app.clicks(), 0);
});
