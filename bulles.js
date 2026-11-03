// Bulles : des bulles montent, on les éclate du doigt. Seul : pas de perdant. À plusieurs : voir multi.js.
// Le score part au classement de gameboard (jeux.kassir.fr) quand on quitte ou qu'on met en pause (s'il bat le record), ou quand on
// ferme la page / change d'appli (si le prénom est déjà connu).
import { sky, state, setScore, makeBubble, HOME_URL, NAME, savedName, saveName, cleanName, sendScore, flushScore, hasUnsent } from './core.js';

const HUES = ['#ff6b9d', '#ffd23f', '#6bf178', '#b28dff', '#ff9f43', '#4dd4ff'];
const MAX_BUBBLES = 12;

let solo = true; // faux dès qu'on joue à plusieurs : multi.js amène alors ses propres bulles

function spawn() {
  if (!solo || state.paused || sky.childElementCount >= MAX_BUBBLES) return;
  const size = 60 + Math.random() * 60;
  makeBubble({
    size,
    hue: HUES[Math.floor(Math.random() * HUES.length)],
    duration: 5 + Math.random() * 4,
    drift: (Math.random() - 0.5) * 120,
    left: Math.random() * (window.innerWidth - size),
    onPop: () => setScore(state.score + 1),
  });
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushScore(); });
window.addEventListener('pagehide', flushScore);

// --- pause ---
const pauseBtn = document.getElementById('pause');
const pauseDialog = document.getElementById('pause-dialog');
let multi = null; // module multi.js, chargé à la demande

function setPaused(on) {
  state.paused = on;
  document.body.classList.toggle('paused', on);
  pauseBtn.textContent = on ? '▶' : '⏸';
  pauseBtn.setAttribute('aria-label', on ? 'Reprendre' : 'Pause');
}

pauseBtn.addEventListener('click', () => {
  flushScore(); // en pause, le score est déjà au classement s'il bat le record
  if (!solo) return pauseDialog.showModal(); // à plusieurs, la partie continue pour les autres : on ouvre juste le menu
  setPaused(!state.paused);
});
document.getElementById('pause-form').addEventListener('submit', (event) => {
  if (event.submitter?.value === 'quit') { event.preventDefault(); leave(); }
});

// --- bouton Quitter ---
const dialog = document.getElementById('finish');
const nameInput = document.getElementById('name');
const hint = document.getElementById('finish-hint');
const goHome = () => { location.href = HOME_URL; };

async function leave() {
  await multi?.leaveRoom();
  goHome();
}

document.getElementById('quit').addEventListener('click', () => {
  flushScore();
  if (!hasUnsent()) return leave();
  document.getElementById('finish-score').textContent = state.score;
  nameInput.value = savedName();
  hint.hidden = true;
  dialog.showModal();
});

document.getElementById('finish-form').addEventListener('submit', async (event) => {
  const action = event.submitter?.value;
  if (action === 'stay') return; // la boîte se ferme, la partie continue
  if (action === 'skip') { event.preventDefault(); return leave(); }
  // action « send »
  event.preventDefault();
  const player = cleanName(nameInput.value);
  if (!NAME.test(player)) {
    hint.textContent = "Un prénom de 1 à 16 lettres ou chiffres, s'il te plaît.";
    hint.hidden = false;
    return;
  }
  saveName(player);
  event.submitter.disabled = true;
  await sendScore(player); // un échec (hors ligne) ne retient personne
  leave();
});

// --- à plusieurs ---
document.getElementById('multi-btn').addEventListener('click', async () => {
  multi ??= await import('./multi.js');
  multi.open({
    onStart() { solo = false; setPaused(false); sky.replaceChildren(); },
    onStop() { solo = true; sky.replaceChildren(); setScore(0); state.board = 'bulles'; },
  });
});

setInterval(spawn, 700);
spawn();
