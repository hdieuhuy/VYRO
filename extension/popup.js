"use strict";
const toggle = document.getElementById("enabled");
const status = document.getElementById("status");
const platformSelect = document.getElementById("platform");
let selectedPlatform = "youtube";
let settingsRequest = 0;
let youtubeWatchTab = false;
const pipToggle = document.getElementById("pip-toggle");
const pipStatusText = document.getElementById("pip-control-status");
let pipTabId = null, pipState = null, pipBusy = false, pipRequest = 0, pipError = "";
function renderPip(state) {
  pipState = state;
  const available = state?.pipControl === true;
  const open = available && state.pipOpen === true;
  pipToggle.textContent = open ? "Đóng PiP" : "Mở PiP";
  pipToggle.setAttribute("aria-pressed", String(open));
  pipToggle.disabled = pipBusy || !available || (!open && !state.pipCanOpen);
  pipStatusText.textContent = pipError || (!available
    ? "Chưa kết nối điều khiển PiP. Reload VYRO và tải lại tab."
    : open ? "Tab hiện tại · PiP đang mở."
    : state.pipCanOpen ? "Tab hiện tại · PiP đã đóng."
    : "Mở/phát một video được hỗ trợ để dùng PiP.");
}
async function refreshPip() {
  if (pipTabId === null || pipBusy) return;
  const request = ++pipRequest;
  try {
    const response = await chrome.tabs.sendMessage(pipTabId, { type: "vyro-status" });
    if (request === pipRequest && !pipBusy) renderPip(response);
  } catch {
    if (request === pipRequest && !pipBusy) renderPip(null);
  }
}
pipToggle.addEventListener("click", async () => {
  if (pipBusy || pipToggle.disabled || pipTabId === null) return;
  const desired = !pipState.pipOpen;
  pipBusy = true; pipRequest++; pipError = "";
  pipToggle.disabled = true;
  pipToggle.textContent = desired ? "Đang mở PiP…" : "Đang đóng PiP…";
  try {
    // Invoke directly from this click, before any awaited tab query/message.
    const results = await chrome.scripting.executeScript({
      target: { tabId: pipTabId }, world: "ISOLATED",
      func: open => globalThis.VyroPipController?.setOpen(open) || {
        ok: false, error: "Chưa kết nối điều khiển PiP. Reload VYRO và tải lại tab."
      },
      args: [desired]
    });
    const result = results?.[0]?.result;
    if (!result?.ok) pipError = result?.error || "Chưa điều khiển được PiP. Hãy tải lại tab rồi thử lại.";
    pipBusy = false;
    renderPip(result?.pipControl ? result : pipState);
  } catch {
    pipError = "Chưa có quyền điều khiển PiP. Reload VYRO, kiểm tra quyền và tải lại tab.";
    pipBusy = false; renderPip(pipState);
  }
});
setInterval(refreshPip, 1000);
document.getElementById("build-version").textContent = `Phiên bản ${chrome.runtime.getManifest().version}`;
const enabledKey = () => selectedPlatform === "tiktok" ? "enabledTikTok" : selectedPlatform === "facebook" ? "enabledFacebook" : "enabled";
const platformName = () => selectedPlatform === "tiktok" ? "TikTok" : selectedPlatform === "facebook" ? "Facebook Reels" : "YouTube Shorts";
const record = document.getElementById("record");
const reset = document.getElementById("reset-shortcut");
const value = document.getElementById("shortcut-value");
const shortcutStatus = document.getElementById("shortcut-status");
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
let shortcut = ShortsShortcut.normalize();
let recording = false;
let saving = false;
chrome.commands.getAll().then(commands => {
  const command = commands.find(item => item.name === "skip-short");
  document.getElementById("native-shortcut").textContent = command?.shortcut || "Chưa gán · Bấm đổi phím bên dưới";
}).catch(() => {
  document.getElementById("native-shortcut").textContent = "Xem trong cài đặt phím Chrome";
});
document.getElementById("chrome-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(console.warn);
});
function showShortcut() {
  record.setAttribute("aria-pressed", String(recording));
  value.textContent = recording ? "Nhấn tổ hợp phím…" : ShortsShortcut.label(shortcut, mac);
}
async function saveShortcut(next) {
  saving = true;
  recording = false;
  record.disabled = reset.disabled = true;
  showShortcut();
  try {
    await chrome.storage.local.set({ shortcut: next });
    shortcut = next;
    shortcutStatus.textContent = "Đã lưu · Dùng chung cho YouTube Shorts, TikTok và Facebook Reels.";
  } catch {
    shortcutStatus.textContent = "Chưa lưu được phím tắt. Vui lòng thử lại.";
  } finally {
    saving = false;
    record.disabled = reset.disabled = false;
    showShortcut();
  }
}
const describe = () => {
  status.textContent = toggle.checked
    ? `Đang bật · Tự chuyển video ${platformName()} khi kết thúc.`
    : `Đã tắt tự chuyển ${platformName()} · Skip và PiP vẫn dùng được.`;
  if (youtubeWatchTab && selectedPlatform === "youtube") status.textContent += " Công tắc này áp dụng cho Shorts; video YouTube thường dùng PiP gốc Chrome.";
  if (selectedPlatform === "facebook") status.textContent += " Tự bỏ qua Reel được tài trợ luôn bật.";
};
async function loadSettings() {
  const request = ++settingsRequest;
  const key = enabledKey();
  toggle.disabled = true;
  try {
    const settings = await chrome.storage.local.get({ enabled: true, enabledTikTok: true, enabledFacebook: true, shortcut: ShortsShortcut.defaults });
    if (request !== settingsRequest) return;
    toggle.checked = settings[key] !== false;
    toggle.disabled = false;
    shortcut = ShortsShortcut.normalize(settings.shortcut);
    record.disabled = reset.disabled = false;
    showShortcut();
    describe();
  } catch { status.textContent = "Không đọc được cài đặt. Hãy mở lại tiện ích."; }
}
async function initialize() {
  const connection = document.getElementById("connection-status");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "vyro-status" });
      if (["youtube", "tiktok", "facebook"].includes(response?.platform)) {
        pipTabId = tab.id;
        renderPip(response);
        selectedPlatform = response.platform;
        youtubeWatchTab = response.pipMode === "native-youtube";
        connection.textContent = response.supported === false
          ? "Tab đã kết nối · PiP chưa hỗ trợ loại trang này. Hãy mở một video."
          : youtubeWatchTab ? "Tab đã kết nối · Video YouTube thường (PiP gốc Chrome): dùng Mở PiP/Đóng PiP bên dưới."
          : "Tab đã kết nối · Dùng Mở PiP/Đóng PiP bên dưới.";
      } else throw new Error("No supported content script response");
    } else {
      throw new Error("No active tab");
    }
  } catch {
    renderPip(null);
    connection.textContent = "Chưa kết nối được với tab. Nếu đang mở YouTube/TikTok/Facebook: Reload VYRO tại chrome://extensions, cho phép truy cập website và tải lại tab.";
  }
  platformSelect.value = selectedPlatform;
  platformSelect.disabled = false;
  await loadSettings();
}
initialize();
platformSelect.addEventListener("change", () => {
  selectedPlatform = ["youtube", "tiktok", "facebook"].includes(platformSelect.value) ? platformSelect.value : "youtube";
  loadSettings();
});
toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  try {
    await chrome.storage.local.set({ [enabledKey()]: toggle.checked });
    describe();
  } catch {
    toggle.checked = !toggle.checked;
    status.textContent = "Chưa lưu được. Vui lòng thử lại.";
  } finally {
    toggle.disabled = false;
  }
});
record.addEventListener("click", () => {
  if (saving) return;
  recording = !recording;
  shortcutStatus.textContent = recording ? "Nhấn tổ hợp mới. Esc hoặc Tab để hủy." : "Đã hủy đổi phím.";
  showShortcut();
});
reset.addEventListener("click", () => { if (!saving) saveShortcut(ShortsShortcut.normalize()); });
document.addEventListener("keydown", event => {
  if (!recording || saving) return;
  if (event.code === "Tab") {
    recording = false;
    shortcutStatus.textContent = "Đã hủy đổi phím.";
    showShortcut();
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.code === "Escape") {
    recording = false;
    shortcutStatus.textContent = "Đã hủy đổi phím.";
    showShortcut();
    return;
  }
  if (event.repeat || event.isComposing) return;
  const next = ShortsShortcut.fromEvent(event);
  if (!next) {
    shortcutStatus.textContent = "Giữ Ctrl, Alt hoặc Win/⌘ và nhấn thêm một phím.";
    return;
  }
  saveShortcut(next);
}, true);
