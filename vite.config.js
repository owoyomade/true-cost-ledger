import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "TrueCost Ledger",
        short_name: "TrueCost",
        description: "Bookkeeping for product sellers: true landed cost per item, real profit, stock, expenses, tax and reports. Works offline.",
        start_url: "/#overview",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#FAF7F5",
        theme_color: "#4A2545",
        categories: ["business", "finance", "productivity"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "Add sale", url: "/?new=sale#sales", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Add purchase", url: "/?new=order#orders", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Add expense", url: "/?new=cost#costs", icons: [{ src: "icon-192.png", sizes: "192x192" }] }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html"
      }
    })
  ],
  test: {
    environment: "node"
  }
});
