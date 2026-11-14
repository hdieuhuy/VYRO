const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');
const shortcutSource = fs.readFileSync(path.join(__dirname, '../extension/shortcut.js'), 'utf8');
const youtubePipSource = fs.readFileSync(path.join(__dirname, '../extension/youtube-pip.js'), 'utf8');
const facebookSource = fs.readFileSync(path.join(__dirname, '../extension/facebook.js'), 'utf8');
const tiktokSource = fs.readFileSync(path.join(__dirname, '../extension/tiktok.js'), 'utf8');

async function setup(platform = 'youtube') {
  let tick, change, message, clock = 2000, clicks = 0;
  const listeners = {};
  const written = [];
  let pipOptions;
  let pipOpen = false, pipUpdates = 0, suspensions = 0;
  let heldVideo = null, heldAnchor = null;
  const rect = { left: 100, top: 0, right: 500, bottom: 700 };
  const renderer = { hasAttribute: () => true, querySelector: () => null, querySelectorAll: () => [], nextElementSibling: null };
  function video() {
    const handlers = {};
    return {
      loop: true, ended: false, paused: false, seeking: false,
      currentTime: 0, duration: 10, currentSrc: 'blob:one',
      pause() { this.paused = true; },
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
    getAttribute: name => name === 'aria-label' ? 'Next reel' : null,
    click: () => { clicks++; }
  };
  const doc = {
    exitPictureInPicture: async () => { doc.pictureInPictureElement = null; },
    hidden: false, videos: [first], buttons: [button], blockers: [], cards: [],
    querySelectorAll: selector => selector === 'video' ? doc.videos : selector === '#movie_player video' ? (doc.watchVideos || []) : (selector.includes('verify-page') || selector.includes('alertdialog')) ? doc.blockers :
      selector.includes('article') && selector.includes('feed-live') ? doc.cards : doc.buttons,
    addEventListener: (type, callback) => { listeners[type] = callback; }
  };
  const location = { hostname: platform === 'tiktok' ? 'www.tiktok.com' : platform === 'facebook' ? 'www.facebook.com' : 'www.youtube.com',
    pathname: platform === 'tiktok' ? '/@creator/video/123456789' : platform === 'facebook' ? '/reel/123456789/' : '/shorts/one' };
  const controller = vm.runInNewContext(tiktokSource + '\n' + facebookSource + '\n' + youtubePipSource + '\nVyroYouTubePip.create = () => ({ update() {}, open: async () => { await document.watchVideos?.[0]?.requestPictureInPicture?.(); }, error: () => \"\" });\n' + shortcutSource + '\n' + source + '\nVyroPipController', {
    URLSearchParams, documentPictureInPicture: { requestWindow: async () => ({}) }, location, document: doc, innerWidth: 1200, innerHeight: 800,
    performance: { now: () => clock },
    navigator: { platform: 'MacIntel' },
    ShortsPip: { create: options => { pipOptions = options; return {
      open: async () => { pipOpen = true; }, close: () => { pipOpen = false; },
      update() { pipUpdates++; }, suspend() { suspensions++; }, isOpen: () => pipOpen, video: () => heldVideo, renderer: () => heldVideo ? renderer : null,
      anchor: () => heldAnchor, sourceIdentity: () => location.pathname
    }; } },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', overflowY: 'auto' }),
    chrome: { runtime: { sendMessage: async () => {}, onMessage: { addListener: fn => { message = fn; } } }, storage: {
      local: { get: async () => ({ enabled: true, enabledTikTok: true, enabledFacebook: true }), set: async settings => {
        written.push(settings);
        change(Object.fromEntries(Object.entries(settings).map(([key, newValue]) => [key, { newValue }])), 'local');
      } },
      onChanged: { addListener: callback => { change = callback; } }
    } },
    setInterval: callback => { tick = callback; }
  });
  await Promise.resolve();
  return {
    first, video, doc, renderer, location, controller,
    tick: () => tick(), advanceClock: ms => { clock += ms; },
    clicks: () => clicks,
    setEnabled: enabled => change({ [platform === 'tiktok' ? 'enabledTikTok' : platform === 'facebook' ? 'enabledFacebook' : 'enabled']: { newValue: enabled } }, 'local')
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
    holdInPip: (video, marker) => { heldVideo = video; heldAnchor = marker; pipOpen = true; },
    setPipOpen: open => { pipOpen = open; }, pipUpdates: () => pipUpdates, suspensions: () => suspensions,
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

test('TikTok: excludes upload pages and pauses navigation at visible login verification', async () => {
  const app = await setup('tiktok');
  for (const route of ['/upload']) {
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

test('TikTok auto-next recognizes a JS loop even with seeking and a delayed source timer', async () => {
  const app = await setup('tiktok');
  app.first.currentTime = 9.8; app.first.emit('timeupdate');
  app.advanceClock(2000);
  app.first.currentTime = 0.05; app.first.seeking = true; app.first.emit('timeupdate');
  assert.equal(app.clicks(), 1);
});

test('intentional PiP seek back to the start does not trigger auto-next', async () => {
  const app = await setup('tiktok');
  app.first.currentTime = 9.8; app.first.emit('timeupdate');
  app.pipOptions().onSeek();
  app.advanceClock(200);
  app.first.currentTime = 0.05; app.first.seeking = true; app.first.emit('timeupdate');
  assert.equal(app.clicks(), 0);
});

test('TikTok auto-next also works in an Explore PiP session without a matching arrow button', async () => {
  const app = await setup('tiktok');
  app.location.pathname = '/explore'; app.setPipOpen(true); app.doc.buttons = [];
  let scrolls = 0;
  app.renderer.nextElementSibling = {
    matches: selector => selector.startsWith('article'), querySelector: () => null,
    scrollIntoView: () => scrolls++
  };
  app.first.currentTime = 9.8; app.first.emit('timeupdate');
  app.advanceClock(200);
  app.first.currentTime = 0.1; app.first.emit('timeupdate');
  assert.equal(scrolls, 1);
});

test('a LIVE route is skipped before PiP update can close the existing window', async () => {
  const app = await setup('tiktok'); app.setPipOpen(true);
  const updates = app.pipUpdates();
  app.location.pathname = '/@streamer/live'; app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.pipUpdates(), updates);
  assert.equal(app.suspensions(), 1);
  app.tick();
  assert.equal(app.clicks(), 1); // LIVE navigation has its own cooldown.
  app.location.pathname = '/@creator/video/123'; app.first.currentSrc = 'blob:regular';
  app.tick();
  assert.ok(app.pipUpdates() > updates);
});

test('LIVE cards without any video are skipped even when ordinary auto-next is off', async () => {
  const app = await setup('tiktok'); app.setEnabled(false); app.setPipOpen(true);
  app.doc.videos = []; app.location.pathname = '/foryou';
  app.doc.cards = [{
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 700 }),
    matches: () => true, querySelector: () => null
  }];
  const updates = app.pipUpdates();
  app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.pipUpdates(), updates);
  assert.equal(app.message({ type: 'vyro-status' }).enabled, false);
});

test('recognized LIVE playback is paused so it cannot keep playing audio behind PiP', async () => {
  const app = await setup('tiktok');
  app.location.pathname = '/foryou';
  app.first.duration = Infinity; app.first.readyState = 3;
  app.tick();
  assert.equal(app.first.paused, true);
  assert.equal(app.clicks(), 1);
});

test('a photo URL with no video is skipped without updating or closing PiP', async () => {
  const app = await setup('tiktok'); app.setPipOpen(true);
  const updates = app.pipUpdates();
  app.location.pathname = '/@creator/photo/123456'; app.doc.videos = [];
  app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.pipUpdates(), updates);
  assert.equal(app.suspensions(), 1);
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, true);
  app.advanceClock(1300);
  app.location.pathname = '/@creator/photo/654321'; app.tick();
  assert.equal(app.clicks(), 2);
  app.location.pathname = '/@creator/video/999'; app.doc.videos = [app.video()]; app.tick();
  assert.ok(app.pipUpdates() > updates);
});

test('photo cards in a feed are detected without any media element or photo URL', async () => {
  const app = await setup('tiktok'); app.setPipOpen(true); app.setEnabled(false);
  app.location.pathname = '/foryou'; app.doc.videos = [];
  app.doc.cards = [{
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 700 }),
    matches: selector => selector.includes('photo-mode'), querySelector: () => null
  }];
  const updates = app.pipUpdates(); app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.pipUpdates(), updates);
});

test('ordinary photo browsing is left alone when auto-next and PiP are both off', async () => {
  const app = await setup('tiktok'); app.setEnabled(false);
  app.location.pathname = '/@creator/photo/123'; app.doc.videos = [];
  app.tick();
  assert.equal(app.clicks(), 0);
});

test('TikTok PiP entry stays available on Explore/search/profile while grid auto-next stays off', async () => {
  const app = await setup('tiktok');
  app.doc.buttons = [];
  for (const route of ['/explore', '/search', '/@creator']) {
    app.location.pathname = route; app.tick();
    assert.equal(app.pipOptions().isShorts(), true, route);
    assert.equal(app.message({ type: 'vyro-status' }).supported, true);
    assert.equal(app.pipOptions().findVideo(), app.first);
    app.first.emit('ended');
    assert.equal(app.clicks(), 0);
  }
});

test('Facebook auto-next works on ended/JS loops and stops when disabled', async () => {
  const app = await setup('facebook');
  assert.equal(app.message({ type: 'vyro-status' }).platform, 'facebook');
  app.first.ended = true; app.first.emit('ended'); app.tick();
  assert.equal(app.clicks(), 1);
  app.advanceClock(1500); app.location.pathname = '/reel/222/';
  app.first.ended = false; app.first.currentSrc = 'blob:two'; app.tick();
  app.first.currentTime = 9.8; app.first.emit('timeupdate');
  app.advanceClock(2000); app.first.currentTime = 0.1; app.first.seeking = true; app.first.emit('timeupdate');
  assert.equal(app.clicks(), 2);
  app.setEnabled(false); app.advanceClock(1500); app.first.ended = true; app.first.emit('ended');
  assert.equal(app.clicks(), 2);
});

test('Facebook manual skip works with auto off and PiP toggle writes only Facebook setting', async () => {
  const app = await setup('facebook'); app.setEnabled(false);
  assert.equal(app.key(), true);
  assert.equal(app.clicks(), 1);
  app.advanceClock(1500);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, true);
  assert.equal(app.clicks(), 2);
  await app.pipOptions().toggleAuto();
  assert.equal(app.written.at(-1).enabledFacebook, true);
  assert.equal(app.written.at(-1).enabled, undefined);
  app.advanceClock(1500); app.setPipOpen(true);
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, true);
  app.pipOptions().skip();
  assert.equal(app.clicks(), 3);
});

test('Facebook ignores background tabs without PiP, input fields, normal Feed and Stories', async () => {
  const app = await setup('facebook');
  assert.equal(app.key({ target: { tagName: 'INPUT' } }), false);
  app.doc.hidden = true;
  app.first.ended = true; app.first.emit('ended');
  assert.equal(app.clicks(), 0);
  app.setPipOpen(true); app.tick();
  assert.equal(app.clicks(), 1);
  app.doc.hidden = false;
  for (const route of ['/', '/watch/', '/stories/123']) {
    app.location.pathname = route; app.advanceClock(1500); app.tick();
    assert.equal(app.pipOptions().isShorts(), false);
    assert.equal(app.key(), false);
    assert.equal(app.message({ type: 'vyro-status' }).supported, false);
  }
  assert.equal(app.clicks(), 1);
});

test('Facebook keeps preloaded/offscreen clips from winning and respects deliberate seek', async () => {
  const app = await setup('facebook');
  const preload = app.video(); preload.getBoundingClientRect = () => ({ left: 0, right: 400, top: 900, bottom: 1600 });
  app.doc.videos.push(preload);
  assert.equal(app.pipOptions().findVideo(), app.first);
  app.first.currentTime = 9.8; app.first.emit('timeupdate');
  app.pipOptions().onSeek(); app.advanceClock(200);
  app.first.currentTime = 0.01; app.first.seeking = true; app.first.emit('timeupdate');
  assert.equal(app.clicks(), 0);
  app.first.duration = Infinity;
  assert.equal(app.pipOptions().canMountVideo(app.first), false);
  assert.equal(app.key(), false);
});

test('Facebook navigation pauses for visible login/captcha/alert dialogs', async () => {
  const app = await setup('facebook');
  app.doc.blockers = [{ getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 500 }) }];
  app.first.ended = true; app.first.emit('ended');
  assert.equal(app.key(), false);
  assert.equal(app.clicks(), 0);
});

function addSponsoredLabel(app, label = 'Được tài trợ') {
  const node = {
    innerText: label,
    closest: selector => selector.startsWith('article') ? app.renderer : null,
    matches: () => true,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ left: 100, top: 50, right: 220, bottom: 75 })
  };
  app.renderer.querySelectorAll = selector => selector.startsWith('a,') ? [node] : [];
  return node;
}

test('Facebook sponsored Reels skip immediately with auto off, pause media and retain the PiP window', async () => {
  const app = await setup('facebook'); app.setEnabled(false); app.setPipOpen(true);
  addSponsoredLabel(app);
  const updates = app.pipUpdates();
  app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.first.paused, true);
  assert.equal(app.first.currentTime, 0); // Did not wait for the clip to end.
  assert.equal(app.pipUpdates(), updates); // Ad never mounted into PiP.
  assert.ok(app.suspensions() > 0);
  assert.equal(app.pipOptions().canMountVideo(app.first), false);
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, true);
  app.tick(); app.key();
  assert.equal(app.clicks(), 1); // Poll/shortcut cannot cause duplicate navigation.
  app.renderer.querySelectorAll = () => [];
  app.location.pathname = '/reel/222/'; app.doc.videos = [app.video()]; app.tick();
  assert.ok(app.pipUpdates() > updates);
  assert.equal(app.pipOptions().canMountVideo(app.doc.videos[0]), true);
  assert.equal(app.message({ type: 'vyro-status' }).enabled, false);
});

test('Facebook sponsored skip also works without PiP and consecutive ads start fresh retry counts', async () => {
  const app = await setup('facebook'); app.setEnabled(false); addSponsoredLabel(app, 'Sponsored');
  app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.suspensions(), 0);
  app.advanceClock(1300); app.location.pathname = '/reel/999/'; app.first.currentSrc = 'blob:second-ad'; app.tick();
  assert.equal(app.clicks(), 2);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, true);
  assert.equal(app.clicks(), 2);
});

test('Facebook sponsored retries are bounded and manual Skip can retry after the limit', async () => {
  const app = await setup('facebook'); app.setEnabled(false); addSponsoredLabel(app);
  app.tick();
  for (let i = 0; i < 12; i++) { app.advanceClock(1300); app.tick(); }
  assert.equal(app.clicks(), 8);
  assert.equal(app.key(), true);
  assert.equal(app.clicks(), 9);
});

test('Facebook never skips hidden ads without PiP or clicks through login dialogs', async () => {
  const app = await setup('facebook'); app.setEnabled(false); addSponsoredLabel(app);
  app.doc.hidden = true; app.tick();
  assert.equal(app.clicks(), 0);
  app.setPipOpen(true); app.doc.blockers = [{ getBoundingClientRect: () => ({ left: 0, top: 0, right: 500, bottom: 500 }) }];
  app.tick();
  assert.equal(app.clicks(), 0);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, false);
  app.doc.blockers = []; app.tick();
  assert.equal(app.clicks(), 1);
});

test('Facebook sponsored labels outside Reels and ordinary captions never trigger ad skip', async () => {
  const app = await setup('facebook'); app.setEnabled(false);
  const node = addSponsoredLabel(app, 'Review các quảng cáo được tài trợ');
  app.tick();
  assert.equal(app.clicks(), 0);
  node.innerText = 'Sponsored';
  for (const route of ['/', '/watch/', '/stories/123']) {
    app.location.pathname = route; app.tick();
    assert.equal(app.clicks(), 0);
  }
});

test('Facebook ended-event and ad poll share navigation cooldown instead of advancing twice', async () => {
  const app = await setup('facebook');
  app.first.ended = true; app.first.emit('ended');
  assert.equal(app.clicks(), 1);
  addSponsoredLabel(app); app.tick(); app.tick();
  assert.equal(app.clicks(), 1);
  app.advanceClock(1300); app.tick();
  assert.equal(app.clicks(), 2);
});

test('Facebook skips plain sponsored metadata beside a PiP-held player, with no video left in the source document', async () => {
  const app = await setup('facebook'); app.setEnabled(false);
  const marker = { getBoundingClientRect: () => ({ left: 100, top: 0, right: 500, bottom: 700 }) };
  app.holdInPip(app.first, marker); app.doc.videos = [];
  const disclosure = {
    innerText: 'Được tài trợ', getAttribute: () => null, closest: () => null, matches: () => false,
    getBoundingClientRect: () => ({ left: 120, top: 650, right: 260, bottom: 675 })
  };
  const cta = {
    innerText: 'Mua ngay', getAttribute: () => null, closest: () => null,
    getBoundingClientRect: () => ({ left: 120, top: 600, right: 480, bottom: 640 })
  };
  const shell = {
    matches: () => true,
    querySelectorAll: selector => selector === 'video, [data-vyro-pip-marker]' ? [marker] : selector.startsWith('button,') ? [cta] : [disclosure]
  };
  app.renderer.parentElement = shell;
  const updates = app.pipUpdates();
  app.tick();
  assert.equal(app.clicks(), 1);
  assert.equal(app.first.paused, true);
  assert.equal(app.pipUpdates(), updates);
  assert.equal(app.pipOptions().canMountVideo(app.first), false);
  assert.ok(app.suspensions() > 0);
  shell.querySelectorAll = selector => selector === 'video, [data-vyro-pip-marker]' ? [marker] : [];
  app.location.pathname = '/reel/222/'; app.first.currentSrc = 'blob:ordinary'; app.tick();
  assert.ok(app.pipUpdates() > updates);
  assert.equal(app.pipOptions().canMountVideo(app.first), true);
});

test('YouTube watch reports native PiP support but never invokes Shorts next, including native skip commands', async () => {
  const app = await setup();
  app.location.pathname = '/watch'; app.location.search = '?v=abc123';
  app.doc.watchVideos = [app.first]; app.tick();
  const status = app.message({ type: 'vyro-status' });
  assert.equal(status.supported, true);
  assert.equal(status.pipMode, 'native-youtube');
  assert.equal(status.hasVideo, true);
  app.first.ended = true; app.first.emit('ended'); app.tick();
  assert.equal(app.key(), false);
  assert.equal(app.message({ type: 'shorts-skip-native' }).ok, false);
  app.doc.pictureInPictureElement = app.first;
  assert.equal(app.message({ type: 'shorts-query-pip' }).pip, false);
  assert.equal(app.clicks(), 0);
  app.location.pathname = '/shorts/two'; app.location.search = ''; app.first.ended = false; app.tick();
  assert.equal(app.message({ type: 'vyro-status' }).pipMode, 'custom');
  app.first.emit('ended');
  assert.equal(app.clicks(), 1);
});

test('Facebook skips a plain sponsored label with arbitrary or absent CTA, even when auto is off and PiP is open', async () => {
  for (const cta of ['Xem chi tiết', 'Đánh giá', 'Liên hệ với chúng tôi', null]) {
    const app = await setup('facebook'); app.setEnabled(false); app.setPipOpen(true);
    const label = addSponsoredLabel(app);
    label.matches = () => false;
    app.renderer.querySelectorAll = selector => {
      if (selector.startsWith('button,')) throw new Error('Ad detection must never query CTA text: ' + cta);
      return selector.startsWith('a,') ? [label] : [];
    };
    const updates = app.pipUpdates(); app.tick();
    assert.equal(app.clicks(), 1, String(cta));
    assert.equal(app.first.paused, true);
    assert.equal(app.pipUpdates(), updates);
    assert.equal(app.pipOptions().canMountVideo(app.first), false);
  }
});

test('popup controller opens/closes custom PiP on each short-video platform without changing auto or skipping', async () => {
  for (const platform of ['youtube', 'tiktok', 'facebook']) {
    const app = await setup(platform);
    assert.equal(app.message({ type: 'vyro-status' }).pipCanOpen, true, platform);
    const opened = await app.controller.setOpen(true);
    assert.equal(opened.ok, true); assert.equal(opened.pipOpen, true);
    assert.equal((await app.controller.setOpen(true)).pipOpen, true); // Idempotent desired state.
    const closed = await app.controller.setOpen(false);
    assert.equal(closed.ok, true); assert.equal(closed.pipOpen, false);
    assert.equal(app.clicks(), 0);
    assert.equal(app.written.length, 0);
  }
});

test('popup controller opens/closes native YouTube PiP and serializes concurrent requests', async () => {
  const app = await setup(); app.location.pathname = '/watch'; app.location.search = '?v=abc123';
  app.doc.pictureInPictureEnabled = true; app.first.readyState = 3; app.first.videoWidth = 1920;
  app.doc.watchVideos = [app.first];
  let release;
  app.first.requestPictureInPicture = () => new Promise(resolve => { release = () => { app.doc.pictureInPictureElement = app.first; resolve(); }; });
  const opening = app.controller.setOpen(true);
  assert.equal((await app.controller.setOpen(true)).ok, false);
  release();
  assert.equal((await opening).pipOpen, true);
  assert.equal((await app.controller.setOpen(false)).pipOpen, false);
  assert.equal((await app.controller.setOpen('toggle')).ok, false);
  assert.equal(app.clicks(), 0);
});

test('popup controller rejects unsupported/no-video/ad opens but still allows closing an ad-waiting PiP', async () => {
  const app = await setup('facebook');
  addSponsoredLabel(app);
  assert.equal((await app.controller.setOpen(true)).ok, false);
  app.setPipOpen(true);
  assert.equal((await app.controller.setOpen(false)).ok, true);
  app.renderer.querySelectorAll = () => []; app.doc.videos = [];
  assert.equal((await app.controller.setOpen(true)).ok, false);
  app.doc.videos = [app.first]; app.location.pathname = '/stories/123';
  assert.equal((await app.controller.setOpen(true)).ok, false);
});
