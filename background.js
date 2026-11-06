// background.js — the extension's "service worker".
//
// In Manifest V3 the background script is a service worker: Chrome starts it
// when an event it listens for happens, and shuts it down again when idle.
// It has no DOM and no window. Don't keep state in global variables here;
// it gets wiped whenever the worker is stopped.
//
// For this extension the worker has very little to do, because the redirects
// themselves are handled by Chrome's declarativeNetRequest engine (see
// popup.js). It does two things:
//   1. Adds one example rule the first time the extension is installed.
//   2. Logs to the console every time a rule fires, so you can watch it work.

// --- 1. Seed an example rule on first install ------------------------------
chrome.runtime.onInstalled.addListener(async (details) => {
  // onInstalled also fires on "update" (including every time you click the
  // reload button on chrome://extensions). Only seed on a real first install.
  if (details.reason !== "install") return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { url: "https://www.wikipedia.org/" },
        },
        condition: {
          urlFilter: "||example.com",
          resourceTypes: ["main_frame"],
        },
      },
    ],
  });

  console.log("Installed. Try visiting https://example.com");
});

// --- 2. Log every redirect --------------------------------------------------
// onRuleMatchedDebug only works for unpacked (developer mode) extensions, and
// it needs the "declarativeNetRequestFeedback" permission.
//
// To see this output: open chrome://extensions, find Simple Redirector, and
// click the "service worker" link next to "Inspect views".
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log(
    `Rule #${info.rule.ruleId} matched: ${info.request.url}`
  );
});
