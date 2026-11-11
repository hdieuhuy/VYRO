"use strict";
const toggle = document.getElementById("enabled");
const status = document.getElementById("status");
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
    shortcutStatus.textContent = "Đã lưu · Có hiệu lực ngay trên các tab Shorts.";
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
    ? "Đang bật · Áp dụng cho các tab Shorts đang hiển thị."
    : "Đã tắt · Bạn có thể lướt Shorts thủ công.";
};
chrome.storage.local.get({ enabled: true, shortcut: ShortsShortcut.defaults }).then(settings => {
  toggle.checked = settings.enabled !== false;
  toggle.disabled = false;
  shortcut = ShortsShortcut.normalize(settings.shortcut);
  record.disabled = reset.disabled = false;
  showShortcut();
  describe();
}).catch(() => { status.textContent = "Không đọc được cài đặt. Hãy mở lại tiện ích."; });
toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  try {
    await chrome.storage.local.set({ enabled: toggle.checked });
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
