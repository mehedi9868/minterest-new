// scripts/app.js
import { DRIVE_API_KEY, REQUIRED_PASSWORD, ANOTHER_PASSWORD, DEFAULT_DRIVE_URL } from "./config.js";

/* ---------- State & refs ---------- */
let grid, toast, overlay, pwdInput, mediaToggle, fab;
const seen = new Set();
let renderCount = 0;
let currentView = "image";

/* ---------- Helpers ---------- */
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("visible"); observer.unobserve(e.target);} });
},{threshold:0.1});

function showToast(msg, ms=2600){ if(!toast) return; toast.textContent=msg; toast.style.display="block"; setTimeout(()=>toast.style.display="none", ms);}
function openModal(){ overlay?.style.setProperty("display","flex"); pwdInput?.focus(); }
function closeModal(){ if(!overlay) return; overlay.style.display="none"; if(pwdInput) pwdInput.value=""; }
function showSuccessOverlay(){ const el=document.getElementById("success-overlay"); if(!el) return; el.style.display="flex"; setTimeout(()=>el.style.display="none",2000); }

function getFolderIdFromUrl(url){
  try{
    const u = new URL(url);
    let m = u.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/); if(m) return m[1];
    const id = u.searchParams.get("id"); if(id) return id;
    m = u.pathname.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/); if(m) return m[1];
    return null;
  }catch{ return null; }
}

function saveBoard(){
  if(!grid) return;
  try{
    localStorage.setItem("drivepins_grid", grid.innerHTML);
    localStorage.setItem("drivepins_seen", JSON.stringify([...seen]));
    localStorage.setItem("drivepins_view", currentView);
  }catch{}
}
function loadBoard(){
  if(!grid) return;
  try{
    const html = localStorage.getItem("drivepins_grid");
    const ids  = localStorage.getItem("drivepins_seen");
    const view = localStorage.getItem("drivepins_view");
    if(html){ grid.innerHTML = html; grid.querySelectorAll(".card").forEach(c=>c.classList.add("visible")); }
    if(ids){ JSON.parse(ids).forEach(id=>seen.add(id)); }
    if(view) currentView = view;
  }catch{}
}
function resetBoard(){
  if(!grid) return;
  grid.innerHTML = "";
  seen.clear();
  ["drivepins_grid","drivepins_seen","drivepins_view"].forEach(k=>localStorage.removeItem(k));
  showToast("Reset Successful");
}

function syncToggle(){ if(!mediaToggle) return; mediaToggle.classList.toggle("active", currentView==="video"); mediaToggle.setAttribute("aria-checked", mediaToggle.classList.contains("active")?"true":"false"); }
function filterCards(type){ currentView = type; grid?.querySelectorAll(".card").forEach(c=>{ c.style.display = (type==="all" || c.dataset.type===type) ? "" : "none"; }); }

/* ---------- Drive list & render ---------- */
async function listFolderFiles(folderId){
  const base='https://www.googleapis.com/drive/v3/files';
  const q = encodeURIComponent(`'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`);
  let pageToken = '', added = 0;
  const all = [];

  do{
    const url = `${base}?q=${q}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(DRIVE_API_KEY)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    const data = await res.json();
    (data.files||[]).forEach(f=>{ if(!seen.has(f.id)) all.push(f); });
    pageToken = data.nextPageToken || '';
  }while(pageToken);

  // Prefer first item as image
  const firstImgIdx = all.findIndex(f => (f.mimeType||"").startsWith("image/"));
  const ordered = firstImgIdx>0 ? [all[firstImgIdx], ...all.filter((_,i)=>i!==firstImgIdx)] : all;

  for(const f of ordered){ renderCard(f); seen.add(f.id); added++; }
  if(added>0) saveBoard();
  return added;
}

function renderCard(file){
  if(!grid) return;
  const isVideo = (file.mimeType||"").startsWith("video/");
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.type = isVideo ? "video" : "image";

  const badgeNum = document.createElement('div');
  badgeNum.className = 'num-badge';
  badgeNum.textContent = String(renderCount+1);
  card.appendChild(badgeNum);

  const a = document.createElement("a");
  a.href = file.webViewLink || "#"; a.target="_blank"; a.rel="noopener";

  const img = document.createElement("img");
  const thumb = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s2048') : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
  img.src = thumb; img.alt = isVideo ? "ভিডিও" : "image"; img.loading="lazy";
  const slot = (renderCount % 5) + 1; img.classList.add(`size-${slot}`);
  a.appendChild(img);
  card.appendChild(a);

  if(isVideo){ const label = document.createElement("div"); label.className="badge"; label.textContent="ভিডিও"; card.appendChild(label); }

  grid.appendChild(card);
  renderCount++;
  observer.observe(card);
}

/* ---------- UI actions ---------- */
async function handleAdd(){
  const pwd = (pwdInput?.value || "");
  if(pwd !== REQUIRED_PASSWORD && pwd !== ANOTHER_PASSWORD){ showToast("ভুল পাসওয়ার্ড ⚠️"); return; }
  showSuccessOverlay();
  const folderId = getFolderIdFromUrl(DEFAULT_DRIVE_URL);
  if(!folderId){ showToast("ডিফল্ট ফোল্ডার ভুল/নেই"); return; }
  closeModal();
  showToast("Loading…");
  try{
    const added = await listFolderFiles(folderId);
    filterCards(currentView);
    showToast(added===0 ? "নতুন ফাইল পাওয়া যায়নি 💔" : `${added} টি নতুন আইটেম যোগ হয়েছে`);
  }catch(err){ console.error(err); showToast("লোড করতে সমস্যা (public folder? API key?)"); }
}

/* ---------- Boot ---------- */
window.addEventListener("DOMContentLoaded", ()=>{
  grid = document.getElementById("grid");
  toast = document.getElementById("toast");
  overlay = document.getElementById("overlay");
  pwdInput = document.getElementById("password");
  mediaToggle = document.getElementById("mediaToggle");
  fab = document.getElementById("fab");

  // Buttons
  document.getElementById("btnCancel")?.addEventListener("click", closeModal);
  document.getElementById("btnAdd")?.addEventListener("click", handleAdd);
  fab?.addEventListener("click", openModal);

  if(mediaToggle){
    const apply = ()=>{ const type = mediaToggle.classList.contains("active") ? "video" : "image"; filterCards(type); mediaToggle.setAttribute("aria-checked", mediaToggle.classList.contains("active")?"true":"false"); };
    mediaToggle.addEventListener("click", ()=>{ mediaToggle.classList.toggle("active"); apply(); });
    mediaToggle.addEventListener("keydown", (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); mediaToggle.classList.toggle('active'); apply(); }
      if(e.key==='ArrowLeft'){ mediaToggle.classList.remove('active'); apply(); }
      if(e.key==='ArrowRight'){ mediaToggle.classList.add('active'); apply(); }});
  }

  loadBoard(); filterCards(currentView); syncToggle();

  window.addEventListener("beforeunload", saveBoard);
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden) saveBoard(); });
});

// expose reset for menu
window.resetBoard = resetBoard;
