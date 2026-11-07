# Regain UI Upgrade Round 2 — Master Instructions & Task Manual

**Version**: 2.0.0 (Master Roadmap)  
**Status**: Pending Round 1 Completion  
**Execution Order**: Tasks R2-1 $\rightarrow$ R2-2 $\rightarrow$ R2-3 $\rightarrow$ R2-4 $\rightarrow$ R2-5 $\rightarrow$ R2-6.  

---

## R2-0. Context, Process & Architectural Rules

### 1. Environment & Technical Stack
- Vanilla ES Modules with zero third-party runtime dependencies.
- Every JavaScript source file strictly $\le 400$ lines.
- Verification: `node scripts/audit.js` (0 hits) and `npm test` (all test suites passing).
- Dark theme only: near-black background (`#0B0B0C`), single lime brand accent (`#C8F53C`), native typography stack, tabular numerals.
- Week starts on **Monday**; weights in **kg**.

### 2. Prerequisite Foundations (Inherited from Round 1)
Round 2 builds upon the components established in Round 1:
1. Segmented control component (`js/ui/segmented.js`).
2. SVG line chart component (`js/ui/lineChart.js`) and pure math engine (`js/ui/chartGeometry.js`).
3. Calendar month grid pure helper (`js/view/calendarGrid.js`).
4. Lift statistics view-model (`js/view/liftStats.js`).
5. Today day circles status strip.
6. History numbered month grid.
7. Sticky Gym session progress bar.

### 3. Core Constraints
- **Zero Business Logic Mutations**: No alterations to DB/storage code, state persistence, catch-up scheduling, formulas, set logging, timers, or gestures. (Task R2-4 introduces pure, read-only progression advice only).
- **Pure Helpers**: New files must be deterministic pure functions (no DOM, no storage access, explicit timestamp parameter).
- **Frozen Schemas**: Storage keys, IndexedDB tables, and JSON export formats are immutable.
- **Gesture Integrity**: All interactive elements responding to horizontal drag must include `data-gesture-owner` and `touch-action: pan-y`.
- **Logger Guard**: Exercise list must never re-render during timer ticks or progression hint interactions.

---

## Task R2-1: Stable APK Release Signing (CI/CD)

**Goal**: Configure persistent release signing in GitHub Actions with monotonic `versionCode` progression, allowing subsequent APK updates to install seamlessly over existing installations without uninstallation or data loss.

### 1. Specifications & Analysis
- **Current Baseline**:
  - `applicationId`: `"com.mysticai.regain"` (immutable).
  - Current `versionCode`: `1`.
  - Current `versionName`: `"1.0"`.
  - Current Signing: Temporary ephemeral debug keystore generated dynamically per build.
- **Desired State**:
  - Dedicated release signing configuration in `android/app/build.gradle` reading from environment variables:
    - `ANDROID_KEYSTORE_BASE64`
    - `ANDROID_KEYSTORE_PASSWORD`
    - `ANDROID_KEY_ALIAS`
    - `ANDROID_KEY_PASSWORD`
  - Fallback Mechanism: If secrets are absent (forks, local runs), fall back safely to debug signing so builds never break.
  - Version progression: `versionCode = BASE + github.run_number` (ensures strict monotonic growth).

### 2. Keystore Generation Instructions (Owner Action)
The developer must execute the following commands locally (keystore files must never be committed to Git):
```bash
# 1. Generate RSA 2048-bit release keystore valid for 10,000 days
keytool -genkeypair -v -keystore regain-release.jks -alias regain -keyalg RSA -keysize 2048 -validity 10000

# 2. Base64-encode the keystore into a single line string
# On macOS / Linux:
base64 -w 0 regain-release.jks > keystore-base64.txt
# On Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("regain-release.jks")) | Out-File -Encoding ascii keystore-base64.txt
```

### 3. Secrets Registration
Add the following repository secrets under **GitHub Repository $\rightarrow$ Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**:
1. `ANDROID_KEYSTORE_BASE64`: Contents of `keystore-base64.txt`.
2. `ANDROID_KEYSTORE_PASSWORD`: Keystore password chosen during creation.
3. `ANDROID_KEY_ALIAS`: `regain`
4. `ANDROID_KEY_PASSWORD`: Key password.

### 4. Workflow Artifact & Verification
- Decodes keystore base64 into a temporary file during CI execution and purges it post-build.
- Compiles via `./gradlew assembleRelease`.
- Uploads artifact named: `regain-<versionName>-<run_number>.apk`.
- Adds a GitHub Actions Job Summary printing the certificate SHA-256 fingerprint verified via `apksigner verify --print-certs`.

---

## Task R2-2: Weekly Stat Tiles (Progress > Body)

**Goal**: Introduce a "This week" summary block composed of 6 responsive metric cards situated between "Weight logs" and "Nutrition · last 7 days".

### 1. Component Architecture
- **Files**: `js/ui/statTile.js` (+ CSS), `js/ui/sparkline.js` (Pure geometry + render), `js/view/weekTiles.js` (View-model adapter).
- **CSS Grid Specification**:
  ```css
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.25rem, 1fr));
    gap: 12px;
  }
  .tile {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "title spark" "value icon";
    row-gap: 12px;
    align-items: end;
    min-height: 112px;
    padding: 16px;
    border-radius: 20px;
    background: var(--surface);
    border: 1px solid var(--hairline);
  }
  ```

### 2. The 6 Stat Tiles
1. **Weight**:
   - Value: 7-day rolling average weight (1 decimal place).
   - Subtitle: `"7-day avg"`.
   - Sparkline: Last 14 weigh-in entries (oldest to newest).
   - Icon: Scale / Weight.
2. **Rate**:
   - Value: Weekly gain/loss rate matching current Rate card.
   - Unit: `kg/wk`.
   - Subtitle: `"Gain per week"`.
   - Sparkline: Dashed baseline.
   - Icon: Trending arrow.
3. **Calories**:
   - Value: 7-day average daily intake (rounded).
   - Unit: `kcal`.
   - Subtitle: `"of <target> target"`.
   - Sparkline: 7-day intake series.
   - Icon: Flame.
4. **Protein**:
   - Value: 7-day average daily protein.
   - Unit: `g`.
   - Subtitle: `"of <target> g target"`.
   - Sparkline: 7-day protein series.
   - Icon: Nutrition / Food.
5. **Workouts**:
   - Value: Completed workouts this week.
   - Unit: `"of <planned>"`.
   - Subtitle: `"This week"`.
   - Sparkline: 6-week workout volume history.
   - Icon: Dumbbell.
6. **Sets**:
   - Value: Total working sets logged this week.
   - Unit: `sets`.
   - Subtitle: `"This week"`.
   - Sparkline: 6-week set count history.
   - Icon: Layers / Repeat.

### 3. Sparkline Geometry Engine (`sparkline.js`)
- Pure calculation mapping values to SVG path coordinates using Monotone Cubic interpolation.
- Dimensions: 56px width $\times$ 28px height, 3px inner padding.
- Stroke: 1.5px, 70% opacity off-white, terminated with a 2.5px solid lime accent dot on the latest value.

---

## Task R2-3: Nutrition 7-Day Bar Chart (Progress > Body)

**Goal**: Render an interactive 7-day dual-metric nutrition bar chart situated directly above the existing hit-rate grid.

### 1. Architecture & Controls
- **Files**: `js/ui/barGeometry.js` (Pure geometry calculations), `js/ui/barChart.js` (SVG render engine).
- **Metric Selector**: Embedded Item 1 Segmented Control: `Calories` | `Protein` (default: Calories).
- **Data Resolution**: Last 7 days in chronological order ending today, resolving logged actuals, date-specific targets (accounting for rest vs. training day target deltas), and goal compliance status.

### 2. Geometry & Nice-Scaling (`barGeometry.js`)
- Dynamic Y-axis upper limit calculated via nice step increments:
  $$\text{Steps} = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]$$
  Selects smallest step where $\lceil \text{peak} \times 1.1 / \text{step} \rceil \le 5$.
- 7 evenly spaced bar columns with top-corner rounding ($r_x = 6\text{px}$).
- Goal Target Lines: 2px horizontal marker ticks rendered at the exact target height for each respective day.

### 3. Visual States & Interactions
- **Target Met**: Solid lime fill (`#C8F53C`).
- **Target Unmet**: Muted off-white fill (`rgba(242, 242, 238, 0.35)`).
- **Today's Bar**: Emphasized with an additional 1.5px white outline.
- **Empty Days**: Rendered as a subtle 3px baseline dot.
- **Scrub / Tap Interaction**: Interactive pointer selection reveals a floating summary pill (`<Date> · <Value> / <Target> <Unit>`) and triggers soft selection haptics.

---

## Task R2-4: Progressive Overload Recommendations (Gym Logger)

**Goal**: Display intelligent, science-based progressive overload targets for each exercise in the active workout logger.

> [!IMPORTANT]
> **Read-Only Informational Target**: Progression hints are purely advisory. They **never** write to disk, mutate preset drafts, alter active inputs, or modify stored routines.

### 1. Algorithm Specification (`js/lib/progression.js`)
```javascript
export function suggestNext({ prescription, equipment, lastSets })
// Returns: { type: 'weight' | 'reps' | 'hold' | 'none', chip, reason, kg, reps }
```
- **Increment Matrix**:
  - Barbell / EZ-Bar / Dumbbell / Cable: $+2.5\text{ kg}$.
  - Machine: $+5\text{ kg}$.
  - Bodyweight / Unspecified: $+2.5\text{ kg}$.
- **Decision Engine**:
  1. Filter `lastSets` to valid completed sets ($\text{weight} > 0 \land \text{reps} > 0$).
  2. Identify top weight $W$ and isolate sets completed at weight $W$ (subset $T$).
  3. If $|T| < \min(2, \text{prescribedSets})$, return `none`.
  4. If all sets in $T$ reached $\ge \text{repMax}$ without technical failure ($\text{RIR} > 0$):
     - **Recommendation**: `type: 'weight'` $\rightarrow$ Add equipment increment step, reset target reps to `repMin`.
  5. If all sets reached $\text{repMax}$ but hit failure ($\text{RIR} = 0$):
     - **Recommendation**: `type: 'hold'` $\rightarrow$ Retain weight $W$, build reserve capacity.
  6. If minimum reps in $T < \text{repMin}$:
     - **Recommendation**: `type: 'hold'` $\rightarrow$ Build foundation up to `repMin`.
  7. Else (working cleanly within rep range):
     - **Recommendation**: `type: 'reps'` $\rightarrow$ Retain weight $W$, target $+1\text{ rep}$ across sets ($\le \text{repMax}$).

### 2. UI Presentation & Integration
- Rendered as an elegant badge directly beneath the prescription line:
  - `weight`: Lime text, lime border, soft lime background tint (`#C8F53C`).
  - `reps`: Crisp off-white text on dark surface.
  - `hold`: Muted text on surface.
- Tapping the badge toggles an inline expansion explaining the technical rationale.

---

## Task R2-5: Version & Build Watermark (Settings)

**Goal**: Surface installed build identification within the user interface to confirm APK update installation.
- **Files**: `js/version.js` exporting `APP_VERSION = '2.0.0'`.
- **UI Placement**: Centered, muted 12px text situated at the footer of the Settings screen:
  $$\text{"Regain · v2.0.0"}$$
- **Cache Synchronization**: Bump Service Worker cache key (`sw.js`) to guarantee web PWA asset invalidation upon deployment.

---

## Task R2-6: Documentation, Owner Checklist & Verification

1. **Owner Field Checklist**: Deliver comprehensive test scenarios in `/docs/round-2/manual-test-checklist.md`.
2. **Audit & Test Suite**: 100% test coverage for all new pure helpers (`test-sparkline.js`, `test-bars.js`, `test-progression.js`).
3. **Execution Summary**: Record exact files modified, test logs, and APK artifact retrieval instructions in `/docs/round-2/progress.md`.
