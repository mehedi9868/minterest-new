// scripts/config.js — central config (modified to support 3 default feeds)

// === Drive fetching ===
export const DRIVE_API_KEY = "AIzaSyDUE_P391KSJ4gC6-FG8ch-XeinTh4gUT8";   // unchanged
export const REQUIRED_PASSWORD = "iloveyou";
export const ANOTHER_PASSWORD  = "50607080";

// --- NEW: Three default Drive folder URLs ---
// 1) Images folder, 2) Videos folder, 3) Favorites folder (your chosen files)
export const DEFAULT_FEEDS = {
  images:    "https://drive.google.com/drive/folders/1KTsOKT0MGq9DWUgehGeVoCTWz6KSnZpm?usp=drive_link", // example; replace if needed
  videos:    "https://drive.google.com/drive/folders/1lJGSr3jwsaqccZ-N_FbWnVi-CMX9a5cJ?usp=drive_link", // example; replace if needed
  favorites: "https://drive.google.com/drive/folders/1vkC-jijKr4UGueSZmbFLiQitEWbeje5A?usp=drive_link"  // example; replace if needed
};

// Kept for backward compatibility: old single default URL now points to Images feed by default
export const DEFAULT_DRIVE_URL = DEFAULT_FEEDS.images;

// === Firebase ===
export const firebaseConfig = {
  apiKey: "AIzaSyBP2mcTImq6j_IqtUBi-UmfbHV_2pc1Zuw",
  authDomain: "minterest-beta.firebaseapp.com",
  projectId: "minterest-beta",
  storageBucket: "minterest-beta.firebasestorage.app",
  messagingSenderId: "822920853423",
  appId: "1:822920853423:web:9a426afa6fb3b8514ae15a",
  measurementId: "G-J3WZ8EL2XY"
};
