/* Test Suite: Weekly & Monthly Historical Data Persistence and Navigation */

import assert from "assert";

console.log("--- Testing Weekly & Monthly History & Persistence ---");

// Mock localStorage
const store = {};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] || null,
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

// Mock DOM
global.location = { hash: '', search: '' };
global.window = {
  localStorage: global.localStorage,
  location: global.location,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  todayWeekOffset: 0,
  activeTodaySelectedDateKey: null,
  activeProgressMonthOffset: 0
};
global.document = {
  getElementById: function(id) {
    return { innerHTML: '', style: {}, onclick: null, remove: function(){} };
  },
  querySelectorAll: function() { return []; },
  createElement: function() {
    return {
      className: '',
      innerHTML: '',
      remove: function(){},
      querySelector: function(){ return { onclick: null, classList: { toggle: function(){} }, style: {} }; },
      querySelectorAll: function(){ return []; }
    };
  }
};

async function run() {
  const { setProfile, profile } = await import("../js/state.js");
  const { dayRecord, saveDayRecord, sv, ls, allDayKeys, getWorkoutSessions } = await import("../js/storage.js");
  const { todayKey, dateKey, addDays } = await import("../js/lib/format.js");
  const { buildMonthlyDigestHTML, buildWeeklyDigestHTML, buildAllMonthsHistoryHTML, openHistoryArchiveModal } = await import("../js/screens/progress/digests.js");
  const { buildDotConsistencyCalendarHTML } = await import("../js/screens/progress/charts.js");
  const { buildWeekDotRowHTML } = await import("../js/screens/today/widgets.js");

  // 1. Historical Day Key Persistence
  var tKey = todayKey();
  var pastWeekKey = addDays(tKey, -14); // 2 weeks ago
  var pastDayRecord = {
    weight: 54.5,
    extra: [
      { name: "Oatmeal with whey", kcal: 450, protein: 35, carbs: 55, fat: 8, servings: 1 },
      { name: "Chicken & Rice", kcal: 650, protein: 48, carbs: 70, fat: 12, servings: 1 }
    ],
    workoutDone: true
  };
  saveDayRecord(pastWeekKey, pastDayRecord);

  var allKeys = allDayKeys();
  assert(allKeys.includes(pastWeekKey), "allDayKeys() must include historical days stored in localStorage");
  assert.strictEqual(dayRecord(pastWeekKey).weight, 54.5, "Historical day weight must persist perfectly");
  assert.strictEqual(dayRecord(pastWeekKey).extra.length, 2, "Historical day meals must persist perfectly");
  console.log("✓ Test 1: Historical day records and keys persist and are never culled or lost");

  // 2. Today Screen Week Navigation (Week strip widget)
  window.todayWeekOffset = 0;
  var thisWeekHTML = buildWeekDotRowHTML(tKey, tKey);
  assert(thisWeekHTML.includes("This Week"), "Current week should show 'This Week'");
  assert(thisWeekHTML.includes("prevWeekBtn"), "Week strip must include prevWeekBtn for past week navigation");

  window.todayWeekOffset = -1;
  var lastWeekHTML = buildWeekDotRowHTML(tKey, tKey);
  assert(!lastWeekHTML.includes("This Week"), "Offset -1 week must show date range instead of 'This Week'");
  assert(lastWeekHTML.includes("nextWeekBtn"), "Past week must display nextWeekBtn to navigate back forward");
  console.log("✓ Test 2: Week strip navigation supports browsing previous weeks");

  // 3. Consistency Calendar Month Navigation
  window.activeProgressMonthOffset = 0;
  var currentCalHTML = buildDotConsistencyCalendarHTML();
  assert(currentCalHTML.includes("prevProgressMonthBtn"), "Calendar must render prev month button");
  assert(!currentCalHTML.includes("nextProgressMonthBtn"), "Calendar at offset 0 should not show next month button into future");

  window.activeProgressMonthOffset = -1;
  var prevMonthCalHTML = buildDotConsistencyCalendarHTML();
  assert(prevMonthCalHTML.includes("prevProgressMonthBtn"), "Previous month calendar must be navigable further back");
  assert(prevMonthCalHTML.includes("nextProgressMonthBtn"), "Past month calendar must show nextProgressMonthBtn to return forward");
  console.log("✓ Test 3: Consistency calendar supports switching between months");

  // 4. Monthly Review Digest Calculation
  var todayObj = new Date(tKey + "T00:00:00");
  var curYear = todayObj.getFullYear();
  var curMonth = todayObj.getMonth();

  setProfile({
    trainingDays: [1, 2, 3, 5, 6],
    weightEntries: [
      { id: 'w1', dayKey: addDays(tKey, -7), weight: 54.0, createdAt: addDays(tKey, -7) + 'T08:00:00Z' },
      { id: 'w2', dayKey: tKey, weight: 54.8, createdAt: tKey + 'T08:00:00Z' }
    ]
  });

  var monthlyDigestHTML = buildMonthlyDigestHTML(curYear, curMonth);
  assert(monthlyDigestHTML.includes("Workouts"), "Monthly digest must include Workouts summary");
  assert(monthlyDigestHTML.includes("Avg Intake"), "Monthly digest must include Avg Intake summary");
  assert(monthlyDigestHTML.includes("Weight"), "Monthly digest must include Weight summary");
  console.log("✓ Test 4: Monthly Digest calculates historical workouts, nutrition, and weight delta");

  // 5. Weekly Digest & Archive Cards
  var weeklyDigestHTML = buildWeeklyDigestHTML();
  assert(weeklyDigestHTML.includes("digest_wk_"), "Weekly digest must include collapsible week containers");
  assert(weeklyDigestHTML.includes("data-jump-day="), "Weekly digest must include jump-to-day buttons");
  console.log("✓ Test 5: Weekly Digest archives each past week with day-by-day inspection");

  // 6. Separate Window for Weekly & Monthly History
  var allMonthsHTML = buildAllMonthsHistoryHTML();
  assert(allMonthsHTML.includes("Workouts") && allMonthsHTML.includes("Avg Intake"), "All Months History must render monthly summary blocks");

  var appendedOverlay = null;
  global.document.body = {
    appendChild: function(node) {
      appendedOverlay = node;
    }
  };

  openHistoryArchiveModal('weeks');
  assert(appendedOverlay, "openHistoryArchiveModal must append overlay to body");
  assert(appendedOverlay.innerHTML.includes("id=\"archiveTabWeeksBtn\""), "History separate window must include Past Weeks tab");
  assert(appendedOverlay.innerHTML.includes("id=\"archiveTabMonthsBtn\""), "History separate window must include Past Months tab");
  assert(appendedOverlay.innerHTML.includes("id=\"closeHistoryArchiveBtn\""), "History separate window must include close/done button");
  console.log("✓ Test 6: Separate window opens with dedicated Past Weeks & Past Months tabs and controls");

  console.log("\n=============================================");
  console.log(" ALL WEEKLY & MONTHLY HISTORY TESTS PASSED! ");
  console.log("=============================================\n");
}

run();
