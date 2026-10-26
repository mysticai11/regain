# Iron Log — Offline Workout Logger PWA

A private, offline-first Progressive Web App for logging the Iron Log 5-day beginner muscle-building split. The app also supports a loss goal, with editable calorie and protein targets.

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

## Iron Log training plan

The app ships with one editable 5-day plan:

- Monday: Chest + Back
- Tuesday: Shoulders + Arms
- Wednesday: Legs A + Triceps
- Thursday: Rest
- Friday: Chest + Back
- Saturday: Legs B + Arms
- Sunday: Rest

The previous selectable workout programs are no longer used. Exercise alternatives remain available from the exercise swap control.

## Simplified navigation

The app is organized around three mobile-first screens:

- **Today**: calories remaining, protein progress, today's workout, bodyweight, quick food logging, and an optional 1–5 readiness tap.
- **Gym**: the active workout session and set logging.
- **Progress**: separate **Body & food** and **Lifts** views for bodyweight, nutrition, lift trends, weekly work, and workout history.

Carbs and fat are hidden behind the calorie summary, while backup, import, training schedule, equipment, custom foods, and reset controls live under the collapsed Advanced Settings section.

## Food Database

Nutrition data is sourced from **USDA FoodData Central** (public domain — fdc.nal.usda.gov). The embedded database covers ~200 curated foods optimized for a high-protein bulking diet: meats, dairy, eggs, grains, legumes, supplements, common restaurant items.

A credit note is shown in the Progress tab.

Custom foods and recipes are stored in the same IndexedDB database and are included in JSON export/import.

---

## Local profile and data backup

There is no login or lock screen. The profile, progress, meals, workouts, and food data remain on the device until the user explicitly resets or deletes them. Use Settings → Export to download a complete JSON backup; it includes all discovered daily records, including workout history outside the current program date range. Import validates the profile and day records before restoring them.

The onboarding goal supports muscle gain, fat loss, recomposition, or strength. Select fat loss to set a target below the starting weight; calorie targets remain editable in Settings.

Workout logs preserve the planned session, every set's weight, reps, and optional RIR/failure effort, and session duration. Progress supports bodyweight entries whenever needed, with 1-week, 1-month, and 3-month ranges. When there are at least three weigh-ins across two weeks, the bodyweight view shows a cautious target-month estimate from the observed weight trend and logged intake; it is not a guarantee. Lift charts use estimated 1RM from each lift.

Progress entries can be edited or deleted. Gym sessions use a simple whole-session timer: tap Start and End when you remember, or enter the total minutes afterward if you forgot. A compact rest timer can be skipped after a set. Exercise logging supports planned day templates and rep ranges, per-set add/remove controls, done ticks, weight/reps autofill, per-set RIR or failure selection, offline draft auto-save, editing/deleting, double-progression prompts, and separate histories for exercise alternatives. Food entries use the selected serving size once; older entries are migrated to prevent serving counts from being applied twice. Personal-best markers appear in workout history.

The app is designed for separate private profiles on separate phones. Gain and loss goals use goal-aware labels and trend direction, while workout history and the training plan remain independent on each device.

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
