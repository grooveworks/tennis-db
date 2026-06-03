// Tennis DB v4 Service Worker — App Shell + vendor pre-cache (4.7.32-S17 R1-2 Stage 2)
// 設計: DESIGN_LOG.md 2026-05-21 R1-2 Service Worker / App Shell エントリ参照
// 前提: 4.7.31-S17 で CDN 依存除去済 (v4/vendor/ 同一オリジン化)、本 SW で Cache Storage に固定
//
// 重要:
// - APP_VERSION は src/core/01_constants.js と手動同期、push 毎に両方を同じ値で更新
// - 4.8.6: skipWaiting() + clients.claim() で自動更新化 (旧設計の「全タブ閉じ待ち」がスマホで更新不達の元凶だったため反転)
// - 外部ドメイン (firestore.googleapis.com / api.open-meteo.com 等) は intercept しない (pass-through)
// - navigation request は shell-first で ./index.html を返す (query 違いを吸収)
// - 静的アセット fetch は ignoreSearch で bundle-heavy.js?v=... 等を hit
// - pre-cache 対象 16 ファイル固定 (LICENSE 除外、scope 相対)
//   GitHub Pages 本番 (/tennis-db/v4/) と localhost (/v4/) の両方で動作

const APP_VERSION = "4.8.6-S17";
const CACHE_NAME = `tennisdb-${APP_VERSION}`;

const PRECACHE = [
  "./index.html",
  "./bundle-heavy.js",
  "./vendor/firebase/firebase-app-compat.js",
  "./vendor/firebase/firebase-auth-compat.js",
  "./vendor/firebase/firebase-firestore-compat.js",
  "./vendor/firebase/firebase-functions-compat.js",
  "./vendor/react/react.production.min.js",
  "./vendor/react/react-dom.production.min.js",
  "./vendor/phosphor/regular/style.css",
  "./vendor/phosphor/regular/Phosphor.woff2",
  "./vendor/phosphor/duotone/style.css",
  "./vendor/phosphor/duotone/Phosphor-Duotone.woff2",
  "./vendor/phosphor/fill/style.css",
  "./vendor/phosphor/fill/Phosphor-Fill.woff2",
  "./vendor/phosphor/bold/style.css",
  "./vendor/phosphor/bold/Phosphor-Bold.woff2",
];

// install: 新 cache 開いて pre-cache。1 件でも fail で install fail (旧 SW 維持、fail-safe)
self.addEventListener("install", (event) => {
  // 4.8.6: 新版を即適用 (全タブ閉じ待ちを廃止 = スマホで「最新にリロードできない」元凶を解消)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

// activate: 旧 cache 削除 ("tennisdb-" prefix のうち現行以外)
self.addEventListener("activate", (event) => {
  // 旧 cache 削除 → 起動中クライアントを新 SW が掌握 (controllerchange を発火 → _head.html 側で 1 回だけ reload)
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith("tennisdb-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// fetch: navigation = shell-first / 同一オリジン静的アセット = ignoreSearch / 外部 = pass-through
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 外部ドメインは intercept しない
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navigation request は shell-first (query 違いを吸収)
  if (req.mode === "navigate") {
    const shellUrl = new URL("./index.html", self.registration.scope).href;
    event.respondWith(
      caches.match(shellUrl).then((res) => res || fetch(req))
    );
    return;
  }

  // 同一オリジン静的アセットは ignoreSearch (bundle-heavy.js?v=... 等を hit)
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((res) => res || fetch(req))
  );
});
