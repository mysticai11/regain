/* Pure Calendar Grid Engine: Monday-first matrix calculation (Item 4) */

var MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Computes a pure 7-column calendar matrix starting on Monday.
 * Pure function: NO DOM, NO storage, NO Date.now() inside.
 *
 * @param {Object} config
 * @param {number} config.year e.g. 2026
 * @param {number} config.monthIndex 0-based month (0=Jan, 11=Dec)
 * @param {Object} [config.dayRecordsMap] 'YYYY-MM-DD' -> record
 * @param {Array<number>} [config.plannedDayIndices] 0-based ISO days (0=Mon, 6=Sun)
 * @param {string} config.todayDateKey 'YYYY-MM-DD' reference date
 * @returns {Object} Grid matrix object
 */
export function computeCalendarGrid({
  year,
  monthIndex,
  dayRecordsMap = {},
  plannedDayIndices = [0, 2, 4],
  todayDateKey
} = {}) {
  if (year === undefined || monthIndex === undefined || !todayDateKey) {
    throw new Error('computeCalendarGrid requires year, monthIndex, and todayDateKey');
  }

  // 1. First day of month (Monday-first offset)
  var firstDay = new Date(year, monthIndex, 1);
  var mondayOffset = (firstDay.getDay() + 6) % 7; // 0=Mon ... 6=Sun

  // 2. Days in month
  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // 3. Grid sizing (Fixed 6 rows = 42 cells to prevent layout shift)
  var totalRows = 6;
  var gridCellsCount = 42;

  var cells = [];
  var trainedCount = 0;
  var plannedCount = 0;

  for (var i = 0; i < gridCellsCount; i++) {
    if (i < mondayOffset || i >= mondayOffset + daysInMonth) {
      cells.push({ empty: true });
    } else {
      var dayNum = i - mondayOffset + 1;
      var mStr = String(monthIndex + 1).padStart(2, '0');
      var dStr = String(dayNum).padStart(2, '0');
      var dateKey = year + '-' + mStr + '-' + dStr;
      var dayOfWeek = i % 7;

      var rec = dayRecordsMap[dateKey];
      var isToday = (dateKey === todayDateKey);
      var isPast = (dateKey < todayDateKey);
      var isFuture = (dateKey > todayDateKey);
      var isPlanned = plannedDayIndices.includes(dayOfWeek);

      var hasWorkoutSets = false;
      if (rec && rec.workout) {
        var wKeys = Object.keys(rec.workout);
        for (var w = 0; w < wKeys.length; w++) {
          var sets = rec.workout[wKeys[w]];
          if (Array.isArray(sets) && sets.some(function(s) { return s && (Number(s.weight) > 0 || Number(s.reps) > 0); })) {
            hasWorkoutSets = true;
            break;
          }
        }
      }

      var trained = Boolean(rec && (rec.workoutDone || hasWorkoutSets));

      var state;
      if (trained) {
        state = 'trained';
        trainedCount++;
        if (isPlanned || isPast || isToday) {
          plannedCount++;
        }
      } else if (isFuture) {
        state = isPlanned ? 'planned' : 'rest';
        if (isPlanned) plannedCount++;
      } else if (isToday) {
        state = isPlanned ? 'planned' : 'rest';
        if (isPlanned) plannedCount++;
      } else { // isPast
        state = isPlanned ? 'skipped' : 'rest';
        if (isPlanned) plannedCount++;
      }

      cells.push({
        empty: false,
        dayNumber: dayNum,
        dateKey: dateKey,
        state: state,
        isToday: isToday,
        isInteractive: !isFuture
      });
    }
  }

  var consistencyPct = plannedCount > 0 ? Math.round((trainedCount / plannedCount) * 100) : 0;

  return {
    year: year,
    monthIndex: monthIndex,
    monthLabel: MONTH_NAMES[monthIndex] + ' ' + year,
    totalRows: totalRows,
    cells: cells,
    stats: {
      trainedCount: trainedCount,
      plannedCount: plannedCount,
      consistencyPct: consistencyPct
    }
  };
}
