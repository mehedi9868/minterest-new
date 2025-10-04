// scripts/app.js — uses Firebase Firestore runtime config

import { getRuntimeConfigStrictAsync } from "./config.js";

let CFG = null;

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
    if(!url) return null;
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
async function listFolderFiles(folderId, typeFilter /* 'image' | 'video' | null */){
  const base='https://www.googleapis.com/drive/v3/files';

  let typeClause = "(mimeType contains 'image/' or mimeType contains 'video/')";
  if(typeFilter === 'image') typeClause = "(mimeType contains 'image/')";
  if(typeFilter === 'video') typeClause = "(mimeType contains 'video/')";

  const q = encodeURIComponent(`'${folderId}' in parents and ${typeClause} and trashed = false`);
  let pageToken = '', added = 0;
  const all = [];

  do{
    const url = `${base}?q=${q}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(CFG.DRIVE_API_KEY)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
    const data = await res.json();
    (data.files||[]).forEach(f=>{ if(!seen.has(f.id)) all.push(f); });
    pageToken = data.nextPageToken || '';
  }while(pageToken);

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

  const a = document.createElement("a");
  a.href = file.webViewLink || "#"; a.target="_blank"; a.rel="noopener";

  const img = document.createElement("img");
  const thumb = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s2048') : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
  img.src = thumb; img.alt = isVideo ? "ভিডিও" : "image"; img.loading="lazy";
  const slot = (renderCount % 5) + 1; img.classList.add(`size-${slot}`);
  a.appendChild(img);
  card.appendChild(a);

  // Transparent play icon for videos
  if (isVideo) {
    const iconWrap = document.createElement("div");
    iconWrap.className = "video-icon-overlay";
    iconWrap.innerHTML = `
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="22" fill="#000" fill-opacity="0.35" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.4"/>
        <path d="M28 23 L28 41 L44 32 Z" fill="#fff" fill-opacity="0.92" />
      </svg>
    `;
    card.appendChild(iconWrap);
  }

  grid.appendChild(card);
  renderCount++;
  observer.observe(card);
}

/* ---------- UI actions ---------- */
async function handleAdd(){
  const pwd = (pwdInput?.value || "");
  if(pwd !== CFG.REQUIRED_PASSWORD && pwd !== CFG.ANOTHER_PASSWORD){ showToast("ভুল পাসওয়ার্ড ⚠️"); return; }
  showSuccessOverlay();

  const feeds = [
    { url: CFG.DEFAULT_FEEDS?.images || CFG.DEFAULT_DRIVE_URL, type: 'image' },
    { url: CFG.DEFAULT_FEEDS?.videos || CFG.DEFAULT_DRIVE_URL, type: 'video' },
    { url: CFG.DEFAULT_FEEDS?.favorites || null, type: null }
  ];

  closeModal();
  showToast("Loading…");

  let totalAdded = 0;
  try{
    for(const f of feeds){
      if(!f.url) continue;
      const folderId = getFolderIdFromUrl(f.url);
      if(!folderId) continue;
      const added = await listFolderFiles(folderId, f.type);
      totalAdded += added;
    }
    filterCards(currentView);
    showToast(totalAdded===0 ? "নতুন ফাইল পাওয়া যায়নি 💔" : `${totalAdded} টি নতুন আইটেম যোগ হয়েছে`);
  }catch(err){
    console.error(err);
    showToast("লোড করতে সমস্যা (public folder? API key?)");
  }
}

/* ---------- Boot ---------- */
async function init(){
  // STRICT: Firestore থেকে কনফিগ না পেলে অ্যাপ ব্লক করবে
  try{
    CFG = await getRuntimeConfigStrictAsync();
  }catch(err){
    // ব্লকিং ওভারলে / মেসেজ
    const blocker = document.createElement("div");
    blocker.style.cssText = `
      position:fixed; inset:0; z-index:99999; display:grid; place-items:center;
      background:rgba(5,8,12,0.9); color:#fff; padding:24px; text-align:center;
    `;
    blocker.innerHTML = `
      <div style="max-width:720px; background:#0e141c; border:1px solid rgba(255,255,255,.08);
                  border-radius:16px; padding:24px">
        <h2 style="margin:0 0 10px">Configuration Required</h2>
        <p style="color:#cbd5e1; margin:0 0 4px">${(err && err.message) || "Missing Firestore settings"}</p>
        <p style="color:#94a3b8; margin:0 0 16px">Please open <b>settings.html</b> and fill all required fields (API Key, passwords, and all three feed URLs).</p>
        <a href="settings.html" class="btn" style="display:inline-block; padding:10px 14px; border:1px solid rgba(255,255,255,.12); border-radius:10px; text-decoration:none; color:#fff">Go to Settings</a>
      </div>
    `;
    document.body.appendChild(blocker);
    console.error("Config load failed (strict):", err);
    return; // stop boot
  }

  // --- ↓ আপনার আগের init বাকি অংশ অপরিবর্তিত ↓ ---
  grid = document.getElementById("grid");
  toast = document.getElementById("toast");
  overlay = document.getElementById("overlay");
  pwdInput = document.getElementById("password");
  mediaToggle = document.getElementById("mediaToggle");
  fab = document.getElementById("fab");

  document.getElementById("btnCancel")?.addEventListener("click", closeModal);
  document.getElementById("btnAdd")?.addEventListener("click", handleAdd);
  fab?.addEventListener("click", openModal);

  if(mediaToggle){
    const apply = ()=>{
      const type = mediaToggle.classList.contains("active") ? "video" : "image";
      filterCards(type);
      mediaToggle.setAttribute("aria-checked", mediaToggle.classList.contains("active")?"true":"false");
    };
    mediaToggle.addEventListener("click", ()=>{ mediaToggle.classList.toggle("active"); apply(); });
    mediaToggle.addEventListener("keydown", (e)=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); mediaToggle.classList.toggle('active'); apply(); }
      if(e.key==='ArrowLeft'){ mediaToggle.classList.remove('active'); apply(); }
      if(e.key==='ArrowRight'){ mediaToggle.classList.add('active'); apply(); }
    });
  }

  loadBoard(); filterCards(currentView); syncToggle();

  window.addEventListener("beforeunload", saveBoard);
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden) saveBoard(); });
}
window.addEventListener("DOMContentLoaded", init);

window.addEventListener("DOMContentLoaded", init);

// expose reset
window.resetBoard = resetBoard;
