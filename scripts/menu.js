/**
 * scripts/menu.js — ডুপ্লিকেট প্রতিরোধসহ
 * - Duplicate script load guard (window.__menuScriptLoaded)
 * - Concurrency guard (isBuilding + buildVersion)
 * - Firestore menus + Reset + Login/Logout
 */

if (window.__menuScriptLoaded) {
  // ⚠️ এই পেজে menu.js আগেই লোড ছিল — দ্বিতীয়বার লোড বন্ধ করি
  console.warn("menu.js already loaded; skipping duplicate init.");
} else {
  window.__menuScriptLoaded = true;

  // ---------- DOM ----------
  const burger = document.getElementById('hamburgerBtn');
  const menu   = document.getElementById('headerMenu');
  const list   = menu?.querySelector('ul');

  // ---------- Menu toggle ----------
  function toggleMenu(){
    if(!menu) return;
    const isHidden = menu.hasAttribute('hidden');
    isHidden ? menu.removeAttribute('hidden') : menu.setAttribute('hidden','');
    burger?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }
  burger?.addEventListener('click', toggleMenu);

  document.addEventListener('click', (e)=>{
    if(menu && !menu.contains(e.target) && !burger?.contains(e.target)){
      menu.setAttribute('hidden','');
      burger?.setAttribute('aria-expanded','false');
    }
  });

  // ---------- Concurrency guards ----------
  let isBuilding = false;      // একই সময়ে দ্বিতীয় build ঠেকাতে
  let buildVersion = 0;        // সর্বশেষ build চিহ্নিত করতে (race condition এ কাজে লাগবে)

  function buildMenu(){
    if(!list) return;

    // যদি আগের build চলছে, নতুনটা ইগনোর করি
    if (isBuilding) {
      // চাইলে: ডিবাউন্স করে সামান্য দেরিতে আবার চেষ্টা করো
      // setTimeout(buildMenu, 100);
      return;
    }

    isBuilding = true;
    const myVersion = ++buildVersion; // এই build-এর সিরিয়াল

    // প্রথমে ক্লিন স্লেট
    list.innerHTML = "";

    const db = window.appDB;

    // Reset + Login/Logout যোগ করার কমন ফাংশন
    const afterConfigured = () => {
      // যদি এই সময়ের মধ্যে নতুন কোনো build শুরু হয়ে থাকে, এই রেন্ডার স্কিপ
      if (myVersion !== buildVersion) { isBuilding = false; return; }

      // (১) Reset
      const resetLi = document.createElement('li');
      resetLi.innerHTML = `<button type="button">Reset</button>`;
      resetLi.querySelector('button').addEventListener('click', ()=> window.resetBoard?.());
      list.appendChild(resetLi);

      // (২) Login/Logout
      const isLoggedIn =
        typeof window.appIsLoggedIn === 'boolean'
          ? window.appIsLoggedIn
          : !!(window.appAuth && window.appAuth.currentUser);

      if (isLoggedIn) {
        const outLi = document.createElement('li');
        outLi.innerHTML = `<button type="button">Log out</button>`;
        outLi.querySelector('button').addEventListener('click', ()=> window.appSignOut?.());
        list.appendChild(outLi);
      } else {
        const inLi = document.createElement('li');
        inLi.innerHTML = `<a href="login.html">Log in</a>`;
        list.appendChild(inLi);
      }

      isBuilding = false; // ✅ build done
    };

    // Firestore না থাকলে সরাসরি fallback
    if (!db) { afterConfigured(); return; }

    // Firestore থেকে কনফিগ মেনু লোড
    db.collection('settings').doc('general').get()
      .then(doc=>{
        // নতুন build শুরু হয়ে গেলে, এই রেজাল্ট ইগনোর করো
        if (myVersion !== buildVersion) { isBuilding = false; return; }

        if (doc.exists) {
          const menus = doc.data().menus || [];
          menus.forEach(m=>{
            if(m.visible){
              const li = document.createElement('li');
              li.innerHTML = `<a href="${m.link}">${m.icon || ""} ${m.title}</a>`;
              list.appendChild(li);
            }
          });
        }
        afterConfigured();
      })
      .catch(()=>{
        // এরর হলেও বেসিক আইটেম দাও
        afterConfigured();
      });
  }

  // প্রথমবার বানাও
  buildMenu();

  // auth স্টেট বদলালে আবার বানাও (e.g., লগইন/লগআউট)
  document.addEventListener('auth:state', buildMenu);
}
