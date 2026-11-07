/* Pure Week Strip Engine: 7-day strip calculation and state resolution (Item 5) */

var DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Pure function to compute week strip days and states.
 * No DOM, no storage, no Date.now() inside.
 *
 * @param {Object} params
 * @param {string} params.mondayKey 'YYYY-MM-DD' for Monday
 * @param {string} params.todayDateKey 'YYYY-MM-DD' for today
 * @param {string} [params.activeSelectedKey] currently viewed day
 * @param {Object} [params.dayRecordsMap]
 * @param {Array<number>} [params.plannedDayIndices] 0-based ISO indices (0=Mon..6=Sun)
 * @param {Object} [params.overrides]
 * @param {Object} [params.decisions]
 * @returns {Array<Object>} 7 day objects
 */
export function computeWeekStrip({
  mondayKey,
  todayDateKey,
  activeSelectedKey,
  dayRecordsMap = {},
  plannedDayIndices = [0, 1, 2, 4, 5],
  overrides = {},
  decisions = {}
} = {}) {
  if (!mondayKey || !todayDateKey) {
    throw new Error('computeWeekStrip requires mondayKey and todayDateKey');
  }

  var mParts = mondayKey.split('-').map(Number);
  var days = [];

  for (var d = 0; d < 7; d++) {
    // Local date stepping (no ms addition)
    var curD = new Date(mParts[0], mParts[1] - 1, mParts[2] + d);
    var y = curD.getFullYear();
    var m = String(curD.getMonth() + 1).padStart(2, '0');
    var dayNum = String(curD.getDate()).padStart(2, '0');
    var k = y + '-' + m + '-' + dayNum;

    var isToday = (k === todayDateKey);
    var isSelected = (k === activeSelectedKey);
    var isPast = (k < todayDateKey);
    var isFuture = (k > todayDateKey);

    var rec = dayRecordsMap[k];
    var isPlanned = plannedDayIndices.includes(d);
    if (overrides[k] !== undefined) {
      isPlanned = (overrides[k] !== 'rest');
    }

    var isTrained = false;
    if (rec) {
      if (rec.workoutDone) {
        isTrained = true;
      } else if (rec.workout) {
        var wKeys = Object.keys(rec.workout);
        for (var w = 0; w < wKeys.length; w++) {
          var sets = rec.workout[wKeys[w]];
          if (Array.isArray(sets) && sets.some(function(s) { return s && (Number(s.weight) > 0 || Number(s.reps) > 0); })) {
            isTrained = true;
            break;
          }
        }
      }
    }

    var state;
    if (isTrained) {
      state = 'done';
    } else if (isFuture || isToday) {
      state = isPlanned ? 'planned' : 'rest';
    } else { // isPast
      state = isPlanned ? 'skipped' : 'rest';
    }

    var isMerged = Boolean((rec && rec.isMerged) || (decisions[k] === 'merged'));
    var isSlid = Boolean((decisions[k] === 'slid') || (overrides[k] !== undefined && overrides[k] !== 'rest'));

    days.push({
      dayIndex: d,
      dayLetter: DAY_LETTERS[d],
      dateKey: k,
      state: state,
      isToday: isToday,
      isSelected: isSelected,
      isPlanned: isPlanned,
      isMerged: isMerged,
      isSlid: isSlid
    });
  }

  return days;
}
