// « Build » de Bulles : il n'y a rien à compiler, on copie les fichiers listés dans game.json vers dist/.
// Le déploiement (stack WEB_STACK) copie ensuite dist/ dans web/jeux.kassir.fr/jeux/bulles/.
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { files } = JSON.parse(readFileSync(join(ROOT, 'game.json'), 'utf8'));
const OUT = join(ROOT, 'dist');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of files) cpSync(join(ROOT, f), join(OUT, f));
console.log(`dist/ : ${files.length} fichiers`);
