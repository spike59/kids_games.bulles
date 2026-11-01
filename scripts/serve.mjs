// Essai local : sert le dossier sous /jeux/bulles/ sur http://127.0.0.1:5190/jeux/bulles/
// Les scores ne partent pas (pas de gameboard ici) : l'envoi échoue sans bruit et « Quitter » ramène à /.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const BASE = '/jeux/bulles/';

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (!path.startsWith(BASE)) { res.writeHead(302, { location: BASE }); return res.end(); }
  const name = path.slice(BASE.length) || 'index.html';
  try {
    if (name.includes('..')) throw new Error('chemin');
    res.writeHead(200, { 'content-type': TYPES[extname(name)] || 'application/octet-stream' });
    res.end(await readFile(join(ROOT, name)));
  } catch {
    res.writeHead(404);
    res.end('introuvable');
  }
}).listen(5190, '127.0.0.1', () => console.log(`http://127.0.0.1:5190${BASE}`));
