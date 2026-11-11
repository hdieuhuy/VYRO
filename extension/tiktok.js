"use strict";

// TikTok-specific DOM knowledge stays here; controls and PiP use the common core.
globalThis.VyroTikTok = {
  isHost: hostname => /^(www\.)?tiktok\.com$/.test(hostname),
  isPage: pathname => /^(\/(foryou|following|friends)?\/?|\/@[^/]+\/video\/\d+\/?)$/.test(pathname),
  isLiveRoute: pathname => /^\/(?:@[^/]+\/)?live(?:\/|$)/.test(pathname),
  isVideoRoute: pathname => /^\/@[^/]+\/video\/\d+\/?$/.test(pathname),
  isPhotoRoute: pathname => /^\/@[^/]+\/photo\/\d+\/?$/.test(pathname),
  photoSelector: '[data-e2e="photo-mode"], [data-e2e="photo-post"], [data-e2e="image-post"], [data-e2e="photo-carousel"], [data-e2e="image-carousel"], [data-photo-mode="true"]',
  isPhoto(container, video) {
    if (video?.closest?.(this.photoSelector) || container?.matches?.(this.photoSelector)) return true;
    if (video?.videoWidth > 0 && video?.videoHeight > 0) return false;
    if (container?.querySelector?.('a[href*="/video/"]')) return false;
    if (container?.querySelector?.(this.photoSelector) || container?.querySelector?.('a[href*="/photo/"]')) return true;
    // Some slideshows have an audio-only <video>. Do not confuse a clip that
    // has not loaded metadata with a photo: require decoded data and a large image.
    return !!(video?.readyState >= 2 && video.videoWidth === 0 && video.videoHeight === 0 &&
      [...(container?.querySelectorAll?.('img') || [])].some(img => {
        const rect = img.getBoundingClientRect();
        return rect.width >= 160 && rect.height >= 160;
      }));
  },
  liveSelector: '[data-e2e="feed-live"], [data-e2e="live-card"], [data-e2e="live-preview"], [data-e2e="live-room-player"], [data-e2e="live-player"], [data-live="true"]',
  isLive(container, video) {
    if (video?.closest?.(this.liveSelector) || container?.matches?.(this.liveSelector)) return true;
    // A creator's LIVE avatar/link is not evidence that their ordinary clip is live.
    if (Number.isFinite(video?.duration) && video.duration > 0) return false;
    if (video?.duration === Infinity && video.readyState >= 2) return true;
    if (container?.querySelector?.('a[href*="/video/"]')) return false;
    return !!container?.querySelector?.(this.liveSelector);
  },
  visibleNonVideoCard(doc, visibleArea) {
    const cards = [...doc.querySelectorAll(this.containerSelector + ', ' + this.liveSelector + ', ' + this.photoSelector)]
      .map(card => ({ card, area: visibleArea(card) })).filter(item => item.area > 0)
      .sort((a, b) => b.area - a.area);
    const largest = cards[0];
    if (!largest) return null;
    const video = largest.card.querySelector?.('video');
    if (this.isLive(largest.card, video)) return { kind: 'LIVE', card: largest.card };
    if (this.isPhoto(largest.card, video)) return { kind: 'bài ảnh', card: largest.card };
    return null;
  },
  visibleLiveCard(doc, visibleArea) {
    const result = this.visibleNonVideoCard(doc, visibleArea);
    return result?.kind === 'LIVE' ? result.card : null;
  },
  // PiP is also useful on Explore/search/profile previews. Do not hide the
  // entry point just because the page is not a continuous auto-next feed.
  canOpenPip: pathname => !/^\/(live|upload|messages|inbox|settings|login|signup|business|studio|tiktokstudio|player|embed)(\/|$)/.test(pathname) &&
    !/^\/@[^/]+\/(live|photo)(\/|$)/.test(pathname),
  nextButtons(doc, visibleArea) {
    const controls = [...doc.querySelectorAll(
      'button[data-e2e="arrow-right"], button[data-e2e="arrow-down"], ' +
      '[data-e2e="arrow-right"], [data-e2e="arrow-down"], ' +
      'button[aria-label="Next video"], button[aria-label="Go to next video"], ' +
      'button[aria-label="Video tiếp theo"]'
    )];
    return [...new Set(controls.map(node => node.closest?.('button, [role="button"]') || node))]
      .filter(node => !node.closest?.('[data-e2e="photo-carousel"], [data-e2e="image-carousel"], [data-e2e="image-list"]') &&
        visibleArea(node) > 0 && !node.disabled && node.getAttribute('aria-disabled') !== 'true');
  },
  canAutoAdvance(pathname, doc, visibleArea, inPip = false) {
    return this.isPage(pathname) || this.nextButtons(doc, visibleArea).length > 0 ||
      (inPip && this.canOpenPip(pathname));
  },
  containerSelector: 'article, [data-e2e="recommend-list-item-container"], [data-e2e="recommend-list-item"], [data-e2e="browse-video"], [data-e2e="feed-video"], [data-e2e="feed-live"], [data-e2e="live-card"], [data-e2e="photo-post"], [data-e2e="image-post"]',
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
    const nextButton = this.nextButtons(doc, visibleArea)[0];
    let next = container?.nextElementSibling;
    while (next && !next.matches(this.containerSelector)) next = next.nextElementSibling;
    const firstNext = next;
    while (next && (this.isLive(next, next.querySelector?.('video')) || this.isPhoto(next, next.querySelector?.('video')))) {
      next = next.nextElementSibling;
      while (next && !next.matches(this.containerSelector)) next = next.nextElementSibling;
    }
    // Jump directly over already-loaded LIVE/slideshow cards before entering them.
    if (next && (next !== firstNext || this.isPhoto(container, video))) { next.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
    if (stage === 0 && nextButton) { nextButton.click(); return true; }
    if (next) { next.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
    // Start from the source card, not the video after it was moved into PiP.
    for (let parent = container || video?.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
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
