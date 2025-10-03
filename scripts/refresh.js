document.getElementById("refreshBtn").addEventListener("click", async () => {
  // সব ক্যাশ ডিলিট করো
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  
  console.log("🧹 Old cache cleared. Reloading page...");
  
  // পেজ রিফ্রেশ করো
  window.location.reload(true);
});