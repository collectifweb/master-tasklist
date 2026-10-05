// Point d'entrée pour `node --test app/tests/core` : Node 24 n'accepte plus un dossier comme
// argument, il le résout comme un module. On charge donc ici tous les fichiers *.test.mjs.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.mjs')).sort()) {
  await import('./' + f);
}
