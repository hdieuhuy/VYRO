"use strict";

// Facebook uses generated CSS classes. Prefer viewer roles and accessible names.
globalThis.VyroFacebook = {
  isHost: hostname => /^(www\.)?facebook\.com$/.test(hostname),
  isPage: pathname => /^\/(?:reel\/\d+|reels(?:\/\d+)?|watch\/reels)\/?$/.test(pathname),
  container(video) {
    const article = video.closest('article, [role="article"]');
    if (article && article.querySelectorAll('video').length <= 1) return article;
    // Return the individual card, rather than the entire multi-player viewer.
    let card = video.parentElement;
    for (let parent = card?.parentElement; parent && parent !== video.ownerDocument?.body; parent = parent.parentElement) {
      if (parent.matches('[role="main"], [role="dialog"]') || parent.querySelectorAll('video').length > 1) break;
      card = parent;
    }
    return card;
  },
  choose(candidates) {
    if (!candidates.length) return null;
    // A modal Reels viewer takes precedence over players behind the modal.
    const modal = candidates.filter(item => item.renderer?.closest?.('[role="dialog"]'));
    const visible = modal.length ? modal : candidates;
    // After the URL changes, a still-playing PiP from the previous Reel must
    // not outrank the new player just because Facebook has not started it yet.
    const current = visible.filter(item => !item.inPip || item.held);
    const pool = current.length ? current : visible;
    const max = Math.max(...pool.map(item => item.area));
    const held = pool.find(item => item.held && item.area >= max * 0.8);
    if (held) return held.video;
    const substantial = pool.filter(item => item.area >= max * 0.6);
    return (substantial.filter(item => !item.video.paused && !item.video.ended).length
      ? substantial.filter(item => !item.video.paused && !item.video.ended) : substantial)
      .sort((a, b) => b.area - a.area)[0]?.video || null;
  },
  blocked(doc, visibleArea) {
    return [...doc.querySelectorAll('form[action*="login"], iframe[src*="captcha"], [role="alertdialog"]')]
      .some(node => visibleArea(node) > 0);
  },
  sponsoredScope(container) {
    if (!container || container.matches?.('article, [role="article"]')) return container;
    let scope = container;
    // The disclosure/CTA can be a sibling of the video wrapper. Include that
    // metadata, but stop before crossing into another Reel. A PiP marker is
    // counted as a player, since the real video is in a different document.
    for (let parent = scope.parentElement; parent && parent !== container.ownerDocument?.body; parent = parent.parentElement) {
      if (parent.querySelectorAll('video, [data-vyro-pip-marker]').length > 1) break;
      scope = parent;
      if (parent.matches('article, [role="article"], [role="main"], [role="dialog"]')) break;
    }
    return scope;
  },
  isSponsored(container, visibleArea) {
    if (!container) return false;
    const scope = this.sponsoredScope(container);
    const label = /^(sponsored|được tài trợ|quảng cáo|advertisement|ad)$/i;
    const normalize = value => (value || '').normalize('NFC')
      .replace(/[\u200B-\u200F\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const excluded = '[hidden], [aria-hidden="true"], [data-ad-preview="message"], [data-ad-comet-preview="message"], [role="textbox"], [role="comment"], [data-testid="UFI2Comment/body"], h1, h2, h3, [role="heading"]';
    const belongsToReel = node => {
      if (node.closest(excluded)) return false;
      const article = node.closest('article, [role="article"]');
      return !article || article === scope || article === container;
    };
    // A visible standalone disclosure is sufficient. The action button can
    // contain arbitrary text, be hidden, load later, or be absent entirely.
    return [...scope.querySelectorAll('a, [role="link"], [aria-label], [data-ad-rendering-role="sponsor_link"], span, div')]
      .some(node => {
        const accessibleName = normalize(node.getAttribute('aria-label'));
        const text = normalize(node.innerText ?? node.textContent);
        if (!label.test(accessibleName) && !label.test(text)) return false;
        if (!belongsToReel(node) || visibleArea(node) <= 0) return false;
        return true;
      });
  },
  nextButtons(doc, container, visibleArea) {
    const viewer = container?.closest?.('[role="dialog"]') || container?.closest?.('[role="main"]') || doc;
    const names = /^(next (?:reel|video)|(?:reel|video|thước phim) tiếp theo|chuyển đến (?:reel|video|thước phim) tiếp theo)$/i;
    return [...viewer.querySelectorAll('button[aria-label], [role="button"][aria-label], button[title], [role="button"][title]')]
      .filter(node => names.test((node.getAttribute('aria-label') || node.getAttribute('title') || '').trim()) &&
        visibleArea(node) > 0 && !node.disabled && node.getAttribute('aria-disabled') !== 'true');
  },
  canMount(video) {
    return video.duration !== Infinity;
  },
  advance({ doc, container, stage, visibleArea, getStyle }) {
    if (this.blocked(doc, visibleArea)) return false;
    const button = this.nextButtons(doc, container, visibleArea)[0];
    if (stage === 0 && button) { button.click(); return true; }
    let next = container?.nextElementSibling;
    while (next && !next.querySelector?.('video')) next = next.nextElementSibling;
    if (next) { next.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
    // Start at the source card: the actual video may now live in the PiP window.
    for (let parent = container?.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 20) {
        parent.scrollBy({ top: parent.clientHeight, behavior: 'instant' }); return true;
      }
    }
    if (button) { button.click(); return true; }
    const scroller = doc.scrollingElement;
    if (scroller?.scrollHeight > scroller?.clientHeight + 20) {
      scroller.scrollBy({ top: scroller.clientHeight, behavior: 'instant' }); return true;
    }
    return false;
  }
};
