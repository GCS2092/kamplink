/**
 * kamplink Landing — script.js
 * Custom cursor · Navbar scroll · AOS animations
 * Form validation · Firebase Firestore submission
 */

import { saveToWaitlist } from './firebase.js'; // On va créer cette fonction

/* ══════════════════════════════════════════════════════
   1. CUSTOM CURSOR
══════════════════════════════════════════════════════ */
(function initCursor() {
  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  if (!cursor || !follower) return;

  if ('ontouchstart' in window) {
    cursor.style.display   = 'none';
    follower.style.display = 'none';
    return;
  }

  let mx = -100, my = -100;
  let fx = -100, fy = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function animateFollower() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  const interactives = 'a, button, input, select, textarea, [data-hover]';
  document.querySelectorAll(interactives).forEach(el => {
    el.addEventListener('mouseenter', () => {
      follower.style.width  = '56px';
      follower.style.height = '56px';
      follower.style.borderColor = 'rgba(37,99,255,0.5)';
    });
    el.addEventListener('mouseleave', () => {
      follower.style.width  = '36px';
      follower.style.height = '36px';
      follower.style.borderColor = 'rgba(255,255,255,0.3)';
    });
  });
})();

/* ══════════════════════════════════════════════════════
   2. NAVBAR — scroll effect + mobile hamburger
══════════════════════════════════════════════════════ */
// (ton code navbar reste IDENTIQUE – je ne le recopie pas pour gagner de la place)

/* ══════════════════════════════════════════════════════
   3. AOS, FEAT CARDS, SMOOTH SCROLL, COUNTERS
══════════════════════════════════════════════════════ */
// (tout ton code existant pour AOS, spotlight, smooth scroll et counters reste IDENTIQUE)

/* ══════════════════════════════════════════════════════
   6. WAITLIST FORM — validation + Firestore
══════════════════════════════════════════════════════ */
(function initForm() {
  const form      = document.getElementById('waitlist-form');
  const submitBtn = document.getElementById('submit-btn');
  const message   = document.getElementById('form-message');
  if (!form) return;

  const getField = id => document.getElementById(id);

  const showError = (id, msg) => {
    const errEl = document.getElementById(id + '-error');
    if (errEl) errEl.textContent = msg;
    const field = getField(id);
    if (field) field.classList.add('error');
  };

  const clearError = id => {
    const errEl = document.getElementById(id + '-error');
    if (errEl) errEl.textContent = '';
    const field = getField(id);
    if (field) field.classList.remove('error');
  };

  const clearAllErrors = () => {
    ['fname', 'lname', 'email', 'university'].forEach(clearError);
  };

  // Live validation
  ['fname', 'lname', 'email', 'university'].forEach(id => {
    const el = getField(id);
    if (el) el.addEventListener('input', () => clearError(id));
  });

  const validate = () => {
    let valid = true;
    clearAllErrors();

    const fname = getField('fname')?.value.trim();
    const lname = getField('lname')?.value.trim();
    const email = getField('email')?.value.trim();
    const university = getField('university')?.value;

    if (!fname || fname.length < 2) {
      showError('fname', 'Prénom requis (min. 2 caractères)');
      valid = false;
    }
    if (!lname || lname.length < 2) {
      showError('lname', 'Nom requis (min. 2 caractères)');
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('email', 'Email invalide');
      valid = false;
    }
    if (!university) {
      showError('university', 'Sélectionne ton université');
      valid = false;
    }

    return valid;
  };

  const setLoading = isLoading => {
    const text   = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.btn-loader');
    submitBtn.disabled = isLoading;
    if (text)   text.style.display   = isLoading ? 'none' : 'inline';
    if (loader) loader.style.display = isLoading ? 'inline' : 'none';
  };

  const showMessage = (text, type = '') => {
    message.textContent = text;
    message.className = `form-message ${type}`;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    showMessage('', '');

    const data = {
      fname:      getField('fname').value.trim(),
      lname:      getField('lname').value.trim(),
      email:      getField('email').value.trim().toLowerCase(),
      phone:      getField('phone')?.value.trim() || null,
      university: getField('university').value,
      level:      getField('level')?.value || null,
      filiere:    getField('filiere')?.value.trim() || null,
    };

    try {
      // Appelle uniquement Firestore
      const docId = await saveToWaitlist(data);
      showMessage(`✅ Merci ${data.fname}, ton inscription est enregistrée !`, 'success');

      // Redirection après 1.2s
      setTimeout(() => {
        window.location.href = `success.html?name=${encodeURIComponent(data.fname)}`;
      }, 1200);

    } catch (err) {
      console.error('[kamplink] Erreur inscription:', err);
      showMessage('Une erreur est survenue. Réessaie plus tard.', 'error');
      setLoading(false);
    }
  });
})();