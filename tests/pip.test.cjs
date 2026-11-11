const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture() {
  class Element {
    constructor(tag, doc) {
      this.tagName = tag.toUpperCase(); this.doc = doc; this.children = [];
      this.ownerDocument = doc;
      const styles = new Map();
      this.style = {
        getPropertyValue: key => styles.get(key)?.value || '',
        getPropertyPriority: key => styles.get(key)?.priority || '',
        setProperty: (key, value, priority = '') => { styles.set(key, { value, priority }); }
      };
      this.attributes = {}; this.events = {}; this.parent = null;
    }
    get isConnected() { return this === this.doc.body || !!this.parent?.isConnected; }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parent = this; this.children.push(node); } }
    replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
    before(node) { node.remove(); node.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this), 0, node); }
    replaceWith(node) { const parent = this.parent; const index = parent.children.indexOf(this); node.remove(); parent.children[index] = node; node.parent = parent; this.parent = null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { this.events[name] = callback; }
    removeEventListener(name) { delete this.events[name]; }
    closest() { return this.renderer || null; }
  }
  function document() {
    const doc = { createElement: tag => new Element(tag, doc), addEventListener: (name, fn) => { doc[name] = fn; } };
    doc.createElementNS = (namespace, tag) => doc.createElement(tag);
    doc.head = doc.createElement('head'); doc.body = doc.createElement('body');
    doc.getElementById = id => {
      const find = node => node.id === id ? node : node.children.map(find).find(Boolean);
      return find(doc.body);
    };
    return doc;
  }
  const sourceDoc = document(), pipDoc = document();
  let pagehide, skipCount = 0, source = null, autoEnabled = true;
  const win = { document: pipDoc, closed: false, addEventListener: (name, fn) => { if (name === 'pagehide') pagehide = fn; }, close() { this.closed = true; pagehide?.(); }, focus() {} };
  const context = { document: sourceDoc, window: { focus() {} }, console,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(node) { this.node = node; node.fitObserver = this; this.disconnected = false; }
      disconnect() { this.disconnected = true; }
    },
    documentPictureInPicture: { requestWindow: async () => win } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/pip.js'), 'utf8'), context);
  const keyHandler = () => {};
  const api = context.ShortsPip.create({
    isShorts: () => true, findVideo: () => source, enabled: () => autoEnabled,
    rendererOf: video => video.renderer,
    identity: () => '/foryou',
    shortcutLabel: () => '⌘ + /', onKey: keyHandler,
    skip: () => { skipCount++; }, toggleAuto() { autoEnabled = !autoEnabled; }
  });
  function video(active = true) {
    const node = sourceDoc.createElement('video');
    node.renderer = { hasAttribute: () => active };
    Object.assign(node, { paused: false, muted: false, duration: 120, currentTime: 30,
      pause() { this.paused = true; }, async play() { this.paused = false; } });
    sourceDoc.body.append(node);
    return node;
  }
  return { api, sourceDoc, pipDoc, win, video, setSource: value => { source = value; },
    skips: () => skipCount, keyHandler,
    open: async () => sourceDoc.body.children[0].events.click() };
}

test('custom PiP moves the real video, provides controls and restores it on close', async () => {
  const app = fixture();
  const first = app.video(); first.setAttribute('style', 'width:500px');
  app.setSource(first);
  await app.open();
  assert.equal(app.api.video(), first);
  assert.equal(first.parent.id, 'stage');
  assert.equal(app.pipDoc.keydown, app.keyHandler);
  app.pipDoc.getElementById('play').events.click();
  assert.equal(first.paused, true);
  assert.equal(app.pipDoc.getElementById('play').getAttribute('aria-label'), 'Phát');
  assert.equal(app.pipDoc.getElementById('play').getAttribute('data-icon'), 'play');
  app.pipDoc.getElementById('mute').events.click();
  assert.equal(first.muted, true);
  assert.equal(app.pipDoc.getElementById('mute').getAttribute('data-icon'), 'muted');
  assert.equal(app.pipDoc.getElementById('auto').getAttribute('aria-pressed'), 'true');
  app.pipDoc.getElementById('skip').events.click();
  assert.equal(app.skips(), 1);
  const seek = app.pipDoc.getElementById('seek');
  seek.value = '500'; seek.events.input();
  assert.equal(first.currentTime, 60);
  app.win.close();
  assert.equal(app.api.isOpen(), false);
  assert.equal(first.parent, app.sourceDoc.body);
  assert.equal(first.getAttribute('style'), 'width:500px');
});

test('TikTok-compatible PiP preserves mute across clips and toggles auto independently of playback', async () => {
  const app = fixture();
  const first = app.video(); app.setSource(first); await app.open();
  assert.equal(app.api.sourceIdentity(), '/foryou');
  assert.ok(app.api.anchor());
  app.pipDoc.getElementById('mute').events.click();
  assert.equal(first.muted, true);
  const next = app.video(true); app.setSource(next); app.api.update();
  assert.equal(next.muted, true);
  app.pipDoc.getElementById('auto').events.click(); app.api.update();
  assert.equal(app.pipDoc.getElementById('auto').getAttribute('aria-pressed'), 'false');
  assert.equal(next.paused, false);
  app.pipDoc.getElementById('play').events.click();
  assert.equal(next.paused, true);
  app.pipDoc.getElementById('play').events.click();
  assert.equal(next.paused, false);
  app.pipDoc.getElementById('skip').events.click();
  assert.equal(app.skips(), 1);
  app.win.close();
  assert.equal(next.parent, app.sourceDoc.body);
});

test('new clips and late YouTube style changes stay centered without seeking or pausing', async () => {
  const app = fixture();
  const first = app.video();
  app.setSource(first); await app.open();
  const next = app.video(true);
  next.style.setProperty('left', '380px');
  next.style.setProperty('transform', 'translate(80px, -40px)');
  app.setSource(next); app.api.update();
  assert.equal(next.style.getPropertyValue('left'), '0px');
  assert.equal(next.style.getPropertyValue('object-position'), '50% 50%');
  assert.equal(next.style.getPropertyValue('object-fit'), 'contain');
  assert.equal(first.fitObserver.disconnected, true);
  // A reused YouTube player overwrites inline geometry after its metadata loads.
  next.style.setProperty('transform', 'translate(500px, 200px)', 'important');
  next.style.setProperty('width', '1200px', 'important');
  next.fitObserver.callback();
  assert.equal(next.style.getPropertyValue('transform'), 'none');
  assert.equal(next.style.getPropertyValue('width'), '100%');
  assert.equal(next.style.getPropertyPriority('width'), 'important');
  next.style.setProperty('object-position', '0% 0%');
  next.events.loadedmetadata();
  assert.equal(next.style.getPropertyValue('object-position'), '50% 50%');
  assert.equal(next.currentTime, 30);
  assert.equal(next.paused, false);
  app.win.close();
  assert.equal(next.fitObserver.disconnected, true);
  assert.equal(next.events.loadedmetadata, undefined);
});

test('custom PiP ignores an inactive preload and switches when a new player activates', async () => {
  const app = fixture();
  const first = app.video();
  app.setSource(first); await app.open();
  const preload = app.video(false);
  app.setSource(preload); app.api.update();
  assert.equal(app.api.video(), first);
  const next = app.video(true);
  app.setSource(next); app.api.update();
  assert.equal(app.api.video(), next);
  assert.equal(first.parent, app.sourceDoc.body);
  assert.equal(next.parent.id, 'stage');
  app.win.close();
  assert.equal(next.parent, app.sourceDoc.body);
});
