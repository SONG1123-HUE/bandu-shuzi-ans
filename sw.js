/* 离线版缓存：第一次联网打开后，整本书都存到本地 */
const CACHE = 'bandu-off-v1';
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const base = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'data/book.json'];
    await Promise.all(base.map(u => c.add(u).catch(() => {})));
    let total = 0;
    try {
      const meta = await fetch('data/book.json').then(r => r.json());
      total = meta.pages || 0;
    } catch (e) {}
    const pad = n => String(n).padStart(4, '0');
    for (let i = 1; i <= total; i += 16) {
      const batch = [];
      for (let j = i; j < Math.min(i + 16, total + 1); j++) batch.push('pages/' + pad(j) + '.jpg');
      await Promise.all(batch.map(u => c.add(u).catch(() => {})));
      if (i % 96 === 1) {
        clients.matchAll().then(cs => cs.forEach(cl => cl.postMessage({ type: 'progress', done: i, total })));
      }
    }
    clients.matchAll().then(cs => cs.forEach(cl => cl.postMessage({ type: 'cached', total })));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
