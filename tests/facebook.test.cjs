const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/facebook.js'), 'utf8'), context);
const fb = context.VyroFacebook;
const visibleArea = node => node.visible === false ? 0 : 100;
const getStyle = () => ({ overflowY: 'auto' });
function navigation() {
  let clicks = 0, scrolls = 0;
  const button = { getAttribute: key => key === 'aria-label' ? 'Next reel' : null, click: () => clicks++ };
  const doc = { body: {}, querySelectorAll: selector => selector.includes('alertdialog') ? [] : [button] };
  const card = { closest: () => null };
  return { button, doc, card, clicks: () => clicks, scrolls: () => scrolls,
    scroller: { scrollHeight: 1500, clientHeight: 700, scrollBy: () => scrolls++ },
    run: stage => fb.advance({ doc, container: card, stage, visibleArea, getStyle }) };
}

test('Facebook scopes controls to Reels routes and supported desktop hosts', () => {
  for (const route of ['/reel/123/', '/reels/', '/reels/123', '/watch/reels/']) assert.equal(fb.isPage(route), true, route);
  for (const route of ['/', '/watch/', '/stories/123', '/someone/reels/', '/reel/create/', '/reels/create', '/reel/123/comments']) assert.equal(fb.isPage(route), false, route);
  assert.equal(fb.isHost('www.facebook.com'), true);
  assert.equal(fb.isHost('facebook.com'), true);
  assert.equal(fb.isHost('facebook.com.fake.test'), false);
  assert.equal(fb.isHost('m.facebook.com'), false);
});

test('Facebook identifies local Reel cards without treating an entire multi-video viewer as one card', () => {
  const doc = { body: {} };
  const main = { matches: () => true };
  const feed = { matches: () => false, querySelectorAll: () => [1, 2], parentElement: main };
  const card = { parentElement: feed };
  const video = { closest: () => null, parentElement: card, ownerDocument: doc };
  assert.equal(fb.container(video), card);
  const article = { querySelectorAll: () => [video] };
  video.closest = () => article;
  assert.equal(fb.container(video), article);
});

test('Facebook chooses the main modal player, keeps the held source and ignores tiny previews', () => {
  const pausedMain = { paused: true }, preview = { paused: false }, held = { paused: true };
  assert.equal(fb.choose([{ video: pausedMain, area: 1000 }, { video: preview, area: 100 }]), pausedMain);
  assert.equal(fb.choose([{ video: pausedMain, area: 1000 }, { video: held, area: 900, held: true }]), held);
  assert.equal(fb.choose([{ video: preview, area: 1000, inPip: true, held: false }, { video: pausedMain, area: 900 }]), pausedMain);
  const modal = { paused: false };
  assert.equal(fb.choose([{ video: preview, area: 2000 }, { video: modal, area: 700, renderer: { closest: () => ({}) } }]), modal);
  assert.equal(fb.choose([]), null);
});

test('Facebook clicks visible enabled Next reel controls and retries with source scrolling', () => {
  const app = navigation();
  assert.equal(app.run(0), true);
  assert.equal(app.clicks(), 1);
  app.card.parentElement = app.scroller;
  assert.equal(app.run(1), true);
  assert.equal(app.scrolls(), 1);
  assert.equal(app.clicks(), 1);
});

test('Facebook bilingual navigation excludes generic Next, hidden and disabled controls', () => {
  const button = (label, rest = {}) => ({ getAttribute: key => key === 'aria-label' ? label : null, ...rest });
  const good = [button('Next video'), button('Thước phim tiếp theo'), button('Video tiếp theo')];
  const bad = [button('Next'), button('Previous reel'), button('Next reel', { visible: false }), button('Next reel', { disabled: true }),
    { getAttribute: key => key === 'aria-label' ? 'Next reel' : key === 'aria-disabled' ? 'true' : null }];
  const viewer = { querySelectorAll: () => [...good, ...bad] };
  const doc = { querySelectorAll() { throw new Error('Must stay in the viewer'); } };
  const selected = fb.nextButtons(doc, { closest: () => viewer }, visibleArea);
  assert.deepEqual(Array.from(selected), good);
});

test('Facebook skips non-video siblings and scrolls the next mounted Reel', () => {
  const app = navigation();
  let scrolls = 0;
  const next = { querySelector: () => ({}), scrollIntoView: () => scrolls++ };
  app.card.nextElementSibling = { querySelector: () => null, nextElementSibling: next };
  assert.equal(app.run(1), true);
  assert.equal(scrolls, 1);
});

test('Facebook document scroll fallback and blocked login/captcha never click through a dialog', () => {
  const app = navigation();
  app.doc.querySelectorAll = () => [];
  app.doc.scrollingElement = app.scroller;
  assert.equal(app.run(0), true);
  assert.equal(app.scrolls(), 1);
  app.doc.querySelectorAll = () => [{}];
  assert.equal(app.run(0), false);
  assert.equal(app.scrolls(), 1);
  assert.equal(app.clicks(), 0);
  app.doc.querySelectorAll = () => [];
  app.doc.scrollingElement = null;
  assert.equal(app.run(0), false);
});

test('Facebook PiP rejects live streams without rejecting ordinary or loading clips', () => {
  assert.equal(fb.canMount({ duration: Infinity }), false);
  assert.equal(fb.canMount({ duration: 30 }), true);
  assert.equal(fb.canMount({ duration: NaN }), true);
});
