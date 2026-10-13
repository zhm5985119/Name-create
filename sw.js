// 离线缓存：第一次打开时把全部文件存到手机上，之后断网也能用；文件更新后版本号变化，自动换新
const CACHE = 'namer-ee668a3149';
const ASSETS = ["./", "chars.json", "engine.js", "html2canvas.min.js", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "index.html", "lookup.json", "lunar.js", "manifest.webmanifest", "names.json", "poems.json", "fonts/longcang.woff2", "fonts/mashanzheng.woff2", "fonts/wenkai.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || caches.match(e.request, { ignoreSearch: true })).then(r => r || fetch(e.request)));
});
