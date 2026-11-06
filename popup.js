// popup.js — runs inside popup.html each time you open the popup.
//
// The popup lives only while it's open. Close it and this script stops, with
// all its variables gone. So nothing important is stored here. The redirect
// rules live inside Chrome itself (as "dynamic rules"), which persist across
// browser restarts.
//
// How redirects work:
// We don't intercept requests with our own code. We hand Chrome a list of
// declarative rules ("if the URL matches X, redirect to Y") through the
// chrome.declarativeNetRequest API, and Chrome applies them itself. That's
// fast, and the extension never gets to read your browsing traffic.

const dnr = chrome.declarativeNetRequest;

const form = document.getElementById("add-form");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const errorEl = document.getElementById("error");
const listEl = document.getElementById("rule-list");
const emptyEl = document.getElementById("empty");

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------

// "https://www.YouTube.com/" -> "youtube.com"
// "reddit.com/r/all"          -> "reddit.com/r/all"   (paths are kept)
function normalizeSource(raw) {
  let s = raw.trim();
  s = s.replace(/^[a-z]+:\/\//i, ""); // drop "https://"
  s = s.replace(/^www\./i, "");       // drop "www."
  s = s.replace(/\/+$/, "");          // drop trailing "/"
  const slash = s.indexOf("/");
  const host = (slash === -1 ? s : s.slice(0, slash)).toLowerCase();
  const path = slash === -1 ? "" : s.slice(slash);
  return host + path;
}

// "google.com" -> URL object for "https://google.com/"
function parseTarget(raw) {
  let t = raw.trim();
  if (!/^[a-z]+:\/\//i.test(t)) t = "https://" + t;
  const url = new URL(t); // throws if the URL is invalid
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Target must be an http or https URL.");
  }
  return url;
}

// If the target itself matches the source rule, the browser would redirect
// forever (Chrome eventually gives up with "too many redirects").
function wouldLoop(source, targetUrl) {
  const slash = source.indexOf("/");
  const srcHost = slash === -1 ? source : source.slice(0, slash);
  const srcPath = slash === -1 ? "" : source.slice(slash);

  const host = targetUrl.hostname;
  const sameSite = host === srcHost || host.endsWith("." + srcHost);
  return sameSite && targetUrl.pathname.startsWith(srcPath);
}

// ---------------------------------------------------------------------------
// Rule building
// ---------------------------------------------------------------------------

function buildRule(id, source, targetUrl) {
  return {
    id, // must be a unique integer >= 1
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: targetUrl.href },
    },
    condition: {
      // "||" means "this domain or any subdomain". So "||youtube.com" matches
      // youtube.com, www.youtube.com, m.youtube.com, and so on.
      urlFilter: "||" + source,

      // Only redirect top-level page loads (what's in the address bar).
      // Without this, images, scripts, and iframes from that domain embedded
      // in *other* sites would also be redirected, which breaks those pages.
      resourceTypes: ["main_frame"],
    },
  };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

async function render() {
  const rules = await dnr.getDynamicRules();

  listEl.replaceChildren(); // clear the list
  emptyEl.hidden = rules.length > 0;

  for (const rule of rules) {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.className = "rule-text";
    // textContent (not innerHTML) so a weird URL can never inject HTML.
    text.textContent =
      rule.condition.urlFilter.replace(/^\|\|/, "") +
      "  →  " +
      rule.action.redirect.url;

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "✕";
    del.title = "Remove";
    del.addEventListener("click", async () => {
      await dnr.updateDynamicRules({ removeRuleIds: [rule.id] });
      render();
    });

    li.append(text, del);
    listEl.append(li);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the form from reloading the popup
  errorEl.textContent = "";

  try {
    const source = normalizeSource(fromInput.value);
    if (!source || /\s/.test(source)) {
      throw new Error("Enter a site like youtube.com");
    }

    const targetUrl = parseTarget(toInput.value);
    if (wouldLoop(source, targetUrl)) {
      throw new Error("That would redirect to itself forever.");
    }

    // Pick an id one higher than the largest one in use.
    const existing = await dnr.getDynamicRules();
    const nextId = Math.max(0, ...existing.map((r) => r.id)) + 1;

    await dnr.updateDynamicRules({
      addRules: [buildRule(nextId, source, targetUrl)],
    });

    form.reset();
    fromInput.focus();
    render();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

render();
