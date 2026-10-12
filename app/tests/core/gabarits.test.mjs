// Un texte d'interface appelé sans valeurs, `t('clé')`, ne doit pas contenir de gabarit {…} : t() le remplacerait par
// du vide. Trouvé le 12 octobre 2026 : « Cote {cote} sur 100 » donnait « Cote  sur 100 » (invisible à l'écran, le
// navigateur fusionne les deux espaces). Ce test balaie app/js/ et app/world/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../../', import.meta.url));
const files = (dir) => readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory()
  ? files(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : []));
const ui = JSON.parse(readFileSync(join(APP, 'content/fr-CA/interface.json'), 'utf8'));

test('aucun texte à gabarit appelé sans valeurs', () => {
  const fautes = [];
  let appels = 0;
  for (const f of [...files('js'), ...files('world')]) {
    const src = readFileSync(join(APP, f), 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"])([\w.-]+)\1\s*\)/g)) {
      appels++;
      const texte = ui[m[2]];
      if (typeof texte === 'string' && /\{\w+\}/.test(texte)) {
        fautes.push(`${f}:${src.slice(0, m.index).split('\n').length} ${m[2]} « ${texte} »`);
      }
    }
  }
  assert.ok(appels > 100, `trop peu d'appels trouvés (${appels}) : le motif ne suit plus le code`);
  assert.deepEqual(fautes, []);
});
