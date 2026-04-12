/**
 * kamplink Landing — firebase.js
 * Firebase v10 (modular SDK) — Firestore waitlist
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  SETUP :                                            │
 * │  1. Va sur https://console.firebase.google.com      │
 * │  2. Crée un projet "kamplink"                     │
 * │  3. Active Firestore Database (mode production)     │
 * │  4. Ajoute une app Web                              │
 * │  5. Copie ta config dans firebaseConfig ci-dessous  │
 * └─────────────────────────────────────────────────────┘
 */

import { initializeApp }    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
}  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAnalytics }     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';

/* ══════════════════════════════════════════════════════
   🔴 REMPLACE CES VALEURS PAR TA CONFIG FIREBASE
══════════════════════════════════════════════════════ */
const firebaseConfig = {

  apiKey: "AIzaSyCMTvbaFIBnsDs0yku1u2zpGHi3MR6Urk0",

  authDomain: "kamplink.firebaseapp.com",

  projectId: "kamplink",

  storageBucket: "kamplink.firebasestorage.app",

  messagingSenderId: "563435762019",

  appId: "1:563435762019:web:9ce6a6284abb23a9abe356",

  measurementId: "G-YMH7W4V6K7"

};

/* ══════════════════════════════════════════════════════ */

// Init Firebase
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Analytics (optionnel, ne bloque pas si absent)
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (_) {}

/**
 * Enregistre un inscrit dans la collection "waitlist"
 * @param {Object} data
 * @param {string} data.fname
 * @param {string} data.lname
 * @param {string} data.email
 * @param {string} [data.phone]
 * @param {string} data.university
 * @param {string} [data.level]
 * @param {string} [data.filiere]
 * @returns {Promise<string>} ID du document créé
 */
export async function saveToWaitlist(data) {
  // Vérifie si l'email existe déjà (évite les doublons)
  const existingQuery = query(
    collection(db, 'waitlist'),
    where('email', '==', data.email.toLowerCase())
  );
  const existing = await getDocs(existingQuery);

  if (!existing.empty) {
    // Email déjà inscrit → on redirige quand même vers success
    // (pas d'erreur visible pour l'utilisateur)
    console.info('[kamplink] Email déjà inscrit:', data.email);
    return existing.docs[0].id;
  }

  // Nouvel inscrit
  const docRef = await addDoc(collection(db, 'waitlist'), {
    fname:      data.fname,
    lname:      data.lname,
    email:      data.email.toLowerCase(),
    phone:      data.phone   || null,
    university: data.university,
    level:      data.level   || null,
    filiere:    data.filiere || null,
    source:     'landing_page',
    createdAt:  serverTimestamp(),
    // Metadata utile
    userAgent:  navigator.userAgent,
    referrer:   document.referrer || 'direct',
  });

  console.info('[kamplink] Inscrit enregistré:', docRef.id);
  return docRef.id;
}

/**
 * Compte le nombre total d'inscrits (pour affichage éventuel)
 * @returns {Promise<number>}
 */
export async function getWaitlistCount() {
  try {
    const snap = await getDocs(collection(db, 'waitlist'));
    return snap.size;
  } catch (_) {
    return 0;
  }
}

export { db, analytics };