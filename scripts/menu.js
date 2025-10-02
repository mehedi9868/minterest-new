// scripts/menu.js — hamburger + Firestore-driven menu + Reset & Logout
const burger = document.getElementById('hamburgerBtn');
const menu   = document.getElementById('headerMenu');
const list   = menu?.querySelector('ul');

function toggleMenu(){ if(!menu) return; const hidden = menu.hasAttribute('hidden'); hidden ? menu.removeAttribute('hidden') : menu.setAttribute('hidden',''); burger?.setAttribute('aria-expanded', hidden ? 'true':'false'); }
burger?.addEventListener('click', toggleMenu);
document.addEventListener('click', (e)=>{ if(menu && !menu.contains(e.target) && !burger?.contains(e.target)){ menu.setAttribute('hidden',''); burger?.setAttribute('aria-expanded','false'); }});

// Load menus from Firestore if available
(function loadMenu(){
  if(!list) return;
  list.innerHTML = "";
  const db = window.appDB;
  if(!db){ return; }
  db.collection("settings").doc("general").get().then(doc=>{
    if(doc.exists){
      const menus = doc.data().menus || [];
      menus.forEach(m=>{
        if(m.visible){
          const li = document.createElement("li");
          li.innerHTML = `<a href="${m.link}">${m.icon||""} ${m.title}</a>`;
          list.appendChild(li);
        }
      });
    }
    // Reset
    const resetLi = document.createElement("li");
    resetLi.innerHTML = `<button type="button">Reset</button>`;
    resetLi.querySelector("button").addEventListener("click", ()=> window.resetBoard?.());
    list.appendChild(resetLi);

    // Logout (shows only if logged in; harmless otherwise)
    const outLi = document.createElement("li");
    outLi.innerHTML = `<button type="button">Log out</button>`;
    outLi.querySelector("button").addEventListener("click", ()=> window.appSignOut?.());
    list.appendChild(outLi);
  });
})();
