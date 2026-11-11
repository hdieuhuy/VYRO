const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/tiktok.js'), 'utf8'), context);
const adapter = context.VyroTikTok;

test('TikTok routes support feeds and video detail, exclude profile, photo and LIVE', () => {
  assert.equal(adapter.isHost('www.tiktok.com'), true);
  assert.equal(adapter.isHost('tiktok.com'), true);
  assert.equal(adapter.isHost('not-tiktok.com'), false);
  for (const route of ['/', '/foryou', '/following/', '/friends', '/@creator/video/7654321']) assert.equal(adapter.isPage(route), true, route);
  for (const route of ['/live', '/@creator/live', '/@creator', '/explore', '/@creator/photo/123', '/search', '/upload']) assert.equal(adapter.isPage(route), false, route);
});

test('active video selection rejects tiny playing previews and prefers a substantial playing clip', () => {
  const main = { paused: true }, tiny = { paused: false }, next = { paused: false };
  assert.equal(adapter.choose([{ video: main, area: 1000 }, { video: tiny, area: 50 }]), main);
  assert.equal(adapter.choose([{ video: main, area: 1000 }, { video: next, area: 900 }]), next);
});

test('a paused PiP clip remains selected while its source card is still in view', () => {
  const held = { paused: true }, preload = { paused: false };
  assert.equal(adapter.choose([{ video: held, area: 1000, held: true }, { video: preload, area: 900 }]), held);
  assert.equal(adapter.choose([{ video: held, area: 100, held: true }, { video: preload, area: 900 }]), preload);
});

test('PiP is available beyond feed routes without enabling automatic grid navigation', () => {
  const emptyPage = { querySelectorAll: () => [] };
  for (const route of ['/explore', '/search', '/@creator']) {
    assert.equal(adapter.canOpenPip(route), true);
    assert.equal(adapter.canAutoAdvance(route, emptyPage, () => 100), false);
  }
  for (const route of ['/live', '/@creator/live', '/@creator/photo/123', '/upload', '/messages', '/settings']) {
    assert.equal(adapter.canOpenPip(route), false);
  }
});

function navigation({ button, container, scrollingElement, pathname = '/foryou', stage = 0 } = {}) {
  const doc = { body: {}, scrollingElement, querySelectorAll: selector => {
    assert.ok(selector.includes('arrow-right'));
    assert.ok(selector.includes('arrow-down'));
    return button ? [button] : [];
  } };
  return adapter.advance({ doc, video: {}, container, stage, pathname,
    visibleArea: node => node.visible === false ? 0 : 100,
    getStyle: () => ({ overflowY: 'auto' }) });
}

test('skip clicks a real TikTok button even when data-e2e is on an inner icon', () => {
  let clicks = 0;
  const button = { getAttribute: () => null, click: () => clicks++ };
  const icon = { closest: () => button };
  assert.equal(navigation({ button: icon }), true);
  assert.equal(clicks, 1);
});

test('disabled navigation does not click or invent another video URL', () => {
  let clicks = 0;
  const button = { disabled: true, getAttribute: () => null, click: () => clicks++ };
  assert.equal(navigation({ button, pathname: '/@creator/video/123' }), false);
  assert.equal(clicks, 0);
});

test('fallback scrolls the next source card, not a PiP child', () => {
  let scrolls = 0;
  const container = { nextElementSibling: { matches: selector => selector.startsWith('article'), scrollIntoView: () => scrolls++ } };
  assert.equal(navigation({ container, stage: 1 }), true);
  assert.equal(scrolls, 1);
});

test('LIVE detection does not confuse a normal clip with its creator being LIVE', () => {
  const container = { matches: () => false, querySelector: () => ({}) };
  const video = { duration: 20, readyState: 4, closest: () => null };
  assert.equal(adapter.isLive(container, video), false);
  assert.equal(adapter.isLive({ matches: () => true }, undefined), true);
  assert.equal(adapter.isLive(null, { duration: Infinity, readyState: 3, closest: () => null }), true);
});

test('preloaded or sidebar LIVE card does not override a larger regular feed card', () => {
  const regular = { area: 1000, matches: () => false, querySelector: () => null };
  const live = { area: 200, matches: () => true, querySelector: () => null };
  const doc = { querySelectorAll: () => [regular, live] };
  assert.equal(adapter.visibleLiveCard(doc, node => node.area), null);
  live.area = 1200;
  assert.equal(adapter.visibleLiveCard(doc, node => node.area), live);
});

test('next navigation jumps across consecutive loaded LIVE cards to a regular clip', () => {
  let scrolls = 0;
  const regular = { matches: selector => selector.startsWith('article'), querySelector: () => null, scrollIntoView: () => scrolls++ };
  const secondLive = { matches: () => true, querySelector: () => null, nextElementSibling: regular };
  const firstLive = { matches: () => true, querySelector: () => null, nextElementSibling: secondLive };
  assert.equal(navigation({ container: { nextElementSibling: firstLive } }), true);
  assert.equal(scrolls, 1);
});

test('photo detection recognizes post identity while leaving normal video thumbnails alone', () => {
  assert.equal(adapter.isPhotoRoute('/@creator/photo/1234'), true);
  const linkedPhoto = { matches: () => false, querySelector: selector => selector === 'a[href*="/photo/"]' ? {} : null };
  assert.equal(adapter.isPhoto(linkedPhoto, null), true);
  assert.equal(adapter.isPhoto(linkedPhoto, { videoWidth: 640, videoHeight: 360, closest: () => null }), false);
  assert.equal(adapter.isPhoto({ matches: () => true }, { videoWidth: 0, videoHeight: 0 }), true);
});

test('zero video dimensions only imply a slideshow with decoded data and a large image', () => {
  const card = { matches: () => false, querySelector: () => null,
    querySelectorAll: () => [{ getBoundingClientRect: () => ({ width: 300, height: 400 }) }] };
  const media = { videoWidth: 0, videoHeight: 0, readyState: 0, closest: () => null };
  assert.equal(adapter.isPhoto(card, media), false);
  media.readyState = 3;
  assert.equal(adapter.isPhoto(card, media), true);
});

test('navigation skips a mixed sequence of photo, LIVE and photo cards', () => {
  let scrolls = 0;
  const regular = { matches: selector => selector.startsWith('article'), querySelector: () => null, scrollIntoView: () => scrolls++ };
  const photo = next => ({ matches: selector => selector.startsWith('article') || selector.includes('photo-mode'), querySelector: () => null, nextElementSibling: next });
  const live = { matches: selector => selector.startsWith('article') || selector.includes('data-live'), querySelector: () => null, nextElementSibling: photo(regular) };
  assert.equal(navigation({ container: { nextElementSibling: photo(live) } }), true);
  assert.equal(scrolls, 1);
});

test('image carousel arrows are not treated as next-post navigation', () => {
  const imageArrow = { closest: selector => selector.includes('photo-carousel') ? {} : null,
    getAttribute: () => null, click() { throw new Error('Must not advance an individual slide'); } };
  assert.equal(navigation({ button: imageArrow, pathname: '/@creator/photo/123' }), false);
});

test('feed fallback scrolls document but detail viewer never scrolls unrelated page content', () => {
  let distance = 0;
  const scrollingElement = { scrollHeight: 3000, clientHeight: 700, scrollBy: options => { distance += options.top; } };
  assert.equal(navigation({ scrollingElement }), true);
  assert.equal(distance, 700);
  assert.equal(navigation({ scrollingElement, pathname: '/@creator/video/123' }), false);
  assert.equal(distance, 700);
});
