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

function sponsoredFixture() {
  const nodes = [];
  const card = { querySelectorAll: () => nodes };
  const make = (text, attributes = {}, options = {}) => ({
    innerText: text, textContent: text,
    getAttribute: name => attributes[name] || null,
    matches: () => options.disclosure !== false,
    closest: selector => selector.startsWith('article') ? (options.nested ? {} : card) : options.excluded ? {} : null,
    ...options
  });
  return { nodes, card, make, check: () => fb.isSponsored(card, visibleArea) };
}

test('Facebook detects visible Sponsored/Được tài trợ disclosures, including accessible and split labels', () => {
  const app = sponsoredFixture();
  for (const text of ['Sponsored', 'Được tài trợ', '  Được\u00a0tài\u00a0trợ  ', 'Spon\u200bsored', 'Quảng cáo', 'Ad']) {
    app.nodes.splice(0, app.nodes.length, app.make(text));
    assert.equal(app.check(), true, text);
  }
  app.nodes.splice(0, app.nodes.length, app.make('unreadable split letters', { 'aria-label': 'Sponsored' }, { disclosure: false }));
  assert.equal(app.check(), true);
  app.nodes.splice(0, app.nodes.length, app.make('Sponsored', {}, { disclosure: false }));
  assert.equal(app.check(), false); // Plain caption spans are not disclosure links.
});

test('Facebook ignores ad keywords in captions/comments and hidden/preloaded disclosure labels', () => {
  const app = sponsoredFixture();
  for (const node of [app.make('Why this video is Sponsored'), app.make('Sponsored', {}, { nested: true }),
    app.make('Được tài trợ', {}, { excluded: true }), app.make('Sponsored', {}, { visible: false }),
    app.make('Không được tài trợ'), app.make('Paid partnership')]) {
    app.nodes.splice(0, app.nodes.length, node);
    assert.equal(app.check(), false);
  }
  assert.equal(fb.isSponsored(null, visibleArea), false);
});

test('Facebook detects the screenshot layout: plain Được tài trợ below Mua ngay', () => {
  const app = sponsoredFixture();
  const disclosure = app.make('Được tài trợ', {}, { disclosure: false });
  const cta = app.make('Mua ngay');
  app.card.querySelectorAll = selector => selector.startsWith('button,') ? [cta] : [disclosure];
  assert.equal(app.check(), true);
  cta.innerText = 'Shop now'; disclosure.innerText = 'Sponsored';
  assert.equal(app.check(), true);
  cta.visible = false;
  assert.equal(app.check(), false);
  cta.visible = true;
  app.card.querySelectorAll = selector => selector.startsWith('button,') ? [cta] : [app.make('Được tài trợ', {}, { excluded: true, disclosure: false })];
  assert.equal(app.check(), false);
});

test('Facebook plain labels still ignore comments and text containing sponsored keywords beside a CTA', () => {
  const app = sponsoredFixture();
  const cta = app.make('Mua ngay');
  for (const disclosure of [app.make('Được tài trợ', {}, { nested: true, disclosure: false }),
    app.make('Review video được tài trợ', {}, { disclosure: false }), app.make('Sponsored', {}, { visible: false, disclosure: false })]) {
    app.card.querySelectorAll = selector => selector.startsWith('button,') ? [cta] : [disclosure];
    assert.equal(app.check(), false);
  }
});

test('Facebook includes sibling disclosure metadata after moving the video into PiP', () => {
  const app = sponsoredFixture();
  const marker = {};
  const disclosure = app.make('Được tài trợ', {}, { disclosure: false, closest: () => null });
  const cta = app.make('Mua ngay', {}, { closest: () => null });
  const sourceDoc = { body: {} };
  const shell = {
    matches: () => true,
    querySelectorAll: selector => selector === 'video, [data-vyro-pip-marker]' ? [marker] : selector.startsWith('button,') ? [cta] : [disclosure]
  };
  const wrapper = { parentElement: shell, ownerDocument: sourceDoc, matches: () => false, querySelectorAll: () => [] };
  assert.equal(fb.sponsoredScope(wrapper), shell);
  assert.equal(fb.isSponsored(wrapper, visibleArea), true);
});

test('Facebook scope never crosses into a neighbouring Reel containing an ad or a second PiP marker', () => {
  const sourceDoc = { body: {} };
  const feed = { querySelectorAll: () => [{}, {}] };
  const card = { parentElement: feed, ownerDocument: sourceDoc, matches: () => false, querySelectorAll: () => [] };
  assert.equal(fb.sponsoredScope(card), card);
  assert.equal(fb.isSponsored(card, visibleArea), false);
});
