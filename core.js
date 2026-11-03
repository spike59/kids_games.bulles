// Bulles : ce qui sert au jeu seul comme au jeu à plusieurs (bulles, son, score envoyé au classement de gameboard).
export const sky = document.getElementById('sky');
const scoreEl = document.getElementById('score');

// relatif : le jeu est servi sous /jeux/bulles/, l'API de gameboard est à la racine du site
const SCORES_URL = '../../api/v1/public-scores';
export const HOME_URL = '../../';
const NAME_KEY = 'bulles.player';
const SITE_NAME_KEY = 'kassir.player'; // le prénom est commun à tous les jeux du site (salon multijoueur compris)
export const NAME = /^[\p{L}\p{N}][\p{L}\p{N} '_-]{0,15}$/u; // mêmes règles que gameboard

// score = le score de la partie en cours ; board = le classement visé (« bulles » en solo, « bulles_multi » à plusieurs)
export const state = { score: 0, board: 'bulles', paused: false };
const sent = {}; // meilleur score déjà envoyé pendant cette visite, par classement
let audio = null;

export function setScore(n) {
  state.score = n;
  scoreEl.textContent = n;
}

export function popSound() {
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

// Une bulle qui monte. left : position en pixels. onPop() est appelée à la première pression.
export function makeBubble({ size, hue, duration, drift, left, onPop }) {
  const b = document.createElement('div');
  b.className = 'bubble';
  b.style.setProperty('--size', `${size}px`);
  b.style.setProperty('--hue', hue);
  b.style.setProperty('--duration', `${duration}s`);
  b.style.setProperty('--drift', `${drift}px`);
  b.style.left = `${left}px`;
  // la bulle extérieure monte, la balle intérieure éclate : les deux animations ne se marchent pas dessus
  const ball = document.createElement('div');
  ball.className = 'ball';
  b.append(ball);
  b.addEventListener('pointerdown', () => {
    if (b.classList.contains('popped') || state.paused) return;
    pop(b);
    onPop?.();
  });
  // fin de la montée ou fin de l'éclatement : dans les deux cas on retire la bulle
  b.addEventListener('animationend', () => b.remove());
  sky.append(b);
  return b;
}

export function pop(b, withSound = true) {
  if (b.classList.contains('popped')) return;
  b.classList.add('popped');
  if (withSound) { popSound(); navigator.vibrate?.(15); }
}

// --- envoi du score ---
export const savedName = () => {
  try { return localStorage.getItem(NAME_KEY) || localStorage.getItem(SITE_NAME_KEY) || ''; } catch { return ''; }
};
export const saveName = (name) => {
  try { localStorage.setItem(NAME_KEY, name); localStorage.setItem(SITE_NAME_KEY, name); } catch { /* navigation privée : tant pis */ }
};
export const cleanName = (s) => s.normalize('NFC').trim().replace(/\s+/g, ' ');

// keepalive : la requête part même si la page se ferme. Ne lève jamais : on ne bloque pas un enfant qui veut partir.
// Le classement ne garde que le meilleur score : on n'envoie donc que si on a fait mieux que tout ce qu'on a déjà envoyé.
export async function sendScore(player, board = state.board, score = state.score) {
  if (score <= 0 || score <= (sent[board] ?? 0) || !NAME.test(player)) return false;
  sent[board] = score;
  try {
    const res = await fetch(SCORES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'bulles', board, entries: [{ player, value: score }] }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Quitter, mettre en pause, fermer ou changer d'appli : le score part si le prénom est déjà connu (pas de fenêtre possible à ce moment).
export function flushScore() {
  const player = cleanName(savedName());
  if (player) sendScore(player);
}

export function hasUnsent(board = state.board) {
  return state.score > 0 && state.score > (sent[board] ?? 0);
}
