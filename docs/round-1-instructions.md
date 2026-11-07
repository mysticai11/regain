# Regain UI Upgrade Round 1 — Detailed Specification & Execution Manual

**Version**: 1.0.0 (Round 1 Final)  
**Status**: Ready for Implementation  
**Target Environment**: GitHub Pages (Web PWA) & Android Capacitor APK (Chromium 100+ WebView)  

---

## 0. Context & Architecture

- **Codebase Philosophy**: Vanilla JavaScript ES Modules with **zero** runtime dependencies. Every JavaScript file is strictly limited to $\le 400$ lines.
- **Verification & Guardrails**:
  - Automated tests: `npm test` (`node --test tests/test-*.js`).
  - Code & token audit: `node scripts/audit.js` (must maintain 0 hits).
- **Dual-Target Delivery**:
  - Web App: Hosted on GitHub Pages. Holds active user test data in browser storage (`localStorage` & `IndexedDB`).
  - Native App: Android APK built via GitHub Actions (`.github/workflows/build-apk.yml`). Installed APK begins empty.
- **Design System Constraints**:
  - Dark theme only: near-black background (`#0B0B0C`).
  - Single brand accent: Lime (`#C8F53C` / `#C6F432`).
  - Typography: System default grotesque stack; strictly tabular numerals for values (`font-variant-numeric: tabular-nums`).
  - No secondary accent colors, no gradients on buttons, no decorative fluff.
- **Calendar & Units**:
  - Week start: **Monday** (ISO week).
  - Weights: Strictly **kg**.

---

## 1. Hard Architectural Rules

1. **No Logic Changes**:
   - Absolutely **no** modifications to: storage/DB code (`storage.js`, `storage-backup.js`, `storage-sessions.js`, `db.js`), state stores (`state.js`), schedule & catch-up engine (`schedule.js`, `catchup.js`), e1RM/PR/volume math (`calc.js`), stopwatch/rest timer mechanics, set logging handlers, data export/import, migrations, or the swipe gesture routing decision pure function (`decideSwipe`).
   - If any item appears to demand a data-layer alteration, **halt** that sub-step and log it as `NEEDS LOGIC CHANGE: <what and why>`.
2. **Pure View Helpers Only**:
   - New helper files are permitted **only** for derived display data (e.g. chart geometry math, calendar month grid matrix, lift metrics view-model).
   - Rules for helpers: Pure functions only, no DOM manipulation, no direct storage access, no internal `Date.now()` (timestamp must be passed as an argument). Must call existing math functions, never re-implement them. Every helper must be accompanied by a dedicated unit test suite.
3. **Data Identifiers Frozen**:
   - Storage keys, localStorage item keys, IndexedDB table/store names, schema definitions, and JSON backup export formats are permanently frozen.
   - Never clear browser storage or site data during testing. Android `applicationId` (`com.mysticai.regain`) is immutable.
4. **Nothing Removed**:
   - Every existing interactive control, sheet, button, and navigation path must remain accessible and functional. Default screen appearances must match existing baselines unless explicitly specified.
5. **WebView Compatibility**:
   - Target: Android System WebView (Chromium 100+) and modern Chrome.
   - **Banned CSS**: `:has()`, Container Queries (`@container`), dynamic viewport units (`dvh`, `svh`, `lvh`), CSS nesting, `@property`, View Transitions API, subgrid, top-level await in scripts.
   - **Allowed**: CSS Flexbox, CSS Grid, `aspect-ratio`, `:focus-visible`, `ResizeObserver`, Pointer Events, SVG, CSS Custom Properties. Use `@supports` when necessary. Zero external libraries, CDNs, or network calls.
6. **Gesture Safety**:
   - The app features global tab swipe routing and swipe-to-delete row actions.
   - Every **new** horizontally interactive element (e.g. chart scrub container, segmented control) **must** declare:
     - `data-gesture-owner` attribute.
     - `touch-action: pan-y` CSS property.
   - Never register touch listeners on `document` or `window`. Do not modify `decideSwipe()`.
7. **Rendering Performance**:
   - Transitions/animations strictly limited to `transform` and `opacity`.
   - Charts must only redraw when underlying data or element dimensions change.
   - All observers (`ResizeObserver`) and DOM listeners must be cleanly removed on `destroy()` / unmount.
   - Stress benchmark: Cycling between Today, Progress tabs, and Gym 20 times must not leak DOM nodes or event listeners.
8. **Gym Logger Guard**:
   - On the Gym screen, **never** re-render the exercise list on a timer tick, animation frame, or session bar state change.
   - Protect against the historical input-focus teardown bug. Timer text updates strictly via `textContent` on the dedicated DOM node.
9. **Strict Local Date Handling**:
   - All date keys (`YYYY-MM-DD`) must be constructed strictly using local date getters (`getFullYear()`, `getMonth()`, `getDate()`).
   - **Never** use `toISOString()` for date keys (causes UTC day-shifts in non-GMT timezones).
   - **Never** step days by adding `86,400,000 ms` (breaks on daylight saving / timezone shifts). Always use `new Date(y, m, d + n)`.
10. **Accessibility & Contrast**:
    - Minimum touch target: 48dp $\times$ 48dp (visual element may be smaller if wrapped in 48dp padding/touch container).
    - Minimum text contrast ratio: 4.5:1 against dark surface.
    - Full support for `prefers-reduced-motion` (disable transitions).
11. **Test Data Isolation**:
    - Never test with or overwrite live production data. Utilize isolated mock fixtures (`tests/fixtures/sample-backup.json`) in test suites and clean browser profiles.
12. **Deploy Safety**:
    - Do not merge to `main` or trigger GitHub Pages web deployments during development. All work remains isolated on designated feature branches (`ui-round-1`).

---

## 2. Shared Tokens & Layout Rules

```css
/* Core Shared Design Tokens for UI Upgrades */
:root {
  --seg-track: #1C1C1F;
  --seg-thumb: #F2F2EE;
  --seg-thumb-text: #0A0A0B;
  --chart-grid: rgba(255, 255, 255, 0.06);
  --chart-line: #F2F2EE;
  --chart-fill-top: rgba(242, 242, 238, 0.14);
  --chart-fill-bottom: rgba(242, 242, 238, 0);
  --cal-ring-planned: rgba(200, 245, 60, 0.6);
  --cal-ring-skipped: #3A3A40;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

- **Spacing Scale**: Strictly `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`.
- **Value/Unit Pairing**: Values and units must have `white-space: nowrap` on their container. Units are smaller (~14px) and muted.
- **Narrow Width / Large Font**: Must not clip or trigger horizontal scrollbars at 320px viewport width or at 130% root font scaling. Use `min-height` rather than fixed `height` for text containers.

---

## 3. Round 1 Task Breakdown (Items 1 to 6)

### Item 1: Segmented Control Component
- **Files**: `js/ui/segmented.js` + `css/components.css` (or modular CSS).
- **API**:
  ```javascript
  createSegmented({ options: [{ value, label }], value, onChange, ariaLabel })
  // returns { el, setValue(val), destroy() }
  ```
  `onChange` fires **only** on user pointer/keyboard interaction, never programmatically via `setValue`.
- **Markup**:
  ```html
  <div class="seg" role="tablist" aria-label="..." data-gesture-owner>
    <span class="seg__thumb"></span>
    <button class="seg__btn" role="tab" aria-selected="true" tabindex="0">Option 1</button>
    <button class="seg__btn" role="tab" aria-selected="false" tabindex="-1">Option 2</button>
  </div>
  ```
- **CSS Specification**:
  - `.seg`: `position: relative; display: flex; height: 48px; padding: 4px; border-radius: 16px; background: var(--seg-track); border: 1px solid var(--hairline); touch-action: pan-y;`
  - `.seg__thumb`: `position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--n)); border-radius: 12px; background: var(--seg-thumb); transform: translateX(calc(var(--i) * 100%)); transition: transform 200ms var(--ease-standard);`
  - `.seg__btn`: `position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary);`
  - `.seg__btn[aria-selected="true"]`: `color: var(--seg-thumb-text);`
- **Application**:
  1. History screen: "Past Weeks / Past Months" toggle.
  2. Lifts tab: Metric switch ("Est. 1RM", "Top set", "Volume").
  *(Note: Do NOT modify main screen tabs or 4W/12W/All range tabs).*
- **Testing**: Equal option widths; keyboard arrow navigation with roving tabindex; `onChange` idempotency; `destroy()` listener cleanup.

---

### Item 2: Line Chart (Pure Geometry & SVG Render)
- **Files**:
  - `js/ui/chartGeometry.js` (Pure math function, 100% unit tested).
  - `js/ui/lineChart.js` (DOM/SVG rendering component).
- **Geometry Core (`chartGeometry.js`)**:
  - Deduplicate points by timestamp `t`, keeping the latest value `v`.
  - Calculate domain `[dMin, dMax]` from data points only (never stretch domain to fit target goal).
  - Downsample large datasets: if $> 120$ points, preserve the first point, partition the remainder into 119 equal buckets taking the last point of each, ensuring the final point is retained.
  - Implement Fritsch-Carlson Monotone Cubic Spline to guarantee mathematical monotonicity (no overshoot above local peaks).
  - Area closed path: `linePath + " L " + lastX + " " + baseY + " L " + firstX + " " + baseY + " Z"`.
- **Rendering Component (`lineChart.js`)**:
  - Built using `document.createElementNS('http://www.w3.org/2000/svg', ...)`. No data injected via `innerHTML`.
  - Dimensions: Body chart 180px height; Lifts chart 200px height. Managed via `ResizeObserver`.
  - Right-aligned tabular Y-axis ticks, muted horizontal gridlines, 2.5px smoothed curve with soft linear gradient fill.
  - Scrubbing: Pointer events with `setPointerCapture`, hairline cursor line, enlarged focal point, floating readout pill (`<value> · <date>`), tactile haptic feedback on point transitions.

---

### Item 3: Lifts Tab Upgrade
- **Files**:
  - `js/view/liftStats.js` (Pure view-model, unit tested).
  - Integration into `js/screens/progress.js` / `js/screens/progress/history.js`.
- **View-Model Calculations**:
  - For each session of the active exercise: resolve `e1rm` (invoking existing formula), `topSet` (heaviest completed working set), `volume` ($\sum \text{weight} \times \text{reps}$), and `pr` flag.
- **Metric Switch**:
  - Integrated using the Item 1 Segmented Control: `Est. 1RM` | `Top set` | `Volume`.
  - Adapts line chart plot series, metric labels, and summary statistics card (Best / Latest / Change) without causing screen layout shifts.
- **Personal Bests Card**:
  - 3-column card displaying all-time peak statistics for the exercise:
    1. **Heaviest**: Max kg lifted with date.
    2. **Best 1RM**: Highest estimated 1RM with date.
    3. **Best Volume**: Peak session tonnage with date.
- **Recent Sessions Feed**:
  - Chronological list (newest first, up to 8 sessions by default, expandable to 20 via "Show more").
  - Displays session date, set summary, tonnage, and top set with lime PR badge when achieved.

---

### Item 4: Numbered History Calendar Grid
- **Files**:
  - `js/view/calendarGrid.js` (Pure matrix calculation, unit tested across timezones).
  - Integration into History view.
- **Matrix Calculation**:
  - Monday-first offset: `(new Date(year, monthIndex, 1).getDay() + 6) % 7`.
  - Compute total rows (`Math.ceil((offset + daysInMonth) / 7)`).
  - Consistent 6-row container height (`min-height: calc(6 * 44px + 5 * 6px)`) to eliminate layout jump during month switching.
- **Cell Styling & States**:
  - Aspect-ratio 1:1, max 44px circular/rounded cells.
  - States: Trained (lime fill, dark text), Planned (lime ring), Skipped (dark ring, muted text), Rest (dark surface), Today (white outline with 2px offset).
- **Interaction**:
  - Tapping past dates opens the existing day details sheet. Future dates are non-interactive. Month transitions animate smoothly over 200ms using `transform` and `opacity`.

---

### Item 5: Today Week Strip Day Circles
- **Files**: `js/screens/today.js` + `css/today.css`.
- **Specification**:
  - Replace legacy letter-and-dot week strip with 7 equal-width columns.
  - Each column contains the day letter (`M T W T F S S`) above an accessible circular status indicator (max 36px, aspect-ratio 1:1, touch target $\ge 48\text{dp}$).
  - Accessible shape-and-color dual encoding:
    - **Done**: Lime fill with check icon.
    - **Planned**: 1.5px lime ring.
    - **Skipped**: Muted ring with dash marker.
    - **Rest**: Surface fill with 4px center dot.
    - **Today**: Distinct 1.5px white outline.

---

### Item 6: Sticky Gym Session Summary Bar
- **Files**: `js/screens/gym.js` + `css/gym.css`.
- **Specification**:
  - Sticky banner pinned below header (`position: sticky; top: calc(env(safe-area-inset-top, 0px) + 8px); z-index: 20;`).
  - Left region: Routine label and set progression (`X/Y sets · In progress`).
  - Right region: Unified session stopwatch pill and Primary Action button (Start / Finish).
  - Bottom edge: Micro 3px lime progress bar (`transform: scaleX(progress)` with `transform-origin: left`).
  - **Current Exercise Focus**: While workout is active, dynamically marks the current incomplete exercise with `.is-current` (lime border) without triggering logger list re-renders.
  - **Strict Logger Guard**: Timer ticks update only `sessionTimer.textContent`. Never re-render exercise cards or disrupt active input fields during rest timer countdowns.

---

## 4. Definition of Done & Verification Protocol

- [ ] All 6 items committed as isolated git commits in sequential order.
- [ ] Automated audit clean (`node scripts/audit.js` = 0 hits).
- [ ] Full test suite passing (`npm test` = 100% pass).
- [ ] No regression across existing feature inventory.
- [ ] Headless screenshots captured across standard viewports (320px, 360px, 393px, 412px, 130% font scale).
- [ ] Manual test checklist documented in `/docs/manual-test-checklist.md`.
