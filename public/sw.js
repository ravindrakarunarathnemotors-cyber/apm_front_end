// Service worker for push notifications. Place this file at:  public/sw.js   (it must be served from the site root: /sw.js)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }

  const title = data.title || "New notification";
  event.waitUntil((async () => {
    // tell open tabs so they can play a beep (a tab that is already open can make its own sound)
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    tabs.forEach((c) => c.postMessage({ type: "PUSH_RECEIVED", title }));
    await self.registration.showNotification(title, {
      body: data.body || "",
      icon: data.icon || "/favicon.ico",
      badge: data.badge || "/favicon.ico",
      tag: data.tag || undefined,          // same tag = replaces the previous one instead of stacking
      renotify: !!data.tag,
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200],
      silent: false,              // play the device's default notification sound
      requireInteraction: true,   // stays on screen until the consultant taps it (desktop)
    });
  })());
});

// Tapping the notification focuses the open tab (or opens the app)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "focus" in c) {
          c.navigate(target).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});