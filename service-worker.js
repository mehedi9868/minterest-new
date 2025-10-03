// ✅ Auto Versioned Service Worker for Minterest PWA
const CACHE_NAME = "minterest-cache-" + new Date().getTime(); // 🔹 Auto version by timestamp

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

// 🔹 Install event: নতুন ক্যাশ তৈরি
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker Installed:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // সাথে সাথে নতুন version সক্রিয় হবে
});

// 🔹 Activate event: পুরনো ক্যাশ ডিলিট
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
  self.clients.claim(); // নতুন SW control নিবে
});

// 🔹 Fetch event: ক্যাশ থেকে বা নেটওয়ার্ক থেকে ফাইল পরিবেশন
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => {
      if (res) {
        console.log("📦 Loaded from cache:", event.request.url);
        return res;
      }
      console.log("🌐 Fetched from network:", event.request.url);
      return fetch(event.request);
    })
  );
});