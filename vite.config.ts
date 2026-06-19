import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { foodSearchProxyPlugin } from "./server/food-search-proxy";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    foodSearchProxyPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Анжелика — план тренировок",
        short_name: "Pulse Plan",
        description: "Персональный план тренировок, питания и прогресса",
        theme_color: "#080907",
        background_color: "#080907",
        display: "standalone",
        orientation: "portrait",
        lang: "ru",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,webp,gif,wasm,png,jpg,webmanifest}"],
        importScripts: ["reminder-sw.js"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.method === "GET" && url.pathname.startsWith("/exercises/"),
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-media",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
