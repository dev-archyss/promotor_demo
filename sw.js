const CACHE_NAME = 'chispa-app-v1';
const urlsToCache = [
  '/',
  '/index.html',  // O tu archivo principal
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.7/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.2/dist/umd/supabase.min.js'
  // Añade más assets si es necesario
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Para Background Sync (sync datos pendientes)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-visitas') {
    event.waitUntil(syncDataToSupabase());
  }
});

async function syncDataToSupabase() {
  const db = await openDB();
  const pendientes = await db.getAll('pendientes');
  for (let data of pendientes) {
    try {
      const { error } = await fetch('https://djjylikkocemrlsjxscr.supabase.co/rest/v1/web_precios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqanlsaWtrb2NlbXJsc2p4c2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjUyNDEsImV4cCI6MjA3ODc0MTI0MX0.fnv1BKn_o-PYEAPljG0V3dt3b2Uifwn8EEzkP8Aab3M',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqanlsaWtrb2NlbXJsc2p4c2NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjUyNDEsImV4cCI6MjA3ODc0MTI0MX0.fnv1BKn_o-PYEAPljG0V3dt3b2Uifwn8EEzkP8Aab3M'
        },
        body: JSON.stringify(data)
      });
      if (error) throw error;
      await db.delete('pendientes', data.id);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}

// Función para abrir IndexedDB (compartida con client JS)
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('chispaDB', 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore('pendientes', { autoIncrement: true });
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}