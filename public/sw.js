/* Notification interaction only: no response caching or private-data storage. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope)) {
          try {
            await client.focus();
            return;
          } catch {
            // Another app window, or a fresh same-origin window, may still open.
          }
        }
      }

      await self.clients.openWindow(self.registration.scope);
    })(),
  );
});
