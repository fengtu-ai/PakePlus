/* ============================================================
 * PakePlus PWA Service Worker
 * 必须通过 http:// 或 https:// 访问才能生效 (file:// 无法注册)
 * 部署时请跟随本文件一起上传, 保持与 index.html 同目录
 * ============================================================ */

const CACHE_NAME = 'pakeplus-pwa-cache-v1';

const urlsToCache = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-32.png',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] 预缓存部分资源失败:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    // 页面导航: 网络优先, 离线时回退到缓存的 index.html
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then(
                        (cached) => cached || caches.match('./index.html')
                    )
                )
        );
        return;
    }

    // 静态资源: 缓存优先, 未命中时网络请求并写入缓存
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            }).catch(() => new Response('', { status: 504, statusText: 'Offline' }));
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
