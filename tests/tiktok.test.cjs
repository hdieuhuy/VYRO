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
  const container = { nextElementSibling: { matches: () => true, scrollIntoView: () => scrolls++ } };
  assert.equal(navigation({ container, stage: 1 }), true);
  assert.equal(scrolls, 1);
});

test('feed fallback scrolls document but detail viewer never scrolls unrelated page content', () => {
  let distance = 0;
  const scrollingElement = { scrollHeight: 3000, clientHeight: 700, scrollBy: options => { distance += options.top; } };
  assert.equal(navigation({ scrollingElement }), true);
  assert.equal(distance, 700);
  assert.equal(navigation({ scrollingElement, pathname: '/@creator/video/123' }), false);
  assert.equal(distance, 700);
});
