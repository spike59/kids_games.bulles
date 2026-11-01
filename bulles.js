// Bulles : des bulles montent, on les éclate du doigt. Pas de perdant.
// Aucun serveur : le jeu tourne dans le navigateur. Le score part au classement de gameboard (jeux.kassir.fr)
// quand on quitte : bouton « Quitter » (avec le prénom), ou fermeture / changement d'appli (si le prénom est déjà connu).

const sky = document.getElementById('sky');
const scoreEl = document.getElementById('score');
const HUES = ['#ff6b9d', '#ffd23f', '#6bf178', '#b28dff', '#ff9f43', '#4dd4ff'];
const MAX_BUBBLES = 12;

const GAME = 'bulles';
const BOARD = 'bulles';
// relatif : le jeu est servi sous /jeux/bulles/, l'API de gameboard est à la racine du site
const SCORES_URL = '../../api/v1/public-scores';
const HOME_URL = '../../';
const NAME_KEY = 'bulles.player';
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} '_-]{0,15}$/u; // mêmes règles que gameboard

let score = 0;
let sent = 0; // meilleur score déjà envoyé pendant cette visite
let audio = null;

function popSound() {
  // Son généré (pas de fichier à charger). Le contexte audio exige un geste de l'utilisateur.
  audio ??= new AudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  osc.frequency.setValueAtTime(500 + Math.random() * 500, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

function spawn() {
  if (sky.childElementCount >= MAX_BUBBLES) return;
  const size = 60 + Math.random() * 60;
  const b = document.createElement('div');
  b.className = 'bubble';
  b.style.setProperty('--size', `${size}px`);
  b.style.setProperty('--hue', HUES[Math.floor(Math.random() * HUES.length)]);
  b.style.setProperty('--duration', `${5 + Math.random() * 4}s`);
  b.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
  b.style.left = `${Math.random() * (window.innerWidth - size)}px`;
  // la bulle extérieure monte, la balle intérieure éclate : les deux animations ne se marchent pas dessus
  const ball = document.createElement('div');
  ball.className = 'ball';
  b.append(ball);

  b.addEventListener('pointerdown', () => {
    if (b.classList.contains('popped')) return;
    b.classList.add('popped');
    popSound();
    navigator.vibrate?.(15);
    scoreEl.textContent = ++score;
  });
  // fin de la montée ou fin de l'éclatement : dans les deux cas on retire la bulle
  b.addEventListener('animationend', () => b.remove());
  sky.append(b);
}

// --- envoi du score ---
const savedName = () => {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
};
const cleanName = (s) => s.normalize('NFC').trim().replace(/\s+/g, ' ');

// keepalive : la requête part même si la page se ferme. Ne lève jamais : on ne bloque pas un enfant qui veut partir.
async function sendScore(player) {
  if (score <= 0 || score <= sent || !NAME.test(player)) return false;
  sent = score;
  try {
    const res = await fetch(SCORES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: GAME, board: BOARD, entries: [{ player, value: score }] }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// fermeture ou changement d'appli : on n'envoie que si le prénom est déjà connu (pas de fenêtre possible à ce moment)
function sendOnLeave() {
  const player = cleanName(savedName());
  if (player) sendScore(player);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendOnLeave(); });
window.addEventListener('pagehide', sendOnLeave);

// --- bouton Quitter ---
const dialog = document.getElementById('finish');
const nameInput = document.getElementById('name');
const hint = document.getElementById('finish-hint');
const goHome = () => { location.href = HOME_URL; };

document.getElementById('quit').addEventListener('click', () => {
  if (score <= 0 || score <= sent) return goHome();
  document.getElementById('finish-score').textContent = score;
  nameInput.value = savedName();
  hint.hidden = true;
  dialog.showModal();
});

document.getElementById('finish-form').addEventListener('submit', async (event) => {
  const action = event.submitter?.value;
  if (action === 'stay') return; // la boîte se ferme, la partie continue
  if (action === 'skip') { event.preventDefault(); return goHome(); }
  // action « send »
  event.preventDefault();
  const player = cleanName(nameInput.value);
  if (!NAME.test(player)) {
    hint.textContent = "Un prénom de 1 à 16 lettres ou chiffres, s'il te plaît.";
    hint.hidden = false;
    return;
  }
  try { localStorage.setItem(NAME_KEY, player); } catch { /* navigation privée : tant pis */ }
  event.submitter.disabled = true;
  await sendScore(player); // un échec (hors ligne) ne retient personne
  goHome();
});

setInterval(spawn, 700);
spawn();
