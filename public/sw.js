// Service Worker for Push Notifications
self.addEventListener("push", (event) => {
  let data = { title: "Duty Reminder", body: "You have an upcoming shift.", icon: "/favicon.ico" };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      tag: data.tag || "duty-reminder",
      requireInteraction: true,
      data: data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/nurse-dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/nurse-dashboard");
      }
    })
  );
});

// Basic cache for offline support
const CACHE_NAME = "caritas-nurses-v1";
const STATIC_ASSETS = ["/", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network first for API calls, cache first for assets
  if (event.request.url.includes("/rest/") || event.request.url.includes("/auth/") || event.request.url.includes("/functions/")) {
    return; // Let network handle API calls
  }
});
