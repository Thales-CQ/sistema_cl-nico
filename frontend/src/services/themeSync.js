import { getPreferences } from "./api.js";

const SYNC_KEY = "clinic-theme-sync";
const SYNC_INTERVAL = 1000;
const REQUEST_TIMEOUT = 10000;

export function notifyThemeChange(userId) {
  try {
    window.localStorage.setItem(SYNC_KEY, JSON.stringify({
      userId,
      timestamp: Date.now(),
      nonce: Math.random(),
    }));
  } catch {
    // Periodic server synchronization also works when storage is unavailable.
  }
}

export function startThemeSync({
  userId,
  onTheme,
  fetchPreferences = getPreferences,
  windowTarget = window,
  documentTarget = document,
}) {
  let stopped = false;
  let timer;
  let controller;
  let requestTimeout;

  async function refresh() {
    if (stopped || controller) return;
    clearTimeout(timer);
    controller = new AbortController();
    requestTimeout = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT);
    try {
      const data = await fetchPreferences(controller.signal);
      if (stopped || controller.signal.aborted) return;
      const preference = data?.user;
      if (preference?.id === userId && [null, "light", "dark"].includes(preference.theme)) {
        onTheme(preference.theme);
      }
    } catch {
      // Keep the confirmed theme on transient errors and retry automatically.
    } finally {
      clearTimeout(requestTimeout);
      controller = null;
      if (!stopped) timer = setTimeout(refresh, SYNC_INTERVAL);
    }
  }

  function handleVisibility() {
    if (documentTarget.visibilityState === "visible") refresh();
  }

  function handleStorage(event) {
    if (event.key !== SYNC_KEY) return;
    try {
      if (JSON.parse(event.newValue)?.userId === userId) refresh();
    } catch {
      // Ignore unrelated or malformed storage events.
    }
  }

  windowTarget.addEventListener("focus", refresh);
  windowTarget.addEventListener("online", refresh);
  windowTarget.addEventListener("storage", handleStorage);
  documentTarget.addEventListener("visibilitychange", handleVisibility);
  refresh();

  return () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(requestTimeout);
    controller?.abort();
    windowTarget.removeEventListener("focus", refresh);
    windowTarget.removeEventListener("online", refresh);
    windowTarget.removeEventListener("storage", handleStorage);
    documentTarget.removeEventListener("visibilitychange", handleVisibility);
  };
}
