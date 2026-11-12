(() => {
  "use strict";

  let enabled = false;
  let active = null;
  let activeKey = "";
  let lastAttempt = -Infinity;
  let previousTime = 0;
  let previousSampleAt = 0;
  let wasPlaying = false;
  let wasSeeking = false;
  let pending = false;
  let attempt = 0;
  let pendingManual = false;
  let shortcut = ShortsShortcut.normalize();
  let pip = null;
  let watchPip = null;
  let skippingPost = false;
  let skippedContainer = null;
  let skippedTarget = null;
  let skipAttempts = 0;
  let lastSkippedAttempt = -Infinity;
  let skippedKind = "LIVE";
  let skippedIdentity = "";
  let manualSeekUntil = 0;
  let sponsoredSkip = null;
  let lastSponsoredAttempt = -Infinity;
  const isTikTok = VyroTikTok.isHost(location.hostname);
  const isFacebook = VyroFacebook.isHost(location.hostname);
  const adapter = isTikTok ? VyroTikTok : isFacebook ? VyroFacebook : null;
  const platform = isTikTok ? "tiktok" : isFacebook ? "facebook" : "youtube";
  const enabledKey = isTikTok ? "enabledTikTok" : isFacebook ? "enabledFacebook" : "enabled";
  const isYouTubeWatch = () => !adapter && VyroYouTubePip.isPage(location);

  const isShorts = () => isTikTok ? VyroTikTok.canOpenPip(location.pathname) : isFacebook ? VyroFacebook.isPage(location.pathname) : /^\/shorts\/[^/]+/.test(location.pathname);
  const rendererOf = video => video === pip?.video() ? pip.renderer() :
    (adapter ? adapter.container(video) : video.closest("ytd-reel-video-renderer"));
  const hasPip = () => pip?.isOpen() || !!document.pictureInPictureElement;
  const canWatch = () => !document.hidden || hasPip();
  const isAd = video => Boolean(video.closest(".ad-showing") ||
    rendererOf(video)?.querySelector(".ad-showing"));

  function visibleArea(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return 0;
    return Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)) *
      Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  }

  function sourceVideo() {
    // Shorts can keep several preloaded players in the document.
    const candidates = [...document.querySelectorAll("video")]
      .map(video => ({ video, area: visibleArea(video), renderer: rendererOf(video) }))
      .filter(item => item.area > 0);
    // Include the source marker while a video is in PiP so preloads don't win.
    const heldVideo = pip?.video();
    const anchor = pip?.anchor?.();
    if (heldVideo && anchor) {
      const area = visibleArea(anchor);
      if (area > 0) candidates.push({ video: heldVideo, area, renderer: pip.renderer(),
        inPip: true, held: pip.sourceIdentity() === location.pathname });
    }
    if (adapter) return adapter.choose(candidates);
    const marked = candidates.filter(item => item.renderer?.hasAttribute("is-active"));
    return (marked.length ? marked : candidates).sort((a, b) => b.area - a.area)[0]?.video || null;
  }

  function currentVideo() {
    return pip?.video() || document.pictureInPictureElement || sourceVideo();
  }

  function detach() {
    if (active) {
      active.removeEventListener("ended", onEnded);
      active.removeEventListener("timeupdate", onTimeUpdate);
    }
    active = null;
    activeKey = "";
    pending = false;
    pendingManual = false;
    attempt = 0;
    lastAttempt = -Infinity;
    previousTime = 0;
    previousSampleAt = 0;
    wasPlaying = false;
    wasSeeking = false;
  }

  function canAdvance(manual = false) {
    if (isFacebook && sponsoredSkip) return isShorts() && canWatch() && !VyroFacebook.blocked(document, visibleArea);
    if (isTikTok && skippingPost) return canWatch() && !VyroTikTok.blocked(document, visibleArea);
    return (enabled || manual) && isShorts() && canWatch() && active &&
      currentVideo() === active && !isAd(active) &&
      (manual || !isTikTok || VyroTikTok.canAutoAdvance(location.pathname, document, visibleArea, !!hasPip())) &&
      (!adapter || !adapter.blocked(document, visibleArea)) &&
      (!isFacebook || VyroFacebook.canMount(active));
  }

  function nextShort(manual = false) {
    if (isFacebook && handleFacebookSponsored(manual)) return;
    if (isTikTok && skippingPost) { advancePastUnsupported(); return; }
    if (!canAdvance(manual) || performance.now() - lastAttempt < 1200) return;
    pending = true;
    pendingManual = manual;
    lastAttempt = performance.now();
    if (adapter) {
      adapter.advance({ doc: document, video: active, container: rendererOf(active),
        stage: attempt++ % 3, visibleArea, getStyle: getComputedStyle, pathname: location.pathname });
      return;
    }
    // Navigation controls can live outside ytd-shorts in newer YouTube layouts.
    // Only click an actual button: clicking the custom-element wrapper can do nothing.
    const button = [...document.querySelectorAll(
      "#navigation-button-down button, button#navigation-button-down, " +
      "button[aria-label='Next video'], button[aria-label='Video tiếp theo'], " +
      "button[title='Next video'], button[title='Video tiếp theo']"
    )].find(node => visibleArea(node) > 0 && !node.disabled &&
      node.getAttribute("aria-disabled") !== "true");
    const stage = attempt++ % 3;
    if (button && stage === 0) {
      button.click();
      return;
    }
    const renderer = rendererOf(active);
    let next = renderer?.nextElementSibling;
    while (next && !next.matches("ytd-reel-video-renderer")) next = next.nextElementSibling;
    if (next) {
      next.scrollIntoView({ behavior: "instant", block: "start" });
      return;
    }
    // Scroll the real feed container when a click is ignored or no next renderer
    // has been mounted yet. Synthetic keyboard/wheel events aren't trusted input.
    for (let parent = active.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 20) {
        parent.scrollBy({ top: parent.clientHeight, behavior: "instant" });
        return;
      }
    }
    if (button) button.click();
    // Never disable looping: an unavailable next item must not freeze playback.
  }

  function onEnded() { nextShort(); }

  function onTimeUpdate() {
    if (!active) return;
    const time = active.currentTime;
    const now = performance.now();
    // Keep native looping intact, and recognize the natural end-to-start wrap.
    const wrapped = Number.isFinite(active.duration) && active.duration > 0 &&
      previousTime >= active.duration - 0.6 && time < 0.75 &&
      previousTime - time > active.duration / 2 &&
      now - previousSampleAt < 1500 && wasPlaying && !active.paused &&
      !wasSeeking && !active.seeking;
    // Feed players can implement looping by seeking back to zero. Its transient
    // `seeking` state and a throttled source tab must not swallow that loop.
    const adapterWrapped = !!adapter && Number.isFinite(active.duration) && active.duration > 0 &&
      previousTime >= active.duration - 0.75 && time < Math.min(0.75, active.duration * 0.4) &&
      previousTime - time > active.duration / 2 && now - previousSampleAt < 5000 &&
      wasPlaying && !active.paused && now >= manualSeekUntil;
    if ((wrapped && now >= manualSeekUntil) || adapterWrapped || active.ended) nextShort();
    previousTime = time;
    previousSampleAt = now;
    wasPlaying = !active.paused;
    wasSeeking = active.seeking;
  }

  function advancePastUnsupported() {
    if (!canWatch() || performance.now() - lastSkippedAttempt < 1200 ||
      VyroTikTok.blocked(document, visibleArea)) return;
    if (skipAttempts >= 8) {
      pip?.suspend?.(`Chưa bỏ qua được ${skippedKind} · Hãy dùng nút tiếp theo ở tab nguồn`);
      return;
    }
    lastSkippedAttempt = performance.now();
    VyroTikTok.advance({ doc: document, video: sourceVideo(), container: skippedContainer,
      stage: skipAttempts++ % 3, visibleArea, getStyle: getComputedStyle, pathname: location.pathname });
  }

  function handleUnsupportedPost() {
    if (!isTikTok || !canWatch()) return false;
    const source = sourceVideo();
    const sourceContainer = source ? rendererOf(source) : null;
    const routeIsLive = VyroTikTok.isLiveRoute(location.pathname);
    const routeIsPhoto = VyroTikTok.isPhotoRoute(location.pathname);
    const visiblePost = VyroTikTok.visibleNonVideoCard(document, visibleArea);
    const card = visiblePost?.card;
    const sourceIsLive = !VyroTikTok.isVideoRoute(location.pathname) && VyroTikTok.isLive(sourceContainer, source);
    const sourceIsPhoto = VyroTikTok.isPhoto(sourceContainer, source);
    if (!routeIsLive && !routeIsPhoto && !card && !sourceIsLive && !sourceIsPhoto) {
      skippingPost = false;
      skippedTarget = null;
      skipAttempts = 0;
      return false;
    }
    const kind = routeIsPhoto ? "bài ảnh" : routeIsLive ? "LIVE" : visiblePost?.kind || (sourceIsPhoto ? "bài ảnh" : "LIVE");
    if (kind === "bài ảnh" && !hasPip() && !enabled && !pendingManual) {
      skippingPost = false;
      skippedTarget = null;
      skipAttempts = 0;
      return false;
    }
    const target = routeIsLive || routeIsPhoto ? location.pathname : card || source;
    const postLink = card?.querySelector?.('a[href*="/photo/"], a[href*="/video/"], a[href*="/live"]');
    const identity = card?.getAttribute?.('data-id') || card?.getAttribute?.('data-scroll-index') || postLink?.getAttribute?.('href') || "";
    if (target !== skippedTarget || kind !== skippedKind || identity !== skippedIdentity) {
      skippedTarget = target; skippedIdentity = identity; skipAttempts = 0;
    }
    skippedKind = kind;
    skippingPost = true;
    skippedContainer = card || sourceContainer;
    const media = card?.querySelector?.('video') || ((routeIsLive || routeIsPhoto || sourceIsLive || sourceIsPhoto) ? source : null);
    if (media && !media.paused) media.pause?.();
    for (const audio of card?.querySelectorAll?.('audio') || []) audio.pause?.();
    // Handle non-video posts before PiP route checks or player replacement.
    pip?.suspend?.(`Đang bỏ qua ${skippedKind}…`);
    advancePastUnsupported();
    return true;
  }

  function handleFacebookSponsored(manual = false) {
    if (!isFacebook || !isShorts()) { sponsoredSkip = null; return false; }
    if (!canWatch()) return false;
    const video = sourceVideo();
    const container = video && rendererOf(video);
    if (!VyroFacebook.isSponsored(container, visibleArea)) { sponsoredSkip = null; return false; }
    const key = location.pathname + "|" + (video.currentSrc || "");
    if (!sponsoredSkip || sponsoredSkip.container !== container || sponsoredSkip.key !== key) {
      sponsoredSkip = { container, key, attempts: 0 };
    }
    // Cancel the normal clip's listeners/retries before pausing or navigating.
    lastSponsoredAttempt = Math.max(lastSponsoredAttempt, lastAttempt);
    if (active) detach();
    if (!video.paused) video.pause();
    if (pip?.isOpen()) pip.suspend("Đang bỏ qua quảng cáo…");
    if (VyroFacebook.blocked(document, visibleArea)) return true;
    if (manual && sponsoredSkip.attempts >= 8) sponsoredSkip.attempts = 0;
    if (sponsoredSkip.attempts >= 8) {
      if (pip?.isOpen()) pip.suspend("Chưa bỏ qua được quảng cáo · Hãy dùng nút tiếp theo ở tab nguồn");
      return true;
    }
    if (performance.now() - lastSponsoredAttempt < 1200) return true;
    lastSponsoredAttempt = performance.now();
    VyroFacebook.advance({ doc: document, container, stage: sponsoredSkip.attempts++ % 3,
      visibleArea, getStyle: getComputedStyle });
    return true;
  }

  function reconcile() {
    watchPip?.update();
    if (handleFacebookSponsored()) return;
    if (handleUnsupportedPost()) return;
    pip?.update();
    if (!isShorts() || !canWatch()) {
      if (active) detach();
      return;
    }
    const video = currentVideo();
    const key = location.pathname + "|" + (video?.currentSrc || "");
    if (video !== active || key !== activeKey) {
      detach();
      if (video) {
        active = video;
        activeKey = key;
        video.addEventListener("ended", onEnded);
        video.addEventListener("timeupdate", onTimeUpdate);
      }
    }
    if (!active) return;
    if (isAd(active)) return;
    if (!enabled && !pendingManual) return;
    // Also handles a video ending before it was attached / while tab was hidden.
    onTimeUpdate();
    // Keep trying alternate methods until URL/player changes confirm navigation.
    // A manual pause cancels retries; an actual ended player may still retry.
    if (active.paused && !active.ended && !pendingManual) pending = false;
    if (pending && (pendingManual || active.ended || (!active.paused && !active.seeking))) nextShort(pendingManual);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[enabledKey]) {
      enabled = changes[enabledKey].newValue !== false;
      if (!enabled) detach();
      reconcile();
      announceStatus();
    }
    if (area === "local" && changes.shortcut) shortcut = ShortsShortcut.normalize(changes.shortcut.newValue);
  });
  function announceStatus() {
    chrome.runtime.sendMessage({ type: "vyro-tab-state", platform, enabled }).catch(() => {});
  }
  chrome.storage.local.get({ enabled: true, enabledTikTok: true, enabledFacebook: true, shortcut: ShortsShortcut.defaults }).then(settings => {
    enabled = settings[enabledKey] !== false;
    shortcut = ShortsShortcut.normalize(settings.shortcut);
    reconcile();
    announceStatus();
  }).catch(() => { /* Stay disabled when extension context is unavailable. */ });

  document.addEventListener("yt-navigate-finish", reconcile);
  document.addEventListener("visibilitychange", reconcile);
  function onShortcut(event) {
    if (event.repeat || event.isComposing || event.defaultPrevented ||
      (!isShorts() && !(isTikTok && skippingPost)) || !canWatch() ||
      ShortsShortcut.editing(event) || !ShortsShortcut.matches(event, shortcut)) return;
    reconcile();
    if (!canAdvance(true)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    nextShort(true);
  }
  document.addEventListener("keydown", onShortcut, true);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === "shorts-query-pip") {
      respond({ pip: (isShorts() || (isTikTok && skippingPost)) && !!hasPip() });
    } else if (message?.type === "shorts-skip-native") {
      reconcile();
      const ok = !!canAdvance(true);
      if (ok) nextShort(true);
      respond({ ok });
    } else if (message?.type === "vyro-status") {
      respond({ platform, supported: isShorts() || isYouTubeWatch(), enabled,
        pipMode: isYouTubeWatch() ? "native-youtube" : "custom",
        hasVideo: !!(isYouTubeWatch() ? VyroYouTubePip.findVideo(document, getComputedStyle) : currentVideo()) });
    }
  });
  pip = ShortsPip.create({
    isShorts, findVideo: sourceVideo,
    resumeOnSwitch: isFacebook,
    canMountVideo: video => isFacebook ? VyroFacebook.canMount(video) && !VyroFacebook.isSponsored(rendererOf(video), visibleArea) : !isTikTok || (!VyroTikTok.isLiveRoute(location.pathname) && !VyroTikTok.isPhotoRoute(location.pathname) &&
      !VyroTikTok.isLive(VyroTikTok.container(video), video) && !VyroTikTok.isPhoto(VyroTikTok.container(video), video)),
    enabled: () => enabled,
    toggleAuto: () => chrome.storage.local.set({ [enabledKey]: !enabled }).catch(console.warn),
    rendererOf: video => adapter ? adapter.container(video) : video.closest("ytd-reel-video-renderer"),
    identity: () => location.pathname,
    onSeek: () => { manualSeekUntil = performance.now() + 1500; },
    shortcutLabel: () => ShortsShortcut.label(shortcut, /Mac/.test(navigator.platform)),
    skip: () => { reconcile(); nextShort(true); },
    onKey: onShortcut
  });
  pip.update();
  if (!adapter) watchPip = VyroYouTubePip.create();
  document.addEventListener("pointerdown", event => {
    if (event.target?.closest?.('input[type="range"], [role="slider"], [data-e2e*="seek"], [data-e2e*="progress"]')) {
      manualSeekUntil = performance.now() + 1500;
    }
  }, true);
  // A small bounded scan also covers reused players and SPA navigation.
  setInterval(reconcile, 250);
})();
