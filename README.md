# Simple Redirector

A small Chrome extension that sends you from one website to another, for
example `youtube.com` → `https://www.google.com`. It's meant for learning how
extensions work, so the code is commented throughout.

## Load it into Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this folder
4. Pin the extension: click the puzzle-piece icon in the toolbar, then the pin

An example rule is added on install. Visit `https://example.com` in a **new
tab** and you'll land on Wikipedia. Delete it from the popup when you're done.

> **After editing code:** click the ↻ reload icon on the extension's card in
> `chrome://extensions`. Then close and reopen the popup.

## The files

| File | What it is |
|---|---|
| `manifest.json` | The extension's ID card. Tells Chrome the name, the permissions it needs, and which files are the popup and background script. Every extension has one. |
| `popup.html` / `popup.css` / `popup.js` | The little window that opens when you click the icon. Lets you add and delete redirects. |
| `background.js` | The service worker. Runs in the background when events happen. Here it adds the example rule on install and logs matches. |

## How the redirect actually works

Chrome has an API called **declarativeNetRequest** (DNR). Instead of your code
looking at every request, you give Chrome a list of rules and Chrome applies
them itself:

```js
{
  id: 1,
  action:    { type: "redirect", redirect: { url: "https://www.google.com/" } },
  condition: { urlFilter: "||youtube.com", resourceTypes: ["main_frame"] }
}
```

- `urlFilter: "||youtube.com"` matches youtube.com and any subdomain
  (`www.`, `m.`, …).
- `resourceTypes: ["main_frame"]` means only the page in the address bar is
  redirected, not YouTube videos embedded inside other sites.
- The popup adds rules with `chrome.declarativeNetRequest.updateDynamicRules()`.
  "Dynamic" rules are saved by Chrome and survive browser restarts, so the
  extension doesn't need its own storage.

## Permissions, and the scary install warning

```json
"permissions": ["declarativeNetRequest", "declarativeNetRequestFeedback"],
"host_permissions": ["<all_urls>"]
```

- `declarativeNetRequest` lets the extension register rules.
- `host_permissions: <all_urls>` is required because **redirecting** a request
  needs permission for that site. (Blocking doesn't, but redirecting does.)
  Without it the rules install fine and then silently never fire. Because
  you can type any site into the popup, it asks for all sites. Chrome will
  describe this as "read and change all your data on all websites."
- `declarativeNetRequestFeedback` is only for the debug log below.

## Watching it work (debugging)

- **Background logs:** on `chrome://extensions`, click the **service worker**
  link on the extension's card. Each redirect prints a line like
  `Rule #1 matched: https://example.com/`.
- **Popup logs:** right-click inside the open popup and choose **Inspect**.
- **Errors:** an **Errors** button appears on the extension's card if anything
  throws.

## Gotchas

- A tab that's already open won't redirect until you navigate it again
  (reload, or type the URL).
- Redirecting a site to itself would loop forever. The popup refuses those.
- Extension pages can't run inline JavaScript (no `onclick="..."`, no
  `<script>` with code inside). Everything lives in `popup.js`.

## Ideas for next steps

1. **Keep the path.** Right now `youtube.com/watch?v=abc` → `google.com/`.
   Try `regexFilter` + `regexSubstitution` in the rule's condition/action so
   `old.com/anything` → `new.com/anything`.
2. **On/off switch** per rule. Hint: remove the rule but remember it in
   `chrome.storage.local`, then add it back when switched on.
3. **Edit** an existing rule instead of delete-and-re-add.
4. **Badge count:** use `chrome.action.setBadgeText()` to show how many rules
   are active on the toolbar icon.
