/* Pure Weekly Stat Tiles Engine (Task R2-2) */

/**
 * Pure function computing the 6 weekly summary metric cards.
 * Zero DOM, zero storage, zero Date.now() inside.
 *
 * @param {Object} params
 * @param {Array<Object>} params.entries Weight entries [{ dayKey, weight, createdAt }]
 * @param {Array<Object>} params.records Daily totals [{ key, kcal, protein, weight }]
 * @param {Array<Object>} params.workoutSessions [{ dayKey, exercises }]
 * @param {Object} params.profile User profile
 * @param {string} params.todayDateKey Local date key 'YYYY-MM-DD'
 * @returns {Array<Object>} 6 tile view-models
 */
export function computeWeeklyStatTiles({
  entries = [],
  records = [],
  workoutSessions = [],
  profile = {},
  todayDateKey
} = {}) {
  if (!todayDateKey) {
    throw new Error('computeWeeklyStatTiles requires todayDateKey');
  }

  var targetWeight = Number(profile.targetWeight) || 60;
  var targetCal = (profile && profile.currentTargetKcal) || (function() {
    var tdays = profile.trainingDays || [1, 2, 4, 5, 6];
    var parts = todayDateKey.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var isTrain = tdays.includes(d.getDay());
    return isTrain ? (Number(profile.calTargetGym) || 3000) : (Number(profile.calTargetRest) || 2700);
  })();
  var targetProt = Number(profile.protTargetGym || profile.protTargetRest) || 150;
  var plannedSessionsPerWeek = (Array.isArray(profile.trainingDays) && profile.trainingDays.length) ? profile.trainingDays.length : 5;

  var tParts = todayDateKey.split('-').map(Number);
  var todayDate = new Date(tParts[0], tParts[1] - 1, tParts[2]);

  // 1. Seven-day date key window (past 6 days + today)
  var past7DateKeys = [];
  for (var i = 6; i >= 0; i--) {
    var cur = new Date(tParts[0], tParts[1] - 1, tParts[2] - i);
    var y = cur.getFullYear();
    var m = String(cur.getMonth() + 1).padStart(2, '0');
    var d = String(cur.getDate()).padStart(2, '0');
    past7DateKeys.push(y + '-' + m + '-' + d);
  }
  var min7Key = past7DateKeys[0];

  // ── Tile 1: Weight ──
  var validEntries = entries.filter(function(e) { return e && e.weight != null; });
  var recentWeights = validEntries.filter(function(e) {
    var k = e.dayKey || (e.createdAt ? e.createdAt.slice(0, 10) : '');
    return k >= min7Key && k <= todayDateKey;
  });

  var avgWeight = 0;
  if (recentWeights.length) {
    avgWeight = recentWeights.reduce(function(sum, e) { return sum + Number(e.weight); }, 0) / recentWeights.length;
  } else if (validEntries.length) {
    var lastN = validEntries.slice(-7);
    avgWeight = lastN.reduce(function(sum, e) { return sum + Number(e.weight); }, 0) / lastN.length;
  }

  var weightSparkline = validEntries.slice(-14).map(function(e) { return Number(e.weight); });
  var toGoal = avgWeight > 0 ? (targetWeight - avgWeight) : null;

  var tileWeight = {
    id: 'weight',
    title: '7-Day Avg Weight',
    value: avgWeight > 0 ? avgWeight.toFixed(1) : '—',
    unit: 'kg',
    subtitle: toGoal != null ? (Math.abs(toGoal).toFixed(1) + ' kg to ' + Math.round(targetWeight) + ' kg') : ('Target ' + targetWeight + ' kg'),
    sparklinePoints: weightSparkline
  };

  // ── Tile 2: Rate ──
  var weeklyRate = null;
  if (validEntries.length >= 2) {
    var fEntry = validEntries[0];
    var lEntry = validEntries[validEntries.length - 1];
    var fDate = new Date((fEntry.dayKey || fEntry.createdAt).slice(0, 10) + 'T00:00:00');
    var lDate = new Date((lEntry.dayKey || lEntry.createdAt).slice(0, 10) + 'T00:00:00');
    var diffWeeks = Math.max(0.5, (lDate - fDate) / (7 * 86400000));
    weeklyRate = (Number(lEntry.weight) - Number(fEntry.weight)) / diffWeeks;
  }

  var trendDirection = 'flat';
  var rateStatus = 'Need data';
  if (weeklyRate != null) {
    if (weeklyRate > 0.05) trendDirection = 'up';
    else if (weeklyRate < -0.05) trendDirection = 'down';

    if (weeklyRate >= 0.25 && weeklyRate <= 0.55) rateStatus = 'On target (+0.25–0.50)';
    else if (weeklyRate < 0.25 && weeklyRate >= 0) rateStatus = 'Slow pace';
    else if (weeklyRate > 0.55) rateStatus = 'Fast gain';
    else rateStatus = 'Losing weight';
  }

  var tileRate = {
    id: 'rate',
    title: 'Weekly Rate',
    value: weeklyRate != null ? ((weeklyRate >= 0 ? '+' : '') + weeklyRate.toFixed(2)) : '—',
    unit: 'kg/wk',
    subtitle: rateStatus,
    trend: trendDirection,
    sparklinePoints: []
  };

  // ── Tile 3: Calories ──
  var recordsMap = {};
  records.forEach(function(r) { if (r && r.key) recordsMap[r.key] = r; });

  var calSeries = past7DateKeys.map(function(k) { return (recordsMap[k] && Number(recordsMap[k].kcal)) || 0; });
  var activeCalDays = calSeries.filter(function(v) { return v > 0; });
  var avgCal = activeCalDays.length ? (activeCalDays.reduce(function(a, b) { return a + b; }, 0) / activeCalDays.length) : 0;

  var tileCalories = {
    id: 'calories',
    title: '7-Day Avg Intake',
    value: avgCal > 0 ? Math.round(avgCal).toLocaleString() : '—',
    unit: 'kcal',
    subtitle: 'Target ' + targetCal.toLocaleString() + ' kcal',
    sparklinePoints: calSeries
  };

  // ── Tile 4: Protein ──
  var protSeries = past7DateKeys.map(function(k) { return (recordsMap[k] && Number(recordsMap[k].protein)) || 0; });
  var activeProtDays = protSeries.filter(function(v) { return v > 0; });
  var avgProt = activeProtDays.length ? (activeProtDays.reduce(function(a, b) { return a + b; }, 0) / activeProtDays.length) : 0;

  var tileProtein = {
    id: 'protein',
    title: '7-Day Avg Protein',
    value: avgProt > 0 ? String(Math.round(avgProt)) : '—',
    unit: 'g',
    subtitle: 'Target ' + targetProt + ' g',
    sparklinePoints: protSeries
  };

  // ── Tile 5: Workouts ──
  var validSessions = workoutSessions.filter(function(s) {
    if (!s || !s.dayKey) return false;
    return (s.exercises || []).some(function(ex) { return (ex.sets || []).some(Boolean); });
  });

  var recentSessions = validSessions.filter(function(s) {
    return s.dayKey >= min7Key && s.dayKey <= todayDateKey;
  });

  var completedCount = recentSessions.length;
  var tileWorkouts = {
    id: 'workouts',
    title: 'Workouts',
    value: completedCount + ' / ' + plannedSessionsPerWeek,
    unit: 'done',
    subtitle: completedCount >= plannedSessionsPerWeek ? 'Weekly target hit' : (plannedSessionsPerWeek - completedCount) + ' remaining',
    sparklinePoints: []
  };

  // ── Tile 6: Sets (Volume) ──
  var recentSets = 0;
  recentSessions.forEach(function(s) {
    (s.exercises || []).forEach(function(ex) {
      recentSets += (ex.sets || []).filter(Boolean).length;
    });
  });

  // Calculate 6-week sets history for sparkline
  var weeklySetsSparkline = [];
  for (var w = 5; w >= 0; w--) {
    var wStart = new Date(tParts[0], tParts[1] - 1, tParts[2] - (w * 7 + 6));
    var wEnd = new Date(tParts[0], tParts[1] - 1, tParts[2] - (w * 7));
    var kStart = wStart.getFullYear() + '-' + String(wStart.getMonth() + 1).padStart(2, '0') + '-' + String(wStart.getDate()).padStart(2, '0');
    var kEnd = wEnd.getFullYear() + '-' + String(wEnd.getMonth() + 1).padStart(2, '0') + '-' + String(wEnd.getDate()).padStart(2, '0');

    var wSets = 0;
    validSessions.forEach(function(s) {
      if (s.dayKey >= kStart && s.dayKey <= kEnd) {
        (s.exercises || []).forEach(function(ex) {
          wSets += (ex.sets || []).filter(Boolean).length;
        });
      }
    });
    weeklySetsSparkline.push(wSets);
  }

  var tileSets = {
    id: 'sets',
    title: 'Weekly Sets',
    value: String(recentSets),
    unit: 'sets',
    subtitle: 'Completed past 7 days',
    sparklinePoints: weeklySetsSparkline
  };

  return [tileWeight, tileRate, tileCalories, tileProtein, tileWorkouts, tileSets];
}
