// scripts/auth.js — Firebase init + auth state UI + FAB enable/disable + logout
import { firebaseConfig } from "./config.js";

// Load Firebase SDKs via script tags already in HTML (compat). Init if needed:
if (!firebase.apps?.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore?.();

// UI refs
const notice    = document.getElementById('auth-notice');
const userInfo  = document.getElementById('user-info');
const userPic   = document.getElementById('user-pic');
const userName  = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const fab       = document.getElementById('fab');

// Auth state handler
auth.onAuthStateChanged(user=>{
  if(user){
    notice && (notice.style.display = "none");
    if(userInfo){ userInfo.style.display="flex"; }
    if(userPic)  userPic.src   = user.photoURL || "https://www.svgrepo.com/show/452030/user.svg";
    if(userName) userName.textContent = user.displayName || "";
    if(userEmail)userEmail.textContent = user.email || "";
    if(fab){ fab.disabled=false; fab.style.opacity="1"; }
  }else{
    notice && (notice.style.display = "block");
    if(userInfo) userInfo.style.display="none";
    if(fab){ fab.disabled=true; fab.style.opacity="0.5"; }
  }
});

// Make signOut callable for menu.js
window.appSignOut = ()=> auth.signOut().then(()=>location.href="index.html");
window.appAuth    = auth;
window.appDB      = db;
