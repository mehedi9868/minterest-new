const CACHE_NAME = "minterest-cache-v2"; // 🔹 এখানে version পরিবর্তন করো
const FILES_TO_CACHE = [
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
];

// ✅ Install event
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker Installed");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // নতুন service worker কে সাথে সাথে সক্রিয় করে
});

// ✅ Activate event — পুরনো cache delete করবে
self.addEventListener("activate", (event) => {
  console.log("⚡ Activating new service worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim(); // নতুন SW কে control নিতে দেয়
});

// ✅ Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => res || fetch(event.request))
  );
});