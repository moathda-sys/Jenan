// يحفظ ملفات المنصة على الجهاز لتفتح بدون إنترنت.
// البيانات نفسها لا تُخزَّن هنا (طابور الإرسال في IndexedDB، وآخر نسخة من البنود في التخزين المحلي).
const VERSION = 'jenan-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-180.png'];
const CACHE_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (!same && !CACHE_HOSTS.includes(url.hostname)) return; // Supabase وغيره: مباشرة من الشبكة

  // الصفحة: الشبكة أولًا (مع مهلة قصيرة) ثم النسخة المحفوظة
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3500))]);
        if (res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // بقية الملفات: من الجهاز فورًا، وتحديث في الخلفية
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
