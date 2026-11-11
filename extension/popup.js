"use strict";
const toggle = document.getElementById("enabled");
const status = document.getElementById("status");
const platformSelect = document.getElementById("platform");
let selectedPlatform = "youtube";
let settingsRequest = 0;
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
        selectedPlatform = response.platform;
        connection.textContent = response.supported === false
          ? "Tab đã kết nối · PiP chưa hỗ trợ loại trang này. Hãy mở một video."
          : "Tab đã kết nối · Nút PiP riêng nằm ở góc dưới bên phải trang video.";
      } else throw new Error("No supported content script response");
    } else {
      throw new Error("No active tab");
    }
  } catch {
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
