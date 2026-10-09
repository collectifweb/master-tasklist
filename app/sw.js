// Service worker de l'Orée : garde la coquille de l'app (page, styles, scripts, textes, monde) pour un lancement
// hors ligne. Les données passent par api/api.php : jamais mises en cache ici (la copie hors ligne des quêtes est
// celle du magasin, dans localStorage). Chemins relatifs : l'app peut vivre dans un sous-dossier.
// Changer VERSION à chaque déploiement qui touche la coquille : l'ancien cache est effacé à l'activation.
const VERSION = 'oree-coquille-v20';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'img/icon.svg',
  'img/icon-192.png',
  'img/icon-512.png',
  'design/icons.svg',
  'css/tokens.css', 'css/base.css', 'css/components.css', 'css/world.css', 'css/app.css',
  'js/main.js', 'js/store.js', 'js/content.js', 'js/api-client.js', 'js/world-bridge.js', 'js/horloge.js',
  'js/ui/announce.js', 'js/ui/dom.js', 'js/ui/format.js', 'js/ui/glyphs.js',
  'js/ui/batiment.js', 'js/ui/hud.js', 'js/ui/model.js', 'js/ui/quests.js', 'js/ui/sheets.js', 'js/ui/speech.js', 'js/ui/story.js', 'js/ui/sync.js', 'js/ui/bandeau.js', 'js/ui/catalogue.js', 'js/ui/quartier.js',
  'core/index.js', 'core/cote.js', 'core/domains.js', 'core/economy.js',
  'core/infer.js', 'core/ledger.js', 'core/letters.js', 'core/migrate.js', 'core/quests.js', 'core/recycling.js',
  'core/reward.js', 'core/state.js', 'core/time.js', 'core/village.js', 'core/batiments.js', 'core/objectifs.js', 'core/quartiers.js', 'core/reglages.js', 'core/visiteurs.js', 'core/imprevus.js', 'core/hiver.js', 'core/allure.js',
  'world/world.js', 'world/view.js', 'world/camera.js', 'world/fx.js', 'world/iso.js', 'world/layout.js', 'world/models.js',
  'world/moments.js', 'world/palette.js', 'world/habitants.js', 'world/plan.js', 'world/scene.js', 'world/terrain.js', 'world/texts.js', 'world/ticker.js',
  'content/fr-CA/interface.json', 'content/fr-CA/repliques.json', 'content/fr-CA/ancres.json',
  'content/fr-CA/lettres.json', 'content/fr-CA/batiments.json',
];

/**
 * Requêtes que le service worker laisse passer sans y toucher : tout sauf GET, ce qui sort de sa portée (autres
 * origines, fichiers du site hors de l'app), toute adresse avec une chaîne de requête (une entrée par variante) et l'API.
 */
function bypass(request) {
  if (request.method !== 'GET') return true;
  const url = new URL(request.url);
  if (!url.href.startsWith(self.registration.scope) || url.search) return true;
  return url.pathname.includes('/api/');
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // un fichier absent ne bloque pas l'installation : il sera pris au passage
    await Promise.all(SHELL.map((path) => cache.add(new Request(path, { cache: 'no-cache' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('oree-') && key !== VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Réseau d'abord (les mises à jour arrivent tout de suite), cache en repli hors ligne. Si le serveur répond en
// erreur (hébergement saturé : 503, 508…), la copie en cache du même fichier vaut mieux qu'une page d'erreur ;
// une adresse inconnue garde sa vraie réponse (404).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (bypass(request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response.ok ? response : (await cache.match(request)) || response;
    } catch (err) {
      const hit = await cache.match(request)
        || (request.mode === 'navigate' ? (await cache.match('./')) || (await cache.match('index.html')) : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
