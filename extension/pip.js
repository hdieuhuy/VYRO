"use strict";
globalThis.ShortsPip = {
  create(options) {
    let floating = null;
    let moved = null;
    let opening = false;
    let controls = null;
    let audioPreference = null;
    let waitingForVideo = false;
    let notice = null;
    // YouTube rewrites player geometry after loading a new source. Keep the
    // actual video box pinned to the PiP viewport, including reused players.
    const centeredStyle = {
      display: "block", position: "absolute", inset: "0px",
      top: "0px", right: "0px", bottom: "0px", left: "0px",
      width: "100%", height: "100%", "min-width": "0px", "min-height": "0px",
      "max-width": "100%", "max-height": "100%",
      "object-fit": "contain", "object-position": "50% 50%",
      transform: "none", "transform-origin": "50% 50%",
      translate: "none", rotate: "none", scale: "none", zoom: "1",
      margin: "0px", padding: "0px", border: "0px", "box-sizing": "border-box"
    };
    function centerVideo() {
      const video = moved?.video;
      if (!video || !floating || floating.closed) return;
      // Do not observe our own repairs; Chrome can normalize CSS shorthand values.
      moved.fitObserver.disconnect();
      for (const [property, value] of Object.entries(centeredStyle)) {
        if (video.style.getPropertyValue(property) !== value || video.style.getPropertyPriority(property) !== "important") {
          video.style.setProperty(property, value, "important");
        }
      }
      moved.fitObserver.observe(video, { attributes: true, attributeFilter: ["style", "class", "width", "height"] });
    }
    const icons = {
      play: ["M8 5l11 7-11 7z"],
      pause: ["M8 5v14", "M16 5v14"],
      volume: ["M11 5L6 9H3v6h3l5 4z", "M15 8a6 6 0 010 8", "M18 5a10 10 0 010 14"],
      muted: ["M11 5L6 9H3v6h3l5 4z", "M16 9l5 6", "M21 9l-5 6"],
      auto: ["M17 2l4 4-4 4", "M3 11V9a3 3 0 013-3h15", "M7 22l-4-4 4-4", "M21 13v2a3 3 0 01-3 3H3"],
      return: ["M13 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-8", "M15 3h6v6", "M21 3l-9 9"],
      skip: ["M5 5l10 7-10 7z", "M19 5v14"]
    };
    function setIcon(button, name, label) {
      button.title = label;
      button.setAttribute("aria-label", label);
      if (button.getAttribute("data-icon") === name) return;
      const doc = button.ownerDocument;
      const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(key, value);
      for (const d of icons[name]) {
        const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.append(path);
      }
      button.replaceChildren(svg);
      button.setAttribute("data-icon", name);
    }
    const launch = document.createElement("button");
    launch.textContent = "PiP riêng ↗";
    launch.title = "Mở cửa sổ nổi với nút Skip và phím tắt riêng";
    launch.style.cssText = "position:fixed;right:100px;bottom:24px;z-index:2147483647;border:1px solid #ffffff55;border-radius:24px;background:#bd302a;color:white;padding:12px 18px;font:600 14px system-ui;cursor:pointer;box-shadow:0 4px 18px #0005";
    document.body.append(launch);

    function restore() {
      if (!moved) return;
      const { video, marker, style } = moved;
      moved.fitObserver.disconnect();
      video.removeEventListener("loadedmetadata", centerVideo);
      video.removeEventListener("loadeddata", centerVideo);
      video.removeEventListener("resize", centerVideo);
      if (style === null) video.removeAttribute("style");
      else video.setAttribute("style", style);
      if (marker.isConnected) marker.replaceWith(video);
      else { video.pause(); video.remove(); }
      moved = null;
    }

    function mount(video) {
      if (!video || video === moved?.video || !floating || floating.closed) return;
      restore();
      const marker = document.createElement("div");
      marker.setAttribute("data-vyro-pip-marker", "true");
      marker.textContent = "Đang xem trong PiP riêng";
      marker.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;background:#151515;color:#eee;font:16px system-ui";
      const renderer = options.rendererOf ? options.rendererOf(video) : video.closest("ytd-reel-video-renderer");
      const style = video.getAttribute("style");
      video.before(marker);
      const fitObserver = new MutationObserver(centerVideo);
      moved = { video, marker, renderer, style, fitObserver, identity: options.identity?.() };
      floating.document.getElementById("stage").append(video);
      centerVideo();
      video.addEventListener("loadedmetadata", centerVideo);
      video.addEventListener("loadeddata", centerVideo);
      video.addEventListener("resize", centerVideo);
    }

    function suspend(message) {
      waitingForVideo = true;
      if (moved?.video && !moved.video.paused) moved.video.pause();
      if (controls) controls.help.textContent = message;
      if (notice) { notice.textContent = message; notice.hidden = false; }
    }

    function update() {
      launch.hidden = !options.isShorts();
      if (!floating || floating.closed) return;
      if (!options.isShorts()) { floating.close(); return; }
      // YouTube may reuse a player or activate a different preloaded video.
      const candidate = options.findVideo();
      if (candidate && options.canMountVideo && !options.canMountVideo(candidate)) {
        suspend("Đang tìm clip tiếp theo…");
        return;
      }
      const candidateRenderer = candidate && (options.rendererOf ? options.rendererOf(candidate) : candidate.closest("ytd-reel-video-renderer"));
      const oldStillActive = moved?.renderer?.hasAttribute("is-active");
      if (candidate && (!options.canMountVideo || options.canMountVideo(candidate)) && candidate !== moved?.video &&
        (!oldStillActive || candidateRenderer?.hasAttribute("is-active"))) {
        const resume = options.resumeOnSwitch && moved?.video && (!moved.video.paused || moved.video.ended);
        if (options.resumeOnSwitch && moved?.video && !moved.video.paused) moved.video.pause();
        mount(candidate);
        if (resume) candidate.play().catch(() => {});
      }
      const video = moved?.video;
      if (!video || !controls) return;
      if (options.canMountVideo && !options.canMountVideo(video)) {
        suspend("Đang tìm clip tiếp theo…");
        return;
      }
      if (waitingForVideo) {
        if (!candidate) return;
        waitingForVideo = false;
        video.play().catch(() => {});
      }
      if (notice) {
        const loading = video.readyState < 2 || (video.videoWidth === 0 && video.videoHeight === 0);
        notice.hidden = !loading;
        if (loading) notice.textContent = "Đang tải clip tiếp theo…";
      }
      centerVideo();
      if (audioPreference) {
        if (video.muted !== audioPreference.muted) video.muted = audioPreference.muted;
      }
      setIcon(controls.play, video.paused ? "play" : "pause", video.paused ? "Phát" : "Tạm dừng");
      setIcon(controls.mute, video.muted ? "muted" : "volume", video.muted ? "Bật tiếng" : "Tắt tiếng");
      setIcon(controls.auto, "auto", options.enabled() ? "Tự chuyển: Bật · Bấm để tắt" : "Tự chuyển: Tắt · Bấm để bật");
      controls.auto.setAttribute("aria-pressed", String(options.enabled()));
      controls.help.textContent = `${options.shortcutLabel()} · Skip`;
      const duration = video.duration;
      const valid = Number.isFinite(duration) && duration > 0;
      controls.seek.disabled = !valid;
      if (valid) controls.seek.value = String(Math.round(video.currentTime / duration * 1000));
      const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
      controls.time.textContent = valid ? `${format(video.currentTime)} / ${format(duration)}` : "Đang tải…";
    }

    async function open() {
      if (floating && !floating.closed) { floating.focus(); return; }
      if (opening) return;
      const video = options.findVideo();
      if (!video) {
        launch.textContent = "Chưa thấy video · Mở hoặc phát clip trước";
        launch.title = "Trên Explore/tìm kiếm, bấm mở một clip hoặc rê chuột để video bắt đầu phát, rồi bấm PiP lại.";
        return;
      }
      if (options.canMountVideo && !options.canMountVideo(video)) {
        launch.textContent = "Đang chờ clip thường · Thử lại sau khi chuyển clip";
        return;
      }
      if (!globalThis.documentPictureInPicture?.requestWindow) {
        launch.textContent = "Chrome chưa hỗ trợ PiP riêng";
        return;
      }
      opening = true;
      try {
        floating = await globalThis.documentPictureInPicture.requestWindow({ width: 380, height: 650 });
        const doc = floating.document;
        doc.title = "Shorts · PiP riêng";
        const style = doc.createElement("style");
        style.textContent = `
          :root{color-scheme:dark;font:13px/1.4 system-ui;background:#121212;color:#f9f9f9}
          *{box-sizing:border-box}body{margin:0;height:100dvh;overflow:hidden;position:relative}
          #stage{position:absolute;inset:0;min-width:0;min-height:0;background:#000;overflow:hidden}
          #pip-notice{position:absolute;inset:0;z-index:2;display:grid;place-items:center;text-align:center;padding:24px;background:#111d;color:#eee;font:13px/1.5 system-ui;pointer-events:none}
          #pip-notice[hidden]{display:none}
          footer{position:absolute;z-index:3;inset:auto 0 0;padding:40px 14px 12px;display:grid;gap:8px;background:linear-gradient(transparent,rgba(0,0,0,.78) 42%,rgba(0,0,0,.88));opacity:0;pointer-events:none;transform:translateY(5px);transition:opacity 150ms ease-out,transform 150ms ease-out}
          body:hover footer,footer:has(:focus-visible){opacity:1;pointer-events:auto;transform:translateY(0)}
          .row{display:flex;align-items:center;justify-content:space-between;gap:8px}
          button{position:relative;display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;padding:8px;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;transition:background 120ms ease-out,color 120ms ease-out}
          button svg{width:20px;height:20px;pointer-events:none}button:hover{background:#ffffff26}button:active{background:#ffffff40}
          #skip{background:#fff;color:#171717}#skip:hover{background:#e1e1e1}
          #auto[aria-pressed=true]{color:#7de4bc;background:#7de4bc18}#auto[aria-pressed=true]::after{content:"";position:absolute;bottom:2px;width:3px;height:3px;border-radius:50%;background:currentColor}
          #seek{display:block;width:100%;height:16px;margin:0;accent-color:#f66b65;cursor:pointer}
          #time,#help{font-size:10px;color:#e0e0e0;white-space:nowrap}#help{margin-left:auto;opacity:.8}
          button:focus-visible,input:focus-visible{outline:2px solid #83baff;outline-offset:2px}
          @media(prefers-reduced-motion:reduce){footer,button{transition:none}}`;
        doc.head.append(style);
        const stage = doc.createElement("div");
        stage.id = "stage";
        notice = doc.createElement("div");
        notice.id = "pip-notice";
        notice.hidden = true;
        notice.setAttribute("role", "status");
        notice.setAttribute("aria-live", "polite");
        stage.append(notice);
        const footer = doc.createElement("footer");
        const seek = doc.createElement("input");
        seek.id = "seek"; seek.type = "range"; seek.min = "0"; seek.max = "1000"; seek.step = "1";
        seek.setAttribute("aria-label", "Tua video");
        const row = doc.createElement("div"); row.className = "row";
        function button(id, label, icon, action, parent = row) {
          const node = doc.createElement("button"); node.id = id; node.type = "button";
          setIcon(node, icon, label);
          node.addEventListener("click", action); parent.append(node); return node;
        }
        const play = button("play", "Phát", "play", () => {
          const video = moved?.video;
          if (!video) return;
          if (video.paused) video.play().catch(() => {}); else video.pause();
          update();
        });
        const mute = button("mute", "Tắt tiếng", "volume", () => {
          if (moved) {
            moved.video.muted = !moved.video.muted;
            if (!moved.video.muted && moved.video.volume === 0) moved.video.volume = 1;
            audioPreference = { muted: moved.video.muted };
          }
          update();
        });
        button("skip", "Skip · Video tiếp theo", "skip", () => { options.skip(); });
        const auto = button("auto", "Tự chuyển", "auto", () => options.toggleAuto());
        button("return", "Về tab", "return", () => { window.focus(); floating?.close(); });
        const info = doc.createElement("div"); info.className = "row";
        const time = doc.createElement("span"); time.id = "time";
        const help = doc.createElement("span"); help.id = "help";
        info.append(time, help);
        footer.append(seek, row, info);
        doc.body.append(stage, footer);
        seek.addEventListener("input", () => {
          options.onSeek?.();
          if (moved && Number.isFinite(moved.video.duration)) moved.video.currentTime = moved.video.duration * Number(seek.value) / 1000;
        });
        doc.addEventListener("keydown", options.onKey, true);
        floating.addEventListener("resize", centerVideo);
        floating.addEventListener("pagehide", () => {
          restore(); floating = null; controls = null; audioPreference = null; waitingForVideo = false; notice = null;
          launch.textContent = "PiP riêng ↗";
        }, { once: true });
        controls = { play, mute, auto, seek, time, help };
        mount(video);
        update();
        launch.textContent = "Đang mở PiP riêng";
      } catch (error) {
        floating?.close();
        floating = null;
        restore();
        launch.textContent = "Không mở được PiP · Bấm thử lại";
        console.warn("Shorts Auto Next: không mở được PiP", error);
      } finally { opening = false; }
    }
    launch.addEventListener("click", open);
    return {
      update,
      suspend,
      isOpen: () => !!floating && !floating.closed,
      video: () => moved?.video || null,
      renderer: () => moved?.renderer || null,
      anchor: () => moved?.marker || null,
      sourceIdentity: () => moved?.identity
    };
  }
};
