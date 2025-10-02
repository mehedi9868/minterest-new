self.addEventListener("install", event => {
  console.log("✅ Service Worker Installed");
  event.waitUntil(
    caches.open("minterest-cache").then(cache =>
      cache.addAll([
        "index.html",
        "login.html",
        "signup.html",
        "styles/main.css",
        "scripts/config.js",
        "scripts/pwa.js",
        "scripts/app.js",
        "scripts/auth.js",
        "scripts/menu.js",
        "assets/images/success.jpg",
        "manifest.json"
      ])
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
