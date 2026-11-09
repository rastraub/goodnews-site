/**
 * App shell and the latest homepage, for offline reading.
 * Online requests use the network first and the browser's normal HTTP cache,
 * so a deploy, ISR, and Vercel cache headers stay in charge.
 * RSS, sitemaps, AMP web stories, embeds, print pages, and APIs are not intercepted.
 */
const CACHE = "goodnews-shell-v1";

function passThrough(pathname) {
  if (pathname.endsWith(".xml")) return true;
  if (pathname.includes("sitemap")) return true;
  if (pathname === "/embed" || pathname.startsWith("/embed/") || pathname === "/embed.js") return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.includes("/print")) return true;
  if (/^\/web-stories\/\d{4}-\d{2}-\d{2}(?:\/|$)/.test(pathname)) return true;
  return false;
}

function shouldCache(pathname) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname.startsWith("/brand/")) return true;
  if (pathname === "/icon" || pathname.startsWith("/icon")) return true;
  if (pathname === "/apple-icon") return true;
  return false;
}

function networkFirst(request) {
  const url = new URL(request.url);
  const network = fetch(url.toString(), { credentials: "same-origin", redirect: "follow", cache: "default" });
  return network
    .then(function (response) {
      if (response && response.ok && response.type === "basic") {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then(function (cache) {
            return cache.put(url.toString(), copy);
          })
          .catch(function () {});
      }
      return response;
    })
    .catch(function () {
      return caches.match(url.toString()).then(function (cached) {
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("/");
        return Response.error();
      });
    });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.add(new Request("/", { credentials: "same-origin", cache: "default" }));
      })
      .then(function () {
        return self.skipWaiting();
      })
      .catch(function () {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.startsWith("goodnews-shell-") && key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (passThrough(url.pathname)) return;
  if (!shouldCache(url.pathname)) return;
  event.respondWith(networkFirst(request));
});
