self.addEventListener("install", event => {
  console.log("✅ Service Worker Installed");
  event.waitUntil(
    caches.open("minterest-cache").then(cache => {
      return cache.addAll([
        "index.html",
        "style.css",
        "app_min.js",
        "login.html",
        "signup.html"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
