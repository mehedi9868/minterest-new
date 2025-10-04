// scripts/settings.js
// Compat SDK v11 ধরে লেখা (firebase.* গ্লোবাল রয়েছে)
// config.js আগে লোড হয় বলে ধরে নিচ্ছি। প্রয়োজনে সেফ-গার্ড:
import { firebaseConfig } from './config.js';
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

// DOM refs
const form   = document.getElementById('settings-form');
const msg    = document.getElementById('msg');
const diag   = document.getElementById('diag');
const btnSave= document.getElementById('btnSave');
const btnPing= document.getElementById('btnPing');
const guard  = document.getElementById('guard-msg');

const fields = ['images','videos','favorites','apiKey','pwd1','pwd2'];

function setFormEnabled(enabled) {
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
  btnSave.disabled = !enabled;
}

function showForm(show) {
  form.style.display = show ? '' : 'none';
  document.querySelector('.settings-actions').style.display = show ? '' : 'none';
}

function showGuard(show, text) {
  if (!guard) return;
  guard.style.display = show ? '' : 'none';
  if (text) guard.querySelector('p').textContent = text;
}

function toast(text, ok=true) {
  msg.textContent = text;
  msg.style.display = 'block';
  msg.style.color = ok ? 'var(--ok, #9effa5)' : 'var(--warn, #ff9e9e)';
  setTimeout(()=>{ msg.style.display='none'; }, 3500);
}

async function isAdmin(uid) {
  if (!uid) return false;
  const doc = await db.collection('admins').doc(uid).get();
  return doc.exists; // admin হলে true
}

async function loadSettingsIntoForm() {
  const snap = await db.collection('app').doc('settings').get();
  const data = snap.exists ? snap.data() : {};
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = data[id] || '';
  });
}

async function saveSettingsFromForm() {
  const payload = {};
  fields.forEach(id => payload[id] = (document.getElementById(id)?.value || '').trim());

  await db.collection('app').doc('settings').set(payload, { merge: true });
}

// -------- Event wiring --------
btnSave?.addEventListener('click', async () => {
  try {
    setFormEnabled(false);
    await saveSettingsFromForm();
    toast('✅ Settings saved');
  } catch (e) {
    console.error(e);
    toast('❌ Failed to save: ' + e.message, false);
  } finally {
    setFormEnabled(true);
  }
});

btnPing?.addEventListener('click', async () => {
  const start = Date.now();
  diag.style.display = 'block';
  diag.textContent = 'Pinging Firestore...';
  try {
    // lightweight read
    await db.collection('app').doc('settings').get();
    const ms = Date.now() - start;
    diag.textContent = `✅ Firestore OK ~${ms}ms`;
  } catch (e) {
    diag.textContent = '❌ ' + e.message;
  }
});

// -------- Auth gate --------
auth.onAuthStateChanged(async (user) => {
  try {
    if (!user) {
      // not logged in
      showForm(false);
      setFormEnabled(false);
      showGuard(true, 'এই পেজটি আপডেট করতে অ্যাডমিন একাউন্টে লগইন করুন।');
      return;
    }

    const ok = await isAdmin(user.uid);
    if (!ok) {
      // logged in but not admin
      showForm(false);
      setFormEnabled(false);
      showGuard(true, 'আপনার একাউন্টে অ্যাডমিন অনুমতি নেই। অ্যাডমিন একাউন্টে লগইন করুন।');
      return;
    }

    // admin: allow + load current values
    showGuard(false);
    showForm(true);
    setFormEnabled(true);
    await loadSettingsIntoForm();

  } catch (e) {
    console.error(e);
    toast('❌ Error: ' + e.message, false);
    showForm(false);
    showGuard(true, 'লোড করতে সমস্যা হয়েছে—পরে চেষ্টা করুন।');
  }
});
