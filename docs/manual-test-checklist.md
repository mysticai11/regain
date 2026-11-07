# Regain UI Upgrade Round 1 — Manual Verification Checklist

Follow this checklist to verify all Round 1 visual upgrades on desktop Chrome or Android WebView.

---

## 0. Loading the Sample Fixture Data
1. Open Regain in your browser or installed PWA.
2. Tap the **Settings** icon (top right).
3. Scroll down to **Data & Backup**.
4. Tap **Import / Restore Backup**.
5. Select `tests/fixtures/sample-backup.json` from this repository.
6. Confirm restore. The app will reload with 6 weeks of structured workout history (bench press, leg press), body weight entries, and daily nutrition logs.

---

## 1. Item 1: Segmented Control
- [ ] Go to **Progress** tab $\rightarrow$ tap **History**.
- [ ] Observe the segmented control at the top: **Past Weeks** | **Past Months**.
- [ ] Tap **Past Months**:
  - The thumb pill slides smoothly to "Past Months".
  - A subtle haptic pulse fires on supported devices.
  - Tapping "Past Months" again does not re-trigger haptics or transitions (idempotent).
- [ ] Keyboard navigation (desktop):
  - Focus the control with `Tab`. Use `Left` / `Right` arrows to switch between segments with wrapping.
- [ ] Swipe gesture safety:
  - Swiping horizontally directly on the segmented control does not trigger tab switching (it carries `data-gesture-owner` and `touch-action: pan-y`).

---

## 2. Item 2: Monotone Line Chart
- [ ] Go to **Progress** tab $\rightarrow$ **Body** sub-tab.
- [ ] Observe the weight chart:
  - Line curve is smooth without overshoots, spikes, or loops (Fritsch-Carlson cubic spline).
  - Y-axis labels display rounded, readable tick marks with comfortable padding.
- [ ] Scrub interaction:
  - Drag your finger or mouse horizontally across the chart.
  - A subtle vertical guideline follows your touch.
  - A dark floating readout pill appears above the touch point showing exact Date, Weight (kg), and 7-day average.
  - Haptic tick fires when crossing each data point.
  - Lifting your finger hides the floating pill smoothly.

---

## 3. Item 3: Lifts Tab Upgrade
- [ ] Go to **Progress** tab $\rightarrow$ **Lifts** sub-tab.
- [ ] Select **Barbell Bench Press** from the exercise picker.
- [ ] **Metric Switch**:
  - Observe the segmented switch: **Est. 1RM** | **Top Set** | **Volume**.
  - Switch between metrics: the 200px monotone line chart and stats update immediately.
- [ ] **Personal Bests Card**:
  - Confirm the 3-column card displays:
    1. **Best Est. 1RM** (e.g. `52.5 kg`)
    2. **Heaviest Weight** (e.g. `45.0 kg`)
    3. **Best Set** (e.g. `45.0 kg × 5 reps`)
- [ ] **Recent Sessions Feed**:
  - Scroll down to view the chronological session cards with date, top set, estimated 1RM, and total volume.
  - If more than 5 sessions exist, tap "Show all X sessions" to expand up to 20 past sessions.

---

## 4. Item 4: Numbered History Calendar Grid
- [ ] Go to **Progress** tab $\rightarrow$ **History**.
- [ ] Observe the 7-column calendar grid:
  - Monday is the first column (`M T W T F S S`).
  - Days are clearly numbered (1..31).
  - The calendar occupies a stable 6-row height (294px) without jumping when navigating months.
- [ ] Dual shape-and-color states:
  - **Trained**: Solid lime number background.
  - **Planned**: Lime ring outline.
  - **Skipped**: Muted dark ring outline.
  - **Rest**: Surface background with muted text.
  - **Today**: Distinct 2px white outline ring.
- [ ] Tap interaction:
  - Tap any past day cell: the day detail sheet opens showing all logged sets, nutrition totals, and weigh-ins for that date.
- [ ] Navigation:
  - Tap `<` (previous month) and `>` (next month) to browse past months. Forward navigation disables when reaching current month.

---

## 5. Item 5: Today Week Strip Day Circles
- [ ] Go to **Today** tab.
- [ ] Observe the week strip below the date header:
  - 7 equal-width columns from Monday to Sunday.
  - Muted day letters on top (`M T W T F S S`).
  - 32px circular indicator below each letter:
    - **Done**: Lime fill with dark checkmark icon inside.
    - **Planned**: Transparent with 1.5px lime ring border.
    - **Skipped**: Dark muted ring with dash marker inside.
    - **Rest**: Surface background with a 4px centered gray dot.
    - **Today**: 1.5px white outline ring around the circle.
- [ ] Tapping any day cell switches the view to preview that specific day.
- [ ] Week navigation (`<` and `>`) browses previous weeks smoothly.

---

## 6. Item 6: Sticky Gym Session Summary Bar & Focus Highlight
- [ ] Go to **Gym** tab.
- [ ] **Sticky Session Bar**:
  - Pinned below the top date header with `position: sticky`.
  - Left: displays current routine name and set count progression (e.g. `1 / 12 sets · In progress`).
  - Right: unified stopwatch and action button dock.
  - Bottom: 3px lime progress fill bar that scales horizontally with set completion.
- [ ] **Focus Exercise Highlight**:
  - The first incomplete exercise has a 2px lime left border highlight (`.is-current`).
- [ ] **Strict Logger Guard Verification**:
  - Tap **Start** to start the workout stopwatch.
  - Log a set (enter weight and reps $\rightarrow$ tap check circle).
  - Rest timer dock appears and counts down every second.
  - **CRITICAL CHECK**: Observe the exercise list while the rest timer runs:
    - Inputs NEVER lose focus or jitter.
    - Screen does NOT shake or flicker.
    - You can immediately type weight and reps for the next set while the countdown is actively ticking.
  - Tap check circle to log set 2 while rest timer is still running: set 2 logs instantly without delay or failure.

---

## 7. Zero Logic & Compatibility Invariants
- [ ] Profile and weights remain intact under existing storage keys.
- [ ] Workout history and e1RM calculations match original figures.
- [ ] Export Backup produces a valid JSON file matching existing backup schema.
- [ ] All code conforms to Chromium 100+ WebView restrictions (zero `:has()`, zero CSS nesting, zero top-level await).
