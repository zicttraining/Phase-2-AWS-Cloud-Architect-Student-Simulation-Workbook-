/* ============================================================
   ZICT Workbook — Login, Progress Tracking & Grades
   Drop-in overlay. Requires no changes to workbook markup.
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/* ---------- 1. CONFIG — already set for project: zict-workbook ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDV4EQrkLl2wUF96Xk8_yYaH1PiRZS_gd0",
  authDomain: "zict-workbook.firebaseapp.com",
  projectId: "zict-workbook",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ---------- 2. STYLES ---------- */
const css = `
#zw-login{position:fixed;inset:0;background:linear-gradient(135deg,#1a3c6e,#0d2644);
  display:grid;place-items:center;z-index:9999;font-family:'Segoe UI',Arial,sans-serif}
#zw-login .card{background:#fff;border-radius:12px;padding:36px;width:340px;
  box-shadow:0 20px 60px rgba(0,0,0,.35)}
#zw-login h2{color:#1a3c6e;font-size:1.3em;margin:0 0 4px;font-weight:800}
#zw-login .sub{color:#777;font-size:13px;margin-bottom:20px}
#zw-login input{width:100%;padding:11px;margin-bottom:10px;border:1px solid #ccd;
  border-radius:6px;font-size:14px;box-sizing:border-box}
#zw-login button{width:100%;padding:11px;border:0;border-radius:6px;font-weight:700;
  font-size:14px;cursor:pointer;margin-bottom:8px}
#zw-signin{background:#f5a623;color:#1a1a1a}
#zw-signup{background:#1a3c6e;color:#fff}
#zw-reset{background:none;color:#666;font-weight:400;font-size:13px;text-decoration:underline}
#zw-err{color:#c0392b;font-size:13px;min-height:18px;margin:0}
#zw-bar{position:sticky;top:0;z-index:500;background:#1a3c6e;color:#fff;
  display:flex;align-items:center;gap:14px;padding:8px 16px;font-size:13px;
  font-family:'Segoe UI',Arial,sans-serif;margin:-32px -40px 20px;flex-wrap:wrap}
#zw-bar .grow{flex:1}
#zw-bar button{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);
  color:#fff;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12px}
#zw-overall{background:rgba(255,255,255,.2);border-radius:10px;height:8px;width:130px;overflow:hidden}
#zw-overall span{display:block;height:100%;background:#f5a623;width:0;transition:width .3s}
#zw-status{opacity:.85;font-size:12px;min-width:60px}
.zw-panel{background:#fff;border:1px solid #dde3ea;border-left:5px solid #1a3c6e;
  border-radius:8px;padding:16px 20px;margin:16px 0}
.zw-panel .zw-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.zw-panel .zw-title{font-size:11px;font-weight:700;letter-spacing:1px;
  text-transform:uppercase;color:#1a3c6e;flex:1}
.zw-prog{background:#eee;border-radius:8px;height:6px;width:90px;overflow:hidden}
.zw-prog span{display:block;height:100%;background:#27ae60;width:0;transition:width .3s}
.zw-pct{font-size:12px;color:#666;min-width:34px;text-align:right}
.zw-check{display:flex;align-items:flex-start;gap:9px;padding:4px 0;font-size:14px}
.zw-check input{margin-top:3px;width:16px;height:16px;flex-shrink:0;cursor:pointer}
.zw-check label{cursor:pointer;line-height:1.5}
.zw-check input:checked + label{color:#888;text-decoration:line-through}
.zw-field{margin-top:12px}
.zw-field label{display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:4px}
.zw-field input,.zw-field textarea{width:100%;padding:8px;border:1px solid #ccd;
  border-radius:5px;font-size:13px;font-family:inherit;box-sizing:border-box}
.zw-field textarea{min-height:60px;resize:vertical}
.zw-submit{background:#27ae60;color:#fff;border:0;padding:8px 18px;border-radius:5px;
  font-weight:700;font-size:13px;cursor:pointer;margin-top:12px}
.zw-submit:disabled{background:#aaa;cursor:not-allowed}
.zw-locked{background:#f0f4f8;border-left-color:#888}
.zw-grade{background:#eafaf1;border:1px solid #27ae60;border-radius:6px;
  padding:12px 16px;margin-top:12px}
.zw-grade .score{font-size:1.5em;font-weight:800;color:#1a7a42}
.zw-grade .fb{font-size:13px;color:#333;margin-top:6px;white-space:pre-wrap}
.zw-pending{background:#fff3cd;border:1px solid #f0ad4e;border-radius:6px;
  padding:10px 16px;margin-top:12px;font-size:13px;color:#856404}
@media(max-width:700px){#zw-bar{margin:-32px -20px 20px}}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

/* ---------- 3. LOGIN SCREEN ---------- */
document.body.insertAdjacentHTML('afterbegin', `
<div id="zw-login">
  <div class="card">
    <h2>ZICT Training</h2>
    <div class="sub">Phase 2 AWS Cloud Architect — Student Workbook</div>
    <input id="zw-name" type="text" placeholder="Full name (new accounts only)" autocomplete="name">
    <input id="zw-email" type="email" placeholder="Email" autocomplete="email">
    <input id="zw-pass" type="password" placeholder="Password" autocomplete="current-password">
    <button id="zw-signin">Sign In</button>
    <button id="zw-signup">Create Account</button>
    <button id="zw-reset">Forgot password?</button>
    <p id="zw-err"></p>
  </div>
</div>
<div id="zw-bar" hidden>
  <strong id="zw-user"></strong>
  <div id="zw-overall"><span></span></div>
  <span id="zw-opct">0%</span>
  <span class="grow"></span>
  <span id="zw-status"></span>
  <button id="zw-out">Sign Out</button>
</div>
`);

const $ = id => document.getElementById(id);
const err = m => $('zw-err').textContent = m;

const errMsg = c => ({
  'auth/invalid-credential':    'Wrong email or password.',
  'auth/user-not-found':        'No account with that email.',
  'auth/wrong-password':        'Wrong password.',
  'auth/email-already-in-use':  'Account exists — sign in instead.',
  'auth/weak-password':         'Password must be 6+ characters.',
  'auth/invalid-email':         'Enter a valid email address.',
  'auth/too-many-requests':     'Too many attempts. Wait a moment.',
  'auth/network-request-failed':'Network problem. Check your connection.',
}[c] || 'Something went wrong. Try again.');

$('zw-signin').onclick = () => {
  err('');
  signInWithEmailAndPassword(auth, $('zw-email').value.trim(), $('zw-pass').value)
    .catch(e => err(errMsg(e.code)));
};

$('zw-signup').onclick = async () => {
  err('');
  const name = $('zw-name').value.trim();
  if (!name) return err('Enter your full name to create an account.');
  try {
    const cred = await createUserWithEmailAndPassword(
      auth, $('zw-email').value.trim(), $('zw-pass').value);
    await updateProfile(cred.user, { displayName: name });
  } catch (e) { err(errMsg(e.code)); }
};

$('zw-reset').onclick = () => {
  const em = $('zw-email').value.trim();
  if (!em) return err('Enter your email first.');
  sendPasswordResetEmail(auth, em)
    .then(() => err('Reset email sent — check your inbox.'))
    .catch(e => err(errMsg(e.code)));
};

$('zw-out').onclick = () => signOut(auth);

$('zw-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('zw-signin').click();
});

/* ---------- 4. BUILD PANELS FROM EXISTING MARKUP ---------- */
// Reads each .assessment / .project-card, finds its evidence-box checklist,
// and converts those <li> items into real checkboxes + evidence fields.

const units = [];   // {id, title, items:[], el}

function buildPanels() {
  const blocks = document.querySelectorAll('.assessment[id], .project-card[id]');

  blocks.forEach(block => {
    const id = block.id;
    const titleEl = block.querySelector('.assessment-title, .project-card-header');
    const title = titleEl ? titleEl.textContent.trim() : id;

    // Collect every checklist item inside evidence boxes
    const items = [];
    block.querySelectorAll('.evidence-box ul.checklist li').forEach((li, i) => {
      items.push({ key: `${id}.e${i}`, html: li.innerHTML });
    });
    if (!items.length) return;

    const panel = document.createElement('div');
    panel.className = 'zw-panel';
    panel.dataset.unit = id;
    panel.innerHTML = `
      <div class="zw-head">
        <span class="zw-title">✅ My Evidence Checklist</span>
        <div class="zw-prog"><span></span></div>
        <span class="zw-pct">0%</span>
      </div>
      <div class="zw-items"></div>
      <div class="zw-field">
        <label>Evidence link (Google Drive folder, Imgur album, or GitHub path)</label>
        <input type="url" data-key="${id}.link" placeholder="https://drive.google.com/...">
      </div>
      <div class="zw-field">
        <label>Notes for instructor (optional)</label>
        <textarea data-key="${id}.notes" placeholder="Anything you want to flag..."></textarea>
      </div>
      <button class="zw-submit" data-unit="${id}">Submit for Grading</button>
      <div class="zw-slot"></div>
    `;

    const box = panel.querySelector('.zw-items');
    items.forEach(it => {
      box.insertAdjacentHTML('beforeend', `
        <div class="zw-check">
          <input type="checkbox" id="c_${it.key}" data-key="${it.key}">
          <label for="c_${it.key}">${it.html}</label>
        </div>`);
    });

    // Insert after the last evidence box in this block
    const boxes = block.querySelectorAll('.evidence-box');
    boxes[boxes.length - 1].after(panel);

    units.push({ id, title, items, el: panel });
  });
}

/* ---------- 5. STATE ---------- */
let uid = null, data = {}, grades = {}, saveTimer = null;

const fields = () => document.querySelectorAll('.zw-panel [data-key]');

function collect() {
  const out = {};
  fields().forEach(el => {
    out[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return out;
}

function apply(d) {
  fields().forEach(el => {
    const v = d[el.dataset.key];
    if (v === undefined) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  });
}

function refreshProgress() {
  let done = 0, total = 0;
  units.forEach(u => {
    const boxes = u.el.querySelectorAll('input[type=checkbox]');
    const n = [...boxes].filter(b => b.checked).length;
    const pct = boxes.length ? Math.round(n / boxes.length * 100) : 0;
    u.el.querySelector('.zw-prog span').style.width = pct + '%';
    u.el.querySelector('.zw-pct').textContent = pct + '%';
    done += n; total += boxes.length;
  });
  const overall = total ? Math.round(done / total * 100) : 0;
  $('zw-overall').firstElementChild.style.width = overall + '%';
  $('zw-opct').textContent = overall + '%';
}

function setStatus(t, ms) {
  $('zw-status').textContent = t;
  if (ms) setTimeout(() => { $('zw-status').textContent = ''; }, ms);
}

async function save() {
  if (!uid) return;
  setStatus('Saving…');
  try {
    await setDoc(doc(db, 'progress', uid), {
      fields: collect(),
      email: auth.currentUser.email,
      name: auth.currentUser.displayName || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setStatus('Saved', 2000);
  } catch (e) {
    setStatus('Save failed');
    console.error(e);
  }
}

/* ---------- 6. SUBMIT & LOCK ---------- */
function renderSubmitState(u) {
  const submitted = data[`${u.id}.submitted`];
  const btn = u.el.querySelector('.zw-submit');
  if (submitted) {
    u.el.classList.add('zw-locked');
    btn.disabled = true;
    btn.textContent = 'Submitted ✓';
    u.el.querySelectorAll('[data-key]').forEach(el => el.disabled = true);
  }
}

function renderGrade(u) {
  const slot = u.el.querySelector('.zw-slot');
  const g = grades[u.id];
  slot.innerHTML = '';
  if (g && g.score != null) {
    slot.innerHTML = `<div class="zw-grade">
      <span class="score">${g.score}/10</span>
      ${g.feedback ? `<div class="fb">${g.feedback}</div>` : ''}
    </div>`;
  } else if (data[`${u.id}.submitted`]) {
    slot.innerHTML = `<div class="zw-pending">Submitted — awaiting instructor grade.</div>`;
  }
}

document.addEventListener('click', async e => {
  const btn = e.target.closest('.zw-submit');
  if (!btn || btn.disabled) return;
  const u = units.find(x => x.id === btn.dataset.unit);
  const boxes = u.el.querySelectorAll('input[type=checkbox]');
  const n = [...boxes].filter(b => b.checked).length;
  if (n < boxes.length &&
      !confirm(`${boxes.length - n} item(s) unchecked. Submit anyway?`)) return;
  data[`${u.id}.submitted`] = true;
  data[`${u.id}.submittedAt`] = new Date().toISOString();
  await setDoc(doc(db, 'progress', uid), {
    fields: { ...collect(), [`${u.id}.submitted`]: true,
              [`${u.id}.submittedAt`]: new Date().toISOString() },
    email: auth.currentUser.email,
    name: auth.currentUser.displayName || '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  renderSubmitState(u);
  renderGrade(u);
});

/* ---------- 7. AUTOSAVE ---------- */
document.addEventListener('input', e => {
  if (!e.target.closest('.zw-panel') || !uid) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1200);
});
document.addEventListener('change', e => {
  if (!e.target.closest('.zw-panel') || !uid) return;
  refreshProgress();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 600);
});
window.addEventListener('beforeunload', () => { if (uid) save(); });

/* ---------- 8. AUTH STATE ---------- */
buildPanels();

onAuthStateChanged(auth, async user => {
  uid = user ? user.uid : null;
  $('zw-login').hidden = !!user;
  $('zw-bar').hidden = !user;
  document.body.style.overflow = user ? '' : 'hidden';
  if (!user) return;

  $('zw-user').textContent = user.displayName || user.email;

  // Load progress
  try {
    const snap = await getDoc(doc(db, 'progress', user.uid));
    data = snap.exists() ? (snap.data().fields || {}) : {};
    apply(data);
  } catch (e) { console.error('progress load', e); }

  // Load grades (read-only for students)
  try {
    const gs = await getDoc(doc(db, 'grades', user.uid));
    grades = gs.exists() ? (gs.data().units || {}) : {};
  } catch (e) { grades = {}; }

  units.forEach(u => { renderSubmitState(u); renderGrade(u); });
  refreshProgress();

  // Restore #a3 style anchor after login renders
  if (location.hash) {
    setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }
});
