"use strict";

globalThis.VyroYouTubePip = {
  isPage(location) {
    return /^(www\.)?youtube\.com$/.test(location.hostname) && location.pathname === '/watch' &&
      !!new URLSearchParams(location.search || '').get('v')?.trim();
  },
  findVideo(doc, getStyle) {
    // Watch-page previews and recommendation players must never win.
    return [...doc.querySelectorAll('#movie_player video')]
      .filter(video => {
        const style = getStyle(video), rect = video.getBoundingClientRect();
        return video.isConnected !== false && style.display !== 'none' && style.visibility !== 'hidden' &&
          style.opacity !== '0' && rect.right > rect.left && rect.bottom > rect.top;
      })
      .sort((a, b) => Number(b.matches('video.html5-main-video')) - Number(a.matches('video.html5-main-video')))[0] || null;
  },
  create() {
    const api = this;
    let opening = false;
    let message = '', messageVideo = null;
    const observed = new WeakSet();
    const disabledAttributes = new WeakMap();
    const button = document.createElement('button');
    button.id = 'vyro-youtube-pip'; button.type = 'button'; button.hidden = true;
    button.textContent = 'PiP YouTube ↗';
    button.title = 'Mở video YouTube trong cửa sổ nổi của Chrome';
    button.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;border:1px solid #ffffff55;border-radius:24px;background:#bd302a;color:white;padding:12px 18px;font:600 14px system-ui;cursor:pointer;box-shadow:0 4px 18px #0005';
    document.body.append(button);

    const findVideo = () => api.findVideo(document, getComputedStyle);
    function showMessage(text, video) {
      message = text; messageVideo = video;
      button.textContent = text;
    }
    function refresh() { message = ''; update(); }
    function restoreAttribute(video) {
      if (!disabledAttributes.has(video)) return;
      video.setAttribute('disablepictureinpicture', disabledAttributes.get(video));
      disabledAttributes.delete(video);
    }
    function observe(video) {
      if (!video || observed.has(video)) return;
      observed.add(video);
      video.addEventListener('enterpictureinpicture', refresh);
      video.addEventListener('leavepictureinpicture', () => { restoreAttribute(video); refresh(); });
      video.addEventListener('loadedmetadata', refresh);
      video.addEventListener('emptied', refresh);
    }
    function update() {
      button.hidden = !api.isPage(location);
      button.disabled = opening;
      if (button.hidden) return;
      const video = findVideo();
      observe(video);
      if (messageVideo !== video) message = '';
      button.setAttribute('aria-pressed', String(!!video && document.pictureInPictureElement === video));
      if (!opening) button.textContent = message || (video && document.pictureInPictureElement === video ? 'Đóng PiP YouTube' : 'PiP YouTube ↗');
    }
    async function open() {
      if (opening || !api.isPage(location)) return;
      message = '';
      const video = findVideo();
      if (!video) { showMessage('Chưa thấy video · Mở một video trước', video); return; }
      observe(video);
      if (!document.pictureInPictureEnabled || !video.requestPictureInPicture) {
        showMessage('Chrome chưa cho phép PiP trên trang này', video); return;
      }
      if (document.pictureInPictureElement !== video && (video.readyState < 1 || video.videoWidth === 0)) {
        showMessage('Video chưa sẵn sàng · Phát video rồi thử lại', video); return;
      }
      opening = true; button.disabled = true;
      let failed = false;
      try {
        if (document.pictureInPictureElement === video) {
          await document.exitPictureInPicture();
        } else {
          if (video.hasAttribute('disablepictureinpicture') && !disabledAttributes.has(video)) {
            disabledAttributes.set(video, video.getAttribute('disablepictureinpicture'));
            video.removeAttribute('disablepictureinpicture');
          }
          // Request directly from the click handler, while user activation exists.
          await video.requestPictureInPicture();
        }
      } catch (error) {
        failed = true;
        showMessage('Không mở/đóng được PiP · Bấm thử lại', video);
        console.warn('VYRO: YouTube PiP', error);
      } finally {
        if (document.pictureInPictureElement !== video) restoreAttribute(video);
        opening = false; button.disabled = false;
        if (!failed) update();
      }
    }
    button.addEventListener('click', open);
    update();
    return { update, open, findVideo };
  }
};
