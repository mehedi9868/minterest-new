'use strict';

/* ========= Config ========= */
// Configuration: API key, passwords, and default Google Drive folder URL
// Google API key used for Drive v3 file listing (public data only)
const API_KEY = "AIzaSyDUE_P391KSJ4gC6-FG8ch-XeinTh4gUT8";   // <-- আপনার Drive API key
// Primary password required to fetch files
const REQUIRED_PASSWORD = "iloveyou";                        // <-- পাসওয়ার্ড
// Secondary/alternate password
const ANOTHER_PASSWORD = "50607080";
// Default Google Drive folder to fetch media from
const DEFAULT_DRIVE_URL = "https://drive.google.com/drive/folders/12qLQqg_gjw7gGcmbJ4dIGeNe6iRigahy";
/* ========================== */

// --- Runtime state & DOM refs ---

// References to key DOM nodes
let grid, toast, overlay, pwdInput;
// UI flag persisted in localStorage
let firstImageSquared = false;
// Current filter view: 'image' or 'video'
let currentView = 'image'; // default
// Track file IDs already rendered (avoid duplicates)
const seen = new Set();
// Counter to assign size pattern across images
let renderCount = 0; // counts rendered media to assign size pattern

// IntersectionObserver: reveal card on scroll (entry animation)
// Observer for scroll animation
const observer = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
},{threshold:0.1});



// Reflect currentView into the toggle UI (aria-checked etc.)
function syncToggleFromView(){
  try{
    const mediaToggle = document.getElementById('mediaToggle');
    if(!mediaToggle) return;
    if(currentView==='video'){ mediaToggle.classList.add('active'); }
    else { mediaToggle.classList.remove('active'); }
    mediaToggle.setAttribute('aria-checked', mediaToggle.classList.contains('active') ? 'true' : 'false');
  }catch(e){}
}



// Persist non-grid UI state in localStorage
function saveStateExtras(){
  try{
    localStorage.setItem('drivepins_firstImageSquared', JSON.stringify(firstImageSquared));
    localStorage.setItem('drivepins_view', currentView);
  }catch(e){}
}

// Restore non-grid UI state from localStorage
function loadStateExtras(){
  try{
    const fis = localStorage.getItem('drivepins_firstImageSquared');
    if(fis !== null) firstImageSquared = JSON.parse(fis);
    const v = localStorage.getItem('drivepins_view');
    if(v) currentView = v;
  }catch(e){}
}



// Toast helper: show temporary notification at bottom center
function showToast(msg, ms = 2600){
  if(!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(()=> toast.style.display='none', ms);
}


// Display the success overlay with image and spinner for 2s
function showSuccessOverlay(){
  const el = document.getElementById("success-overlay");
  if(!el) return;
  el.style.display = "flex";
  setTimeout(()=>{ el.style.display = "none"; }, 2000);
}


// Save current grid HTML and seen IDs to localStorage
function saveBoard(){
  if(!grid) return;
  try{
    localStorage.setItem('drivepins_grid', grid.innerHTML);
    localStorage.setItem('drivepins_seen', JSON.stringify(Array.from(seen)));
    saveStateExtras();
  }catch(e){}
}

// Clear grid and all persisted state
function resetBoard(){
  if(!grid) return;
  grid.innerHTML = '';
  try{ seen.clear(); localStorage.removeItem('drivepins_grid'); localStorage.removeItem('drivepins_seen'); localStorage.removeItem('drivepins_firstImageSquared'); localStorage.removeItem('drivepins_view'); }catch(e){}
  showToast('Reset Successful');
}

// Load grid and seen IDs from localStorage; mark existing cards visible
function loadBoard(){
  if(!grid) return;
  try{
    const html = localStorage.getItem('drivepins_grid');
    const ids = localStorage.getItem('drivepins_seen');
    if(html){ grid.innerHTML = html; 
      // Re-attach animation state for existing cards
      grid.querySelectorAll('.card').forEach(card=>{ card.classList.add('visible'); });
    }
    if(ids){ JSON.parse(ids).forEach(id=>seen.add(id)); }
    loadStateExtras();
  }catch(e){}
}


// Open the password modal and focus the input
function openModal(){
  try{ if(overlay) overlay.style.display = 'flex'; }catch(e){}
  try{ pwdInput?.focus(); }catch(e){}
}

// Close the modal and clear the input
function closeModal(){
  try{ overlay.style.display = 'none'; }catch(e){}
  try{ pwdInput.value = ''; }catch(e){}
}


// Extract Drive folder ID from various URL shapes (?id=... or /folders/ID)
function getFolderIdFromUrl(url){
  if(!url) return null;
  try{
    const u = new URL(url);
    let m = u.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if(m) return m[1];
    const idParam = u.searchParams.get('id');
    if(idParam) return idParam;
    m = u.pathname.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
    if(m) return m[1];
    return null;
  }catch(e){ return null; }
}


// Fetch list of image/video files from Drive folder and render them
async function listFolderFiles(folderId){
  const base = 'https://www.googleapis.com/drive/v3/files';
  const q = encodeURIComponent(`'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`);
  let pageToken = '';
  let added = 0;
  const all = [];

  do {
    const url = `${base}?q=${q}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url);
    if(!res.ok){
      const err = await res.text();
      throw new Error(err || ('HTTP '+res.status));
    }
    const data = await res.json();
    const files = (data.files || []);
    for(const f of files){
      if(seen.has(f.id)) continue;
      all.push(f);
    }
    pageToken = data.nextPageToken || '';
  } while(pageToken);

  // Ensure first item is an image if any exists
  let ordered = [];
  const firstImgIdx = all.findIndex(f => (f.mimeType || '').startsWith('image/'));
  if(firstImgIdx > 0){
    ordered.push(all[firstImgIdx]);
    for(let i=0;i<all.length;i++){ if(i!==firstImgIdx) ordered.push(all[i]); }
  }else{
    ordered = all.slice();
  }

  for(const f of ordered){
    renderFileCard(f);
    seen.add(f.id);
    added++;
  }
  if(added>0) saveBoard();
  return added;
}


// Create and append a card element for a Drive file (image/video)
function renderFileCard(file){
  if(!grid) return;
  const isVideo = (file.mimeType || '').startsWith('video/');
  const card = document.createElement('article');
  const num = document.createElement('div'); num.className='num-badge'; num.textContent = String(renderCount + 1); card.appendChild(num);
  card.className = 'card';
  card.dataset.type = isVideo ? 'video' : 'image';

  const link = document.createElement('a');
  link.href = file.webViewLink || '#';
  link.target = '_blank'; link.rel='noopener';

  const img = document.createElement('img');
  const thumb = file.thumbnailLink ? file.thumbnailLink.replace(/=s\\d+/, '=s2048') : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`;
  img.src = thumb;
  img.alt = isVideo ? 'ভিডিও' : 'image';
  img.loading = 'lazy';
  // Assign one of five fixed size classes cyclically
  const slot = (renderCount % 5) + 1; // 1..5
  img.classList.add(`size-${slot}`);

link.appendChild(img);
  card.appendChild(link);

  if(isVideo){
    const label = document.createElement('div');
    label.className = 'badge';
    label.textContent = 'ভিডিও';
    card.appendChild(label);
  }

  grid.appendChild(card);
  renderCount++;
  observer.observe(card);   // scroll animation
}


// Filter visible cards by type: "image", "video", or "all"
function showOnly(type){
  currentView = type;
  if(!grid) return;
  const cards = grid.querySelectorAll('.card');
  cards.forEach(card=>{
    const t = card.dataset.type || '';
    card.style.display = (type==='all' || t===type) ? '' : 'none';
  });
}


// Password-check → show success overlay → fetch from default folder → render and filter
async function handleAdd(){
  try{
    const pwd = (pwdInput?.value || '');
    if(pwd !== REQUIRED_PASSWORD && pwd !== ANOTHER_PASSWORD){
      showToast('ভুল পাসওয়ার্ড ⚠️');
      return;
    }
    showSuccessOverlay();
    try{ const n=document.getElementById('notice'); if(n) n.style.display='none'; }catch(e){}
    // always use default folder (clean build)
    let folderId = getFolderIdFromUrl(DEFAULT_DRIVE_URL);
    if(!folderId){
      showToast('ডিফল্ট ফোল্ডার সেট করা নেই বা ভুল।');
      return;
    }
    closeModal();
    showToast('Loading…');
    const added = await listFolderFiles(folderId);
    showOnly(currentView);
    showToast(added===0 ? 'ফাইল পাওয়া যায়নি 💔' : `${added} টি নতুন আইটেম যোগ হয়েছে`);
  }catch(err){
    console.error(err);
    showToast('লোড করতে সমস্যা হয়েছে (folder public? API Key ঠিক আছে?)');
  }
}


// Bootstrap: cache DOM refs, bind event listeners, restore state, and wire lifecycle saves
window.addEventListener('DOMContentLoaded', () => {
  grid = document.getElementById('grid');
  toast = document.getElementById('toast');
  overlay = document.getElementById('overlay');
  pwdInput = document.getElementById('password');

  const fab = document.getElementById('fab');
  const btnReset = document.getElementById('btnReset');
  const btnCancel = document.getElementById('btnCancel');
  const btnAdd = document.getElementById('btnAdd');
  const mediaToggle = document.getElementById('mediaToggle');

  if(fab) fab.addEventListener('click', openModal);
  if(btnReset) btnReset.addEventListener('click', resetBoard);
  if(btnCancel) btnCancel.addEventListener('click', closeModal);
  if(btnAdd) btnAdd.addEventListener('click', handleAdd);

  if(mediaToggle){
    const apply = ()=>{
      const showType = mediaToggle.classList.contains('active') ? 'video' : 'image';
      showOnly(showType);
      mediaToggle.setAttribute('aria-checked', mediaToggle.classList.contains('active') ? 'true':'false');
    };
    mediaToggle.addEventListener('click', ()=>{ mediaToggle.classList.toggle('active'); apply(); });
    mediaToggle.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); mediaToggle.classList.toggle('active'); apply(); }
      if(e.key==='ArrowLeft'){ mediaToggle.classList.remove('active'); apply(); }
      if(e.key==='ArrowRight'){ mediaToggle.classList.add('active'); apply(); }
    });
    // (initial state will be synced after loadBoard)
  }

  loadBoard();
  showOnly(currentView);
  syncToggleFromView();

  // Save just before refresh/tab close
  window.addEventListener('beforeunload', saveBoard);
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveBoard(); });
});
