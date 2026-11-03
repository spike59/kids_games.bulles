// Bulles à plusieurs : salon (serveur, chat, salles), salle d'attente, partie et résultats.
// Le serveur (hub de gameboard, serveur01) décide de tout : il crée les bulles et compte les points.
// Ici on affiche ce qu'il envoie et on lui dit « j'éclate la bulle 12 ». Chacun a une couleur : sa couleur = +1 point,
// la couleur d'un autre = −5 points. Le contour de l'écran prend la couleur des bulles qu'on doit éclater.
import { sky, state, setScore, makeBubble, pop, savedName, saveName, cleanName, NAME, flushScore } from './core.js';

const $ = (id) => document.getElementById(id);
const dlg = $('multi');
const panels = { login: $('m-login'), lobby: $('m-lobby'), room: $('m-room'), result: $('m-result') };
const GAME = 'bulles';

let ws = null;
let hooks = {};
let intent = null; // arrivée depuis le salon du site : { room } pour rejoindre, { create: true } pour créer
let me = null; // { id, name }
let room = null; // la salle où l'on est (état envoyé par le serveur)
let mode = 'login'; // login | lobby | room | playing | result
let pingTimer = 0;
let clockTimer = 0;
let endsAt = 0;
const bubbles = new Map(); // id de bulle -> élément

function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter((k) => k != null));
  return node;
}
const say = (id, text) => { const n = $(id); n.textContent = text; n.hidden = !text; };

function show(name) {
  mode = name;
  for (const [k, p] of Object.entries(panels)) p.hidden = k !== name;
}
const send = (m) => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };
const myColor = () => room?.players.find((p) => p.id === me?.id)?.color ?? '#ffffff';

export function open(h) {
  hooks = h;
  intent = h.intent ?? null;
  $('m-name').value = savedName();
  say('m-hint', '');
  show('login');
  if (!dlg.open) dlg.showModal();
  $('m-name').focus();
  // venu du salon avec un prénom déjà connu : on entre directement
  if (intent && NAME.test(cleanName(savedName()))) connect(cleanName(savedName()));
}

function connect(name) {
  const url = new URL('../../api/v1/hub', location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  say('m-hint', 'Connexion…');
  ws = new WebSocket(url);
  ws.onopen = () => send({ t: 'hello', name });
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch { /* message illisible : ignoré */ } };
  ws.onerror = () => say('m-hint', 'Impossible de joindre le serveur.');
  ws.onclose = () => {
    clearInterval(pingTimer);
    if (mode === 'playing' || mode === 'result' || mode === 'room' || mode === 'lobby') {
      say('m-hint', 'Connexion perdue.');
      stopPlay();
      show('login');
      if (!dlg.open) dlg.showModal();
    }
    ws = null;
  };
}

function onMessage(m) {
  switch (m.t) {
    case 'welcome': {
      me = { id: m.id, name: m.name };
      $('m-server').textContent = m.server.name;
      $('m-chat').replaceChildren();
      for (const line of m.history ?? []) chat(line);
      show('lobby');
      if (intent) { send(intent.room ? { t: 'join', room: intent.room } : { t: 'create', game: GAME }); intent = null; }
      ping();
      pingTimer = setInterval(ping, 2000);
      break;
    }
    case 'pong': $('m-ping').textContent = `${Math.max(1, Date.now() - m.n)} ms`; break;
    case 'chat': chat(m); break;
    case 'rooms': if (m.game === GAME) renderRooms(m.rooms); break;
    case 'room': onRoom(m.room); break;
    case 'start': startPlay(m); break;
    case 'spawn': spawn(m.b); break;
    case 'popped': onPopped(m); break;
    case 'end': endPlay(m.scores); break;
    case 'error': say(mode === 'login' ? 'm-hint' : mode === 'room' ? 'm-room-hint' : 'm-lobby-hint', m.text); break;
    default: break;
  }
}

const ping = () => send({ t: 'ping', n: Date.now() });

// --- salon ---
function chat({ from, text }) {
  const log = $('m-chat');
  log.append(el('p', {}, el('b', { textContent: `${from} : ` }), text));
  while (log.childElementCount > 40) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}

function renderRooms(list) {
  say('m-lobby-hint', '');
  $('m-rooms').replaceChildren(...(list.length ? list.map((r) => {
    const btn = el('button', { type: 'button', textContent: 'Rejoindre', disabled: r.status !== 'waiting' || r.players >= r.max });
    btn.addEventListener('click', () => send({ t: 'join', room: r.id }));
    return el('li', {}, el('span', { textContent: `${r.name} · ${r.players}/${r.max}${r.status === 'waiting' ? '' : ' · en cours'}` }), btn);
  }) : [el('li', { className: 'empty', textContent: 'Aucune salle : crée la tienne !' })]));
}

// --- salle ---
function onRoom(r) {
  room = r;
  if (mode === 'playing') { renderHud(); return; }
  if (r.status === 'finished') return; // les résultats arrivent avec « end »
  show('room');
  say('m-room-hint', '');
  $('m-room-title').textContent = r.name;
  $('m-players').replaceChildren(...r.players.map((p) => {
    const dot = el('i', { className: 'dot' });
    dot.style.setProperty('--c', p.color);
    return el('li', {}, dot, el('span', { textContent: p.name + (p.id === r.owner ? ' 👑' : '') + (p.id === me.id ? ' (toi)' : '') }));
  }));
  const owner = r.owner === me.id;
  $('m-start').hidden = !owner;
  $('m-start').disabled = r.players.length < r.min;
  $('m-wait').textContent = owner ? (r.players.length < r.min ? `Il faut au moins ${r.min} joueurs.` : 'Tout le monde est prêt ? Lance la partie !') : 'En attente du lancement par le chef de la salle…';
}

// --- partie ---
function startPlay(m) {
  endsAt = performance.now() + m.roundMs; // l'horloge du serveur n'est pas la nôtre : on ne garde que la durée de la manche
  mode = 'playing';
  hooks.onStart?.();
  bubbles.clear();
  state.board = 'bulles_multi';
  setScore(0);
  document.body.classList.add('multi');
  document.body.style.setProperty('--me', myColor());
  $('hud').hidden = false;
  renderHud();
  clearInterval(clockTimer);
  clockTimer = setInterval(() => {
    $('hud-time').textContent = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
  }, 250);
  if (dlg.open) dlg.close();
}

function renderHud() {
  $('hud-players').replaceChildren(...room.players.map((p) => {
    const chip = el('span', { className: `chip${p.id === me.id ? ' me' : ''}` }, el('i', { className: 'dot' }), `${p.name} ${p.score}`);
    chip.firstChild.style.setProperty('--c', p.color);
    return chip;
  }));
}

function spawn(b) {
  const left = b.x * (window.innerWidth - b.size);
  const node = makeBubble({
    size: b.size, hue: b.color, duration: b.dur / 1000, drift: b.drift, left,
    onPop: () => send({ t: 'pop', b: b.id }), // l'éclat s'affiche tout de suite ; le serveur dit ensuite qui l'a eu
  });
  bubbles.set(b.id, node);
  node.addEventListener('animationend', () => bubbles.delete(b.id));
}

function onPopped({ b, by, delta, score }) {
  const node = bubbles.get(b);
  if (node) pop(node, false); // le son est déjà joué chez celui qui a éclaté
  const p = room?.players.find((x) => x.id === by);
  if (p) p.score = score;
  if (by === me.id) {
    setScore(score);
    if (delta < 0) {
      const frame = $('frame');
      frame.classList.remove('penalty');
      void frame.offsetWidth; // relance l'animation
      frame.classList.add('penalty');
    }
  }
  renderHud();
}

function stopPlay() {
  clearInterval(clockTimer);
  document.body.classList.remove('multi');
  $('hud').hidden = true;
  bubbles.clear();
}

function endPlay(scores) {
  const mine = scores.find((s) => s.id === me.id);
  if (mine) setScore(mine.score);
  flushScore(); // fin de manche : le score part au classement s'il bat le record
  mode = 'result';
  stopPlay();
  sky.replaceChildren();
  $('m-scores').replaceChildren(...scores.map((s, i) => {
    const dot = el('i', { className: 'dot' });
    dot.style.setProperty('--c', s.color);
    return el('li', {}, el('b', { textContent: `${i + 1}.` }), dot, el('span', { textContent: `${s.name}${s.id === me.id ? ' (toi)' : ''}` }), el('strong', { textContent: String(s.score) }));
  }));
  $('m-again').hidden = room.owner !== me.id;
  show('result');
  if (!dlg.open) dlg.showModal();
}

export async function leaveRoom() {
  clearInterval(pingTimer);
  stopPlay();
  if (ws) {
    send({ t: 'leave' });
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  room = null;
  mode = 'login';
  hooks.onStop?.();
}

// --- boutons ---
$('m-login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cleanName($('m-name').value);
  if (!NAME.test(name)) return say('m-hint', "Un prénom de 1 à 16 lettres ou chiffres, s'il te plaît.");
  saveName(name);
  connect(name);
});
$('m-create').addEventListener('click', () => send({ t: 'create', game: GAME }));
$('m-start').addEventListener('click', () => send({ t: 'start' }));
$('m-leave').addEventListener('click', () => { send({ t: 'leave' }); room = null; show('lobby'); send({ t: 'rooms', game: GAME }); });
$('m-again').addEventListener('click', () => { send({ t: 'again' }); });
$('m-result-leave').addEventListener('click', async () => { send({ t: 'leave' }); await leaveRoom(); dlg.close(); });
$('m-chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('m-chat-text');
  if (input.value.trim()) send({ t: 'chat', text: input.value });
  input.value = '';
});
// fermer la fenêtre (✕ ou Échap) hors partie = quitter le salon
dlg.addEventListener('close', () => { if (mode !== 'playing') leaveRoom(); });
$('m-close').addEventListener('click', () => dlg.close());
