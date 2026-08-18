/* Samsta service worker — background alerts for follow updates. */
self.addEventListener("push", (event) => {
  let body = "You have a new follow update on Samsta.";
  let title = "Samsta";
  try {
    if (event.data) {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
    }
  } catch (_) {
    /* payload-less push */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "samsta-follow",
      silent: true,
      vibrate: [],
      data: { url: "/notifications" },
}),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
