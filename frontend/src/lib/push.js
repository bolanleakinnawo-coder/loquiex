import api from "../api/axios";

// Phone notifications (Web Push). The service worker (public/push-sw.js)
// shows them, even when Loquiex is closed.
//
// States:
//   "unsupported"   this browser can't receive push
//   "needs-install" iPhone/iPad: add Loquiex to the Home Screen first
//                   (iOS 16.4 or later), then open it from there
//   "denied"        the member blocked notifications in browser settings
//   "off"           allowed to ask, not turned on yet
//   "on"            this device is subscribed

export function isIos() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  return (
    /iPhone|iPad|iPod|iOS/i.test(`${navigator.userAgent} ${platform}`) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}

function hasPushApis() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// The service worker that shows notifications. On a first visit it may still
// be installing, so wait for it (briefly) instead of giving up.
async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  let existing = await navigator.serviceWorker.getRegistration();
  if (!existing) {
    // vite-plugin-pwa normally registers it on load; register it ourselves
    // if that hasn't happened yet.
    existing = await navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => null);
    if (!existing) return null;
  }
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);
  return ready || existing;
}

export async function getPushState() {
  if (isIos() && !isStandalone()) return "needs-install";
  if (!hasPushApis()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await getRegistration();
  if (!registration) return "unsupported";
  const sub = await registration.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Must be called from a tap. Safari (iPhone especially) only shows the
// permission pop-up when it is asked straight away inside the tap, before
// anything else is awaited, so the request comes first.
export async function enablePush() {
  if (isIos() && !isStandalone()) return "needs-install";
  if (!hasPushApis()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "off";
  }
  const registration = await getRegistration();
  if (!registration) return "unsupported";
  const { data } = await api.get("/api/push/public-key");
  if (!data?.enabled || !data.publicKey) {
    throw new Error("Notifications aren't available right now.");
  }
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
  return "on";
}

export async function disablePush() {
  const registration = await getRegistration().catch(() => null);
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return "off";
  try {
    await api.post("/api/push/unsubscribe", { endpoint: sub.endpoint });
  } finally {
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

// Re-sends this device's subscription after sign-in, so reminders go to
// whoever is signed in on it now.
export async function refreshPushSubscription() {
  try {
    if ((await getPushState()) !== "on") return;
    const registration = await getRegistration();
    const sub = await registration.pushManager.getSubscription();
    if (sub) await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
  } catch {
    // Not important enough to bother the member about.
  }
}

// Round 22 (Sheriff): phone reminders are on by default. The member can
// turn them off on Profile > Notifications, and then they stay off on this
// device. The browser always asks "Allow notifications?" itself the first
// time; it only lets an app ask straight after a tap, so we ask on the
// member's first tap in the app (once per device). If they allowed it
// before (e.g. before logging out), it turns back on without asking.
const PUSH_OFF_KEY = "loquiex.pushOff";
const PUSH_ASKED_KEY = "loquiex.pushAsked";

function readFlag(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key, on) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to remember.
  }
}

export function setPushTurnedOff(off) {
  writeFlag(PUSH_OFF_KEY, off);
}

let autoStarted = false;
export async function autoEnablePush() {
  if (autoStarted) return;
  autoStarted = true;
  if (readFlag(PUSH_OFF_KEY)) return;
  let state;
  try {
    state = await getPushState();
  } catch {
    return;
  }
  if (state === "on") {
    refreshPushSubscription();
    return;
  }
  if (state !== "off") return;
  if (Notification.permission === "granted") {
    enablePush().catch(() => {});
    return;
  }
  if (Notification.permission !== "default" || readFlag(PUSH_ASKED_KEY)) return;
  const onFirstTap = () => {
    document.removeEventListener("click", onFirstTap, true);
    if (readFlag(PUSH_OFF_KEY)) return;
    writeFlag(PUSH_ASKED_KEY, true);
    // Asked inside the tap, before anything else is awaited (Safari).
    enablePush().catch(() => {});
  };
  document.addEventListener("click", onFirstTap, true);
}

export function sendTestPush() {
  return api.post("/api/push/test");
}
