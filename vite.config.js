import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Ledger — small business books",
        short_name: "Ledger",
        description: "A complete small-business ledger: sales, purchases, inventory, expenses, accounts, tax and reports. Works offline.",
        start_url: "/#overview",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#F2F5F1",
        theme_color: "#2F6B47",
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
