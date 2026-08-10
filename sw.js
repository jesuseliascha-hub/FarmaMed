// Farmacopedia — Service Worker
// Estrategia: cache-first con revalidación en segundo plano ("stale-while-revalidate").
// Sube este archivo junto a index.html y manifest.json al mismo hosting.
//
// IMPORTANTE PARA ACTUALIZACIONES:
// Cada vez que publiques cambios, sube también un CACHE_VERSION nuevo (ej. 'v2', 'v3'...).
// Eso obliga a los teléfonos que ya tienen la app instalada a descargar la versión nueva
// la próxima vez que abran con conexión, sin necesitar reinstalar nada.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `farmacopedia-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// ---- Instalación: precachea el shell de la app ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ---- Activación: borra cachés de versiones antiguas ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('farmacopedia-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: cache-first con revalidación en segundo plano ----
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // No cachear llamadas a APIs externas (búsquedas, etc.) — solo el shell de la app.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // sin conexión: usa lo que haya en caché

      // Si hay algo en caché, lo servimos de inmediato y actualizamos en segundo plano.
      return cached || networkFetch;
    })
  );
});

// Permite que la página fuerce la activación inmediata de una nueva versión
// (por ejemplo, tras mostrar un aviso de "hay una actualización disponible").
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
