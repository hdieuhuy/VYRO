const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../extension/youtube-pip.js'), 'utf8');
function fixture() {
  const children = [];
  const location = { hostname: 'www.youtube.com', pathname: '/watch', search: '?v=abc123&list=playlist' };
  let requests = 0, exits = 0;
  const doc = {
    videos: [], pictureInPictureEnabled: true, pictureInPictureElement: null,
    body: { append: node => children.push(node) },
    querySelectorAll: selector => selector === '#movie_player video' ? doc.videos : [],
    createElement: () => ({ style: {}, events: {}, attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, callback) { this.events[type] = callback; }
    }),
    async exitPictureInPicture() {
      exits++;
      const video = doc.pictureInPictureElement;
      doc.pictureInPictureElement = null;
      video?.emit('leavepictureinpicture');
    }
  };
  const context = { URLSearchParams, document: doc, location,
    getComputedStyle: video => video.computedStyle,
    console: { warn() {} }
  };
  vm.runInNewContext(source, context);
  const api = context.VyroYouTubePip.create();
  function video(main = true) {
    const listeners = {}, attributes = new Map();
    return {
      isConnected: true, readyState: 3, videoWidth: 1920, paused: false,
      parentElement: { id: 'original-player' }, style: { cssText: 'width:100%' },
      computedStyle: { display: 'block', visibility: 'visible', opacity: '1' },
      matches: () => main,
      getBoundingClientRect: () => ({ left: 0, right: 1280, top: 0, bottom: 720 }),
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      emit(type) { for (const fn of listeners[type] || []) fn(); },
      listenerCount: type => (listeners[type] || []).length,
      hasAttribute: name => attributes.has(name), getAttribute: name => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name),
      async requestPictureInPicture() {
        requests++; doc.pictureInPictureElement = this;
        this.emit('enterpictureinpicture');
      }
    };
  }
  return { api, type: context.VyroYouTubePip, button: children[0], doc, location, video,
    requests: () => requests, exits: () => exits };
}

test('YouTube native PiP scopes to watch URLs with video IDs, not Shorts or preview grids', () => {
  const app = fixture();
  assert.equal(app.type.isPage(app.location), true);
  for (const [hostname, pathname, search] of [['www.youtube.com', '/watch', ''], ['www.youtube.com', '/shorts/abc', ''],
    ['www.youtube.com', '/', '?v=abc'], ['notyoutube.com', '/watch', '?v=abc'], ['www.youtube.com', '/watch', '?v=%20']]) {
    assert.equal(app.type.isPage({ hostname, pathname, search }), false);
  }
  app.location.pathname = '/shorts/abc'; app.api.update();
  assert.equal(app.button.hidden, true);
  app.location.pathname = '/watch'; app.api.update();
  assert.equal(app.button.hidden, false);
});

test('YouTube native PiP opens/toggles via the main video without reparenting, styling or changing playback', async () => {
  const app = fixture(); const video = app.video(); app.doc.videos = [video]; app.api.update();
  const parent = video.parentElement, style = video.style.cssText;
  await app.button.events.click();
  assert.equal(app.requests(), 1);
  assert.equal(app.doc.pictureInPictureElement, video);
  assert.equal(app.button.attributes['aria-pressed'], 'true');
  assert.match(app.button.textContent, /Đóng/);
  assert.equal(video.parentElement, parent);
  assert.equal(video.style.cssText, style);
  assert.equal(video.paused, false);
  await app.button.events.click();
  assert.equal(app.exits(), 1);
  assert.equal(app.doc.pictureInPictureElement, null);
  assert.equal(app.button.attributes['aria-pressed'], 'false');
});

test('YouTube selects the main player over hidden/stale secondary videos and excludes recommendation selectors', () => {
  const app = fixture();
  const preview = app.video(false), main = app.video(), hidden = app.video();
  hidden.computedStyle.display = 'none';
  app.doc.videos = [hidden, preview, main];
  assert.equal(app.api.findVideo(), main);
  main.isConnected = false;
  assert.equal(app.api.findVideo(), preview);
  preview.getBoundingClientRect = () => ({ left: 0, right: 0, top: 0, bottom: 0 });
  assert.equal(app.api.findVideo(), null);
});

test('YouTube handles missing metadata, unavailable PiP and missing players with persistent feedback', async () => {
  const app = fixture();
  await app.api.open(); app.api.update();
  assert.match(app.button.textContent, /Chưa thấy video/);
  const video = app.video(); app.doc.videos = [video]; video.readyState = 0;
  await app.api.open(); app.api.update();
  assert.match(app.button.textContent, /chưa sẵn sàng/);
  video.readyState = 3; app.doc.pictureInPictureEnabled = false;
  await app.api.open(); app.api.update();
  assert.match(app.button.textContent, /chưa cho phép/);
  assert.equal(app.requests(), 0);
});

test('YouTube restores the original disablepictureinpicture attribute after exit or failure', async () => {
  const app = fixture(); const video = app.video(); app.doc.videos = [video];
  video.setAttribute('disablepictureinpicture', '');
  await app.api.open();
  assert.equal(video.hasAttribute('disablepictureinpicture'), false);
  await app.api.open();
  assert.equal(video.hasAttribute('disablepictureinpicture'), true);
  video.requestPictureInPicture = async () => { throw new Error('NotAllowedError'); };
  await app.api.open(); app.api.update();
  assert.equal(video.hasAttribute('disablepictureinpicture'), true);
  assert.equal(app.button.disabled, false);
  assert.match(app.button.textContent, /Bấm thử lại/);
});

test('YouTube serializes repeated requests and follows externally closed native PiP', async () => {
  const app = fixture(); const video = app.video(); app.doc.videos = [video];
  let release, calls = 0;
  video.requestPictureInPicture = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const opening = app.api.open();
  assert.equal(app.button.disabled, true);
  await app.api.open();
  assert.equal(calls, 1);
  app.doc.pictureInPictureElement = video; video.emit('enterpictureinpicture'); release(); await opening;
  for (let i = 0; i < 10; i++) app.api.update();
  assert.equal(video.listenerCount('leavepictureinpicture'), 1);
  await app.doc.exitPictureInPicture();
  assert.equal(app.button.attributes['aria-pressed'], 'false');
  assert.equal(app.button.textContent, 'PiP YouTube ↗');
});

test('YouTube PiP never opens automatically or forces a paused video to play', async () => {
  const app = fixture(); const video = app.video(); video.paused = true; app.doc.videos = [video];
  for (let i = 0; i < 10; i++) app.api.update();
  assert.equal(app.requests(), 0);
  await app.api.open();
  assert.equal(video.paused, true);
});
