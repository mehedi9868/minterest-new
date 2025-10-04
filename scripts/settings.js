// scripts/settings.js — Firestore-backed settings (clean version, no localStorage)
// Requires: firebase-app-compat.js + firebase-firestore-compat.js loaded in settings.html
// Imports runtime helpers / defaults
import { firebaseConfig, getRuntimeConfigAsync } from "./config.js";

/* -----------------------------
   Firebase bootstrap (compat)
------------------------------*/
function ensureFirebaseApp() {
  // idempotent init
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  return firebase.app();
}
function getDb() {
  ensureFirebaseApp();
  return firebase.firestore();
}

/* -----------------------------
   DOM refs
------------------------------*/
const form   = document.getElementById("settings-form");
const msg    = document.getElementById("msg");
const diag   = document.getElementById("diag");
const btnSave= document.getElementById("btnSave");
const btnPing= document.getElementById("btnPing");

// Shortcuts to inputs (querying once)
const $ = (sel) => form.querySelector(sel);
const inputs = {
  images:    $("#images"),
  videos:    $("#videos"),
  favorites: $("#favorites"),
  apiKey:    $("#apiKey"),
  pwd1:      $("#pwd1"),
  pwd2:      $("#pwd2"),
};

/* -----------------------------
   UI helpers
------------------------------*/
function showMsg(text) {
  msg.textContent = text;
  msg.style.display = "block";
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => (msg.style.display = "none"), 3500);
}
function showDiag(line) {
  if (!line) return;
  diag.textContent = (diag.textContent ? `${diag.textContent}\n` : "") + line;
  diag.style.display = "block";
}
function setBusy(busy) {
  btnSave.disabled = busy;
  btnPing.disabled = busy;
  Object.values(inputs).forEach(i => (i.disabled = busy));
}

/* -----------------------------
   Core: load & save
------------------------------*/
async function fillForm() {
  try {
    setBusy(true);
    // Effective config = Firestore → (fallback) defaults
    const cfg = await getRuntimeConfigAsync();

    inputs.images.value    = cfg.DEFAULT_FEEDS?.images    || "";
    inputs.videos.value    = cfg.DEFAULT_FEEDS?.videos    || ""
    inputs.favorites.value = cfg.DEFAULT_FEEDS?.favorites || "";
    inputs.apiKey.value    = cfg.DRIVE_API_KEY            || "";
    inputs.pwd1.value      = cfg.REQUIRED_PASSWORD        || "";
    inputs.pwd2.value      = cfg.ANOTHER_PASSWORD         || "";

    showDiag(`✅ Loaded config (projectId: ${firebaseConfig.projectId})`);
  } catch (err) {
    console.error(err);
    showDiag("❌ fillForm error: " + (err.message || err));
  } finally {
    setBusy(false);
  }
}

function readPayloadFromForm() {
  // Trim URL/text; empty => null (so Firestore merge clears or ignores)
  const norm = (v) => (v && v.trim()) || null;
  return {
    DRIVE_API_KEY:     norm(inputs.apiKey.value),
    REQUIRED_PASSWORD: inputs.pwd1.value || null,
    ANOTHER_PASSWORD:  inputs.pwd2.value || null,
    DEFAULT_FEEDS: {
      images:    norm(inputs.images.value),
      videos:    norm(inputs.videos.value),
      favorites: norm(inputs.favorites.value),
    },
  };
}

async function saveSettings() {
  try {
    setBusy(true);
    const db = getDb();
    const payload = readPayloadFromForm();
    await db.collection("settings").doc("app").set(payload, { merge: true });
    showMsg("✅ Saved to Firestore");
    showDiag("✅ Write OK → settings/app");
  } catch (err) {
    console.error(err);
    showMsg("❌ Save failed");
    showDiag("❌ Save failed: " + (err.code || "") + " " + (err.message || err));
  } finally {
    setBusy(false);
  }
}

async function ping() {
  try {
    setBusy(true);
    const db = getDb();
    const ts = Date.now();
    await db.collection("settings").doc("app").set({ _ping: ts }, { merge: true });
    const snap = await db.collection("settings").doc("app").get();
    showDiag("✅ Ping ok. _ping = " + (snap.data()?._ping));
  } catch (err) {
    showDiag("❌ Ping failed: " + (err.code || "") + " " + (err.message || err));
  } finally {
    setBusy(false);
  }
}

/* -----------------------------
   Events
------------------------------*/
btnSave.addEventListener("click", (e) => { e.preventDefault(); saveSettings(); });
btnPing.addEventListener("click", (e) => { e.preventDefault(); ping(); });

// Prevent Enter from accidentally submitting & reloading
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.preventDefault();
});

document.addEventListener("DOMContentLoaded", fillForm);

/* -----------------------------
   (Optional) Auth guard
   If you later protect rules with `request.auth != null`,
   uncomment below to force login before editing settings.
------------------------------*/
// if (firebase.auth) {
//   firebase.auth().onAuthStateChanged((user) => {
//     if (!user) {
//       location.href = "login.html?next=settings.html";
//     }
//   });
// }
