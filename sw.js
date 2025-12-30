const CACHE_NAME = 'chispa-app-v1';
// IMPORTANTE: En GitHub Pages, usa rutas relativas './' para evitar errores 404
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.2/dist/umd/supabase.min.js'
];

// Instalación: Guardar archivos esenciales en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta con éxito');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Fallo al cachear assets:', err))
  );
});

// Estrategia: Network First, falling back to Cache
// Esto asegura que si hay internet, descargue lo nuevo, si no, use lo guardado
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la red responde, clonamos y guardamos en caché
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red (offline), buscamos en caché
        return caches.match(event.request);
      })
  );
});

// --- Lógica de Sincronización en Segundo Plano ---

self.addEventListener('sync', event => {
  if (event.tag === 'sync-visitas') {
    event.waitUntil(syncDataToSupabase());
  }
});

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chispaDB', 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendientes')) {
        db.createObjectStore('pendientes', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}

async function syncDataToSupabase() {
  const db = await openDB();
  const tx = db.transaction('pendientes', 'readonly');
  const store = tx.objectStore('pendientes');
  
  // Usamos una promesa para obtener todos los registros
  const pendientes = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  for (let data of pendientes) {
    try {
      const response = await fetch('https://djjylikkocemrlsjxscr.supabase.co/rest/v1/web_precios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqanlsaWtrb2NlbXJsc2p4c2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjUyNDEsImV4cCI6MjA3ODc0MTI0MX0.fnv1BKn_o-PYEAPljG0V3dt3b2Uifwn8EEzkP8Aab3M',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqanlsaWtrb2NlbXJsc2p4c2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjUyNDEsImV4cCI6MjA3ODc0MTI0MX0.fnv1BKn_o-PYEAPljG0V3dt3b2Uifwn8EEzkP8Aab3M',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const deleteTx = db.transaction('pendientes', 'readwrite');
        await deleteTx.objectStore('pendientes').delete(data.id);
        console.log('Registro sincronizado y borrado de IndexedDB');
      }
    } catch (err) {
      console.error('Error sincronizando registro:', err);
    }
  }
}
