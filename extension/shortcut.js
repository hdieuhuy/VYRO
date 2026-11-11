"use strict";
globalThis.ShortsShortcut = (() => {
  const defaults = Object.freeze({ code: "Slash", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false });
  const modifierCodes = new Set(["MetaLeft", "MetaRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "OSLeft", "OSRight"]);
  function fromEvent(event) {
    if (!event.code || modifierCodes.has(event.code) || ["Escape", "Tab"].includes(event.code) ||
      !(event.metaKey || event.ctrlKey || event.altKey)) return null;
    return { code: event.code, metaKey: !!event.metaKey, ctrlKey: !!event.ctrlKey,
      altKey: !!event.altKey, shiftKey: !!event.shiftKey };
  }
  function normalize(value) {
    if (!value || typeof value.code !== "string") return { ...defaults };
    return fromEvent(value) || { ...defaults };
  }
  function matches(event, shortcut) {
    return event.code === shortcut.code && ["metaKey", "ctrlKey", "altKey", "shiftKey"]
      .every(key => !!event[key] === shortcut[key]);
  }
  function label(shortcut, mac = false) {
    const keys = [];
    if (shortcut.ctrlKey) keys.push("Ctrl");
    if (shortcut.altKey) keys.push(mac ? "Option" : "Alt");
    if (shortcut.shiftKey) keys.push("Shift");
    if (shortcut.metaKey) keys.push(mac ? "⌘" : "Win");
    const labels = { Slash: "/", Backslash: "\\", Space: "Space", Period: ".", Comma: ",", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]", Minus: "-", Equal: "=", Backquote: "`" };
    keys.push(labels[shortcut.code] || shortcut.code.replace(/^(Key|Digit|Arrow)/, ""));
    return keys.join(" + ");
  }
  function editing(event) {
    return (event.composedPath?.() || [event.target]).some(node =>
      node?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(node?.tagName) ||
      node?.getAttribute?.("role") === "textbox");
  }
  return { defaults, fromEvent, normalize, matches, label, editing };
})();
