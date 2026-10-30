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
        lang: "en",
        dir: "ltr",
        // Shown in browser install dialogs and checked by app-store packagers such as PWABuilder.
        screenshots: [
          { src: "screenshots/desktop-overview.png", sizes: "1440x900", type: "image/png", form_factor: "wide", label: "Overview: revenue, real profit, cash and stock at a glance" },
          { src: "screenshots/desktop-purchases.png", sizes: "1440x900", type: "image/png", form_factor: "wide", label: "Purchases with the true landed cost per unit" },
          { src: "screenshots/desktop-reports.png", sizes: "1440x900", type: "image/png", form_factor: "wide", label: "Profit and loss and other reports, ready to print" },
          { src: "screenshots/phone-overview.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Your business numbers on your phone" },
          { src: "screenshots/phone-purchase-sheet.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Add a purchase and see the cost per unit" },
          { src: "screenshots/phone-reports.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Reports on the go" }
        ],
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
        // Store screenshots are only for install dialogs, so they aren't downloaded for offline use.
        globIgnores: ["screenshots/**"],
        navigateFallback: "/index.html",
        // The privacy policy is its own page, so the app shell mustn't replace it.
        navigateFallbackDenylist: [/^\/privacy/]
      }
    })
  ],
  test: {
    environment: "node"
  }
});
