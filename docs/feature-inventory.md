# Regain Feature Inventory & Interactive Controls Checklist

This document catalogs every interactive control on every screen with its expected behavior.
This is the strict regression checklist for the visual perfection and Android-native polish pass.
Nothing on this checklist may disappear, move out of reach, or behave differently (except the approved behavior changes in Section 1.6).

---

## 1. App Shell & Global Chrome
| Location / Component | Control | Expected Behavior |
| :--- | :--- | :--- |
| Bottom Navigation | **Today tab** | Switches to Today screen, retains scroll position, updates pill indicator |
| Bottom Navigation | **Gym tab** | Switches to Gym logger, retains scroll position, updates pill indicator |
| Bottom Navigation | **Progress tab** | Switches to Progress screen (Body/Lifts/History), retains sub-tab |
| Global Top Header | **Settings icon button** | Opens full-page Settings sheet/screen on every top-level tab |
| Bottom Sheets | **Drag handle / Scrim** | Drag down or tap outside scrim to dismiss sheet cleanly |
| Back Navigation | **Hardware / Gesture Back** | Dismisses top dialog/sheet/menu first before exiting or switching tabs |
| Toast / Snackbar | **Undo action button** | Reverts deleted items/sets/food/overrides and restores previous state |

---

## 2. Today Screen
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Date Header | **Settings button** | Opens Settings screen |
| Date Strip | **Date cell tap** | Selects that date; updates dashboard to view/edit food & workout for that day |
| Date Strip | **Prev / Next week arrows** | Shifts week view by -7 / +7 days |
| Date Strip | **Return to Today button** | Appears when viewing past/future day; resets view to current calendar day |
| Backup Nudge | **Export backup button** | Triggers JSON backup export and dismisses prompt |
| Backup Nudge | **Dismiss ("Later") button** | Dismisses backup nudge until next reminder cycle |
| Catch-Up Card | **"Spread across week" button** | Restores missed volume evenly across remaining training days this week |
| Catch-Up Card | **"Slide schedule" button** | Shifts remaining workouts right by 1 day if rest day is available |
| Catch-Up Card | **"Skip" button** | Marks missed workout skipped; removes card |
| Catch-Up Card | **"Log it late" button** | Navigates to Gym logger set to the missed calendar date |
| Catch-Up Card | **"See plan" toggle** | Expands/collapses inline day-by-day preview before applying |
| Calorie Hero | **Nutrition ring / bars** | Displays daily kcal, protein, carbs, fat progress towards targets |
| Workout Block | **"Start" / "Keep logging" button** | Navigates to Gym tab for active workout session |
| Workout Block | **"Change" button** | Opens workout override picker sheet to select different routine or rest |
| Workout Block | **"Train again" button** | Reopens a completed session for additional sets or logging |
| Workout Block | **"Reset to suggested" button** | Appears when overridden; reverts day's workout to split schedule |
| Weight Log Row | **Weight numeric input** | Allows typing today's bodyweight with decimal keyboard |
| Weight Log Row | **"Save" button** | Saves weight entry; updates profile trend; debounced against duplicates |
| Weight Log Row | **"Clear" button** | Clears today's logged weight with confirmation |
| Staples Shelf | **Staple chip (tap)** | Instantly logs 1× portion to today's food log with Undo snackbar |
| Staples Shelf | **Staple chip (long-press/R-click)** | Opens portion sheet (0.5×, 1×, 1.5×, 2×, custom grams) |
| Food Log | **Food row (tap)** | Opens portion / macro editor for that logged food entry |
| Food Log | **Food row (swipe-left)** | Deletes logged food item with 5s Undo snackbar |
| Food Log | **"+ Add food" button** | Opens Food Search sheet with search bar, recent foods, and custom builder |
| Food Search Sheet | **Search input** | Filters catalog foods in real-time |
| Food Search Sheet | **Food item (tap)** | Opens serving quantity dialog and logs item |
| Food Search Sheet | **"+ New food" button** | Opens Custom Food Builder modal |
| Food Search Sheet | **"+ Recipe builder" button** | Opens Recipe Builder modal to combine ingredients |

---

## 3. Gym (Workout Logger) Screen
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Header | **Workout title selector** | Opens session selector sheet to pick workout for selected date |
| Header | **"Vol" button** | Opens Weekly Muscle Volume Summary sheet |
| Header | **Timer "Start" button** | Starts session stopwatch, acquires wake lock, updates button to Pause |
| Header | **Timer "Enter time" button** | Prompts to manually enter workout duration in minutes |
| Header | **Timer Toggle (Pause/Resume)** | Pauses/resumes elapsed workout stopwatch |
| Header | **Timer "Finish" button** | Finishes session, logs duration, sets `workoutDone: true`, prompts celebration |
| Header | **Timer "•••" menu** | Opens action sheet: Edit duration, Reset timer, Cancel session |
| Header | **"Expand all / Collapse" toggle** | Toggles between accordion mode (1 expanded) and all exercises expanded |
| Exercise Card | **Collapsed exercise row (tap)** | Expands that exercise accordion; collapses previous |
| Exercise Card | **Swap icon button** | Opens alternate exercise swap sheet for current muscle group |
| Exercise Card | **Cues toggle** | Expands/collapses exercise technique cues note input |
| Exercise Card | **Cue input field** | Auto-saves personalized technique cues on blur/change |
| Exercise Card | **"+ Add set" button** | Adds an extra planned set to today's exercise |
| Exercise Card | **"− Reduce set" button** | Decrements planned sets down to min 1; updates totals & completion |
| Exercise Card | **"− Remove set [X]" row action** | Instant one-tap removal of the last unlogged planned set |
| Exercise Card | **"..." exercise menu** | "Skip exercise today", "Duplicate", "Swap" |
| Set Row | **Weight input** | Numeric input with ghost last-session prefill; typing overrides ghost |
| Set Row | **Reps input** | Numeric input with ghost last-session reps prefill |
| Set Row | **RIR chip (tap-to-cycle)** | Cycles RIR value: `3+` $\rightarrow$ `RIR 2` $\rightarrow$ `RIR 1` $\rightarrow$ `F` |
| Set Row | **Log circle button (○ / ✓)** | Logs set silently, triggers haptic, advances focus, starts rest timer |
| Set Row | **Quick-edit logged set (tap ✓)**| Opens quick-edit modal to modify logged weight, reps, or RIR |
| Set Row | **Swipe-left gesture** | Reveals Delete action; removes set with 5s Undo snackbar |
| Set Row | **Long-press set number** | Opens set context menu: "Delete set", "Duplicate set" |
| Rest Timer Dock | **Countdown display** | Ticks down rest seconds; updates tabular numbers; keeps wake lock |
| Rest Timer Dock | **"+30s" button** | Adds 30 seconds to active rest countdown |
| Rest Timer Dock | **"Skip" button** | Dismisses rest countdown immediately |
| Rest Timer Dock | **Pause / Resume icon** | Pauses or resumes rest timer countdown |
| Finish Card | **"Finish workout" button** | Appears when all planned sets logged; marks session complete with celebration |

---

## 4. Progress Screen

### 4.1 Body Tab
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Timeframe | **4W / 12W / All pills** | Filters weight trend chart to 4 weeks, 12 weeks, or full history |
| Stat Summary Card | **7-Day Avg \| Rate \| To Goal**| Displays rolling 7-day average, weekly rate of gain, and kg to 60 kg |
| Trend Canvas | **Chart points / touch** | Displays date and weight tooltip |
| Weight Log List | **Weight item (Edit)** | Prompts / opens modal to edit logged weight value |
| Weight Log List | **Weight item (Delete)** | Deletes weight entry with confirm dialog or Undo snackbar |
| Macro Hit Rate | **Calorie / Protein legend & rings** | Displays daily compliance over the selected timeframe |

### 4.2 Lifts Tab (Progress & Analysis)
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Exercise Picker | **Exercise dropdown card** | Opens picker to choose which compound/isolation lift to analyze |
| Summary Card | **Best e1RM \| Latest \| Change** | Displays all-time estimated 1RM, latest session e1RM, and change |
| e1RM Chart | **4W / 12W / All pills** | Filters e1RM progression curve over selected timeframe |
| Weekly Volume | **Per-muscle volume bars** | Shows current week's logged sets vs target range (e.g. Chest: 12/12) |

### 4.3 History Tab (Calendar & Sessions)
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Calendar View | **Month nav (< / >)** | Shifts calendar month; future months disabled |
| Calendar View | **Day cell tap** | Selects date; previews session logged or scheduled for that day |
| Review Switch | **Past Weeks / Past Months pills**| Toggles between weekly digest cards and monthly digest cards |
| Week Card | **Week summary header** | Displays date span, total sessions, total sets, avg kcal |
| Week Card | **Trained day row (tap)** | Navigates to that day's session details |
| Week Card | **Rest days summary (tap)** | Expands/collapses rest & skipped days breakdown |
| Session Cards | **Collapsed card (tap)** | Expands session to view exercise list and grouped sets |
| Session Cards | **Logged set chip (tap)** | Opens quick-edit modal to adjust weight/reps/RIR |
| Session Cards | **"..." session menu** | "Edit session", "Duplicate session", "Delete session" (with undo) |

---

## 5. Settings Screen
| Section | Control | Expected Behavior |
| :--- | :--- | :--- |
| Header | **"Done" / Close button** | Saves changes, closes Settings sheet, returns to previous screen |
| Training Days | **Mon–Sun 7 chips** | Toggles weekly workout days (highlights training vs rest) |
| Training Split | **Split picker row** | Selects split (5-day, 4-day, 3-day full-body, etc.) |
| Daily Targets | **Calorie / Protein inputs** | Adjusts training day and rest day nutrition targets |
| Catch-Up Settings | **"Auto-offer catch-up" switch** | Enables/disables automatic detection cards on Today screen |
| Catch-Up Settings | **"Protect Sunday rest" switch** | Prevents catch-up workouts from occupying protected rest days |
| Catch-Up Settings | **"Max sets per session"** | Configures hard ceiling for session volume (default 20) |
| Rest Timer Settings| **Compounds / Isolations rest** | Configures default countdown seconds per exercise category |
| Rest Timer Settings| **"Auto-start rest timer" switch**| Enables/disables automatic countdown when logging sets |
| Data Management | **"Export backup" button** | Generates `regain-backup-YYYY-MM-DD.json` file download |
| Data Management | **"Import backup" button** | Prompts file picker; validates schema; atomically restores data |
| Danger Zone | **"Reset all data" button** | Prompts explicit confirmation dialog before wiping database |

---

## 6. Approved Behavior Changes (Section 1.6)
1. **Logger Set Deletion**:
   - (a) Swipe set row left to reveal red Delete;
   - (b) Long-press set number for menu ("Delete set", "Duplicate set");
   - (c) Visible "− Remove set" button next to "+ Add set" removes last unlogged set;
   - (d) Logged sets confirm deletion; 5-second Undo snackbar; session header counter (`0 / 16 sets`) updates instantly; affects only today's session.
   - (e) Exercise menu "Skip exercise today" with Undo.
2. **Weight Save De-duplication**:
   - Debounce Save and ignore identical weight logged within the same minute ("Already logged" toast). Root cause of duplicates resolved.
3. **Catch-up Miss Resolution Check**:
   - If a workout template scheduled earlier was completed later in the same week, the missed-workout card automatically resolves.

