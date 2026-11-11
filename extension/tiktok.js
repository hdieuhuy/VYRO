"use strict";

// TikTok-specific DOM knowledge stays here; controls and PiP use the common core.
globalThis.VyroTikTok = {
  isHost: hostname => /^(www\.)?tiktok\.com$/.test(hostname),
  isPage: pathname => /^(\/(foryou|following|friends)?\/?|\/@[^/]+\/video\/\d+\/?)$/.test(pathname),
  containerSelector: 'article, [data-e2e="recommend-list-item-container"], [data-e2e="recommend-list-item"], [data-e2e="browse-video"], [data-e2e="feed-video"]',
  container(video) { return video.closest(this.containerSelector); },
  choose(candidates) {
    if (!candidates.length) return null;
    const maxArea = Math.max(...candidates.map(item => item.area));
    const held = candidates.find(item => item.held && item.area >= maxArea * 0.8);
    if (held) return held.video;
    // A tiny animated preview must not outrank the main paused player.
    const substantial = candidates.filter(item => item.area >= maxArea * 0.5);
    const playing = substantial.filter(item => !item.video.paused && !item.video.ended);
    return (playing.length ? playing : substantial).sort((a, b) => b.area - a.area)[0]?.video || null;
  },
  blocked(doc, visibleArea) {
    return [...doc.querySelectorAll('[data-e2e="login-modal"], [data-e2e="verify-page"], iframe[src*="captcha"]')]
      .some(node => visibleArea(node) > 0);
  },
  advance({ doc, video, container, stage, visibleArea, getStyle, pathname }) {
    const controls = [...doc.querySelectorAll(
      'button[data-e2e="arrow-right"], button[data-e2e="arrow-down"], ' +
      '[data-e2e="arrow-right"], [data-e2e="arrow-down"], ' +
      'button[aria-label="Next video"], button[aria-label="Go to next video"], ' +
      'button[aria-label="Video tiếp theo"]'
    )];
    const buttons = [...new Set(controls.map(node => node.closest?.('button, [role="button"]') || node))];
    const nextButton = buttons.find(node => visibleArea(node) > 0 && !node.disabled &&
      node.getAttribute('aria-disabled') !== 'true');
    if (stage === 0 && nextButton) { nextButton.click(); return true; }
    let next = container?.nextElementSibling;
    while (next && !next.matches(this.containerSelector)) next = next.nextElementSibling;
    if (next) { next.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
    // Start from the source card, not the video after it was moved into PiP.
    for (let parent = container || video.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 20) {
        parent.scrollBy({ top: parent.clientHeight, behavior: 'instant' });
        return true;
      }
    }
    if (nextButton) { nextButton.click(); return true; }
    // Some feed variants scroll the document rather than a nested container.
    const scroller = doc.scrollingElement;
    if (!pathname?.includes('/video/') && scroller?.scrollHeight > scroller?.clientHeight + 20) {
      scroller.scrollBy({ top: scroller.clientHeight, behavior: 'instant' });
      return true;
    }
    return false;
  }
};
