# Regain — Hardgainer Bulk Tracker PWA

A personal, offline-first Progressive Web App for tracking calories, macros, weight, and structured training during a long-term bulk.

---

## File Structure

```
regain/
├── index.html      — App shell: all CSS + app logic (single deployable)
├── db.js           — IndexedDB wrapper + embedded USDA food database (~200 foods)
├── sw.js           — Service worker (cache version: regain-v3)
├── manifest.json   — PWA manifest (icons, theme, display mode)
├── icon-192.svg    — PWA home screen icon (192×192)
├── icon-512.svg    — PWA splash icon (512×512)
└── README.md       — This file
```

---

## Deploying

This is a fully static app — no build step, no server.

**GitHub Pages:** Push to any public repo and enable Pages on the `main` branch root.

**Local:** Open `index.html` directly in Chrome/Safari. Service worker registration requires a `localhost` or `https://` origin to work (offline mode won't activate on `file://`).

---

## Add to Home Screen

**iOS (Safari):**
1. Open the app URL in Safari
2. Tap the Share button (box with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add**

**Android (Chrome):**
1. Open the app URL in Chrome
2. Tap the three-dot menu → **Add to Home Screen** (or an install banner may appear automatically)
3. Tap **Install**

After adding, the app runs in standalone mode (no browser chrome, full-screen).

---

## Food Database

Nutrition data is sourced from **USDA FoodData Central** (public domain — fdc.nal.usda.gov). The embedded database covers ~200 curated foods optimized for a high-protein bulking diet: meats, dairy, eggs, grains, legumes, supplements, common restaurant items.

A credit note is shown in the Progress tab.

Custom foods and recipes are stored in the same IndexedDB database and are included in JSON export/import.

---

## Data Backup

All data lives on-device only. To back up:
1. Go to **Progress** tab → **Export JSON**
2. Save the `.json` file somewhere safe (iCloud, Google Drive, etc.)

To restore on a new device:
1. Open the app in a browser
2. Progress → **Import JSON** → select your backup file

---

## Architecture Notes

- **LocalStorage:** profile, meal templates, recent foods, daily logs
- **IndexedDB:** food database, custom foods, recipes
- **No backend, no analytics, no telemetry**
- **Targets (hardcoded):** 2,500 kcal/day · 100g protein/day · 0.135–0.27 kg/week gain rate
