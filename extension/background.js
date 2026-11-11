"use strict";

// Global color represents the saved ON/OFF setting, including after Chrome restarts.
async function refreshIcon() {
  const { enabled = true } = await chrome.storage.local.get({ enabled: true });
  const state = enabled !== false ? "on" : "off";
  await chrome.action.setIcon({ path: Object.fromEntries(
    [16, 24, 32, 48, 128].map(size => [size, `icons/${state}-${size}.png`])
  ) });
  await chrome.action.setTitle({ title: `VYRO · ${state === "on" ? "Đang bật" : "Đã tắt"}` });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "vyro-tab-state" || !Number.isInteger(sender.tab?.id) ||
    !["youtube", "tiktok"].includes(message.platform) || typeof message.enabled !== "boolean") return;
  const state = message.enabled ? "on" : "off";
  const label = message.platform === "tiktok" ? "TikTok" : "YouTube Shorts";
  Promise.all([
    chrome.action.setIcon({ tabId: sender.tab.id, path: Object.fromEntries(
      [16, 24, 32, 48, 128].map(size => [size, `icons/${state}-${size}.png`])
    ) }),
    chrome.action.setTitle({ tabId: sender.tab.id, title: `VYRO · ${label} · ${message.enabled ? "Đang bật" : "Đã tắt"}` })
  ]).catch(console.warn);
});

chrome.runtime.onInstalled.addListener(() => { refreshIcon().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { refreshIcon().catch(console.error); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) refreshIcon().catch(console.error);
});
refreshIcon().catch(console.error);

async function skipFromChrome(command, commandTab) {
  if (command !== "skip-short") return;
  const tabs = await chrome.tabs.query({});
  // Probe the actual documents instead of assuming the focused tab owns PiP.
  // No tabs permission is needed to obtain tab IDs or message our content scripts.
  const owners = await Promise.all(tabs.filter(tab => Number.isInteger(tab.id)).map(async tab => {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "shorts-query-pip" });
      return response?.pip ? tab.id : null;
    } catch { return null; }
  }));
  const pipTab = owners.find(id => id !== null);
  if (pipTab !== undefined) {
    await chrome.tabs.sendMessage(pipTab, { type: "shorts-skip-native" });
    return;
  }
  const candidates = commandTab?.id !== undefined ? [commandTab] : await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  for (const tab of candidates) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "shorts-skip-native" }); } catch { /* Not a loaded supported tab. */ }
  }
}
chrome.commands.onCommand.addListener((command, tab) => {
  skipFromChrome(command, tab).catch(console.warn);
});
