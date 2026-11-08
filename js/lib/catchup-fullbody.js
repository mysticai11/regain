/* Pure Full-Body Mode generation, exercise pool categorization, and day selection */

export var FULL_BODY_THRESHOLD = [3, 4];

export function getPrimaryMuscle(ex) {
  if (!ex) return 'other';
  if (ex.primaryMuscle) return String(ex.primaryMuscle).trim().toLowerCase();
  var raw = String(ex.muscle || '').toLowerCase();
  var first = raw.split(',')[0] || 'other';
  first = first.trim();
  if (first === 'chest' || first === 'back' || first === 'quads' || first === 'hamstrings' ||
      first === 'shoulders' || first === 'biceps' || first === 'triceps' || first === 'calves' || first === 'glutes') {
    return first;
  }
  return 'other';
}

export function isCompoundLift(ex) {
  if (!ex) return false;
  if (ex.isCompound !== undefined) return Boolean(ex.isCompound);
  if (ex.type === 'compound') return true;
  var name = (ex.name || ex.id || '').toLowerCase();
  return /press|squat|deadlift|rdl|row|pulldown|pull-up|pullup|dip|hinge/i.test(name);
}

export function selectBestFullBodyDays(remainingDays) {
  if (!Array.isArray(remainingDays) || remainingDays.length === 0) return [];
  if (remainingDays.length === 1) return [remainingDays[0]];
  if (remainingDays.length === 2) return [remainingDays[0], remainingDays[1]];

  // 3 remaining days (e.g. Thu, Fri, Sat): pick first and last (Thu, Sat) to maximize spacing (1 day gap)
  if (remainingDays.length === 3) {
    return [remainingDays[0], remainingDays[2]];
  }

  // 4 remaining days (e.g. Tue, Thu, Fri, Sat): pick Tue and Fri (2 days gap)
  if (remainingDays.length === 4) {
    return [remainingDays[0], remainingDays[2]];
  }

  return [remainingDays[0], remainingDays[remainingDays.length - 1]];
}

export function buildFullBodySession(pool, label, dayIndex, options) {
  var opts = options || {};
  var exPool = Array.isArray(pool) && pool.length > 0 ? pool : [];

  function pickBestFor(category, fallbackEx) {
    var match = exPool.find(function(ex) {
      var m = getPrimaryMuscle(ex);
      var isC = isCompoundLift(ex);
      if (category === 'push') return (m === 'chest' || m === 'shoulders') && isC;
      if (category === 'pull') return m === 'back' && isC;
      if (category === 'quads') return (m === 'quads') && isC;
      if (category === 'hinge') return (m === 'hamstrings' || m === 'glutes') && isC;
      if (category === 'shoulders') return m === 'shoulders' && !isC;
      if (category === 'arms') return m === 'biceps' || m === 'triceps';
      return false;
    });
    return match ? Object.assign({}, match) : Object.assign({}, fallbackEx);
  }

  // Standard full-body archetypes (14-18 sets total)
  var exercises = [];

  // 1. Quads (3 sets)
  var quadEx = pickBestFor('quads', { id:'leg_press', name:'Leg Press', muscle:'quads,glutes', sets:3, type:'compound', isCompound:true });
  quadEx.sets = 3;
  exercises.push(quadEx);

  // 2. Push (3 sets)
  var pushEx = pickBestFor('push', { id:'bench', name:'Flat Bench Press', muscle:'chest', sets:3, type:'compound', isCompound:true });
  pushEx.sets = 3;
  exercises.push(pushEx);

  // 3. Pull (3 sets)
  var pullEx = pickBestFor('pull', { id:'machine_row', name:'Machine Row', muscle:'back', sets:3, type:'compound', isCompound:true });
  pullEx.sets = 3;
  exercises.push(pullEx);

  // 4. Hinge / Hamstrings (3 sets)
  var hingeEx = pickBestFor('hinge', { id:'romanian_deadlift', name:'Romanian Deadlift', muscle:'hamstrings', sets:3, type:'compound', isCompound:true });
  hingeEx.sets = 3;
  exercises.push(hingeEx);

  // 5. Shoulder isolation (2 sets)
  var deltEx = pickBestFor('shoulders', { id:'lateral_raise_machine', name:'Lateral Raise Machine', muscle:'shoulders', sets:2, type:'isolation', isCompound:false });
  deltEx.sets = 2;
  exercises.push(deltEx);

  // 6. Arm isolation (2 sets)
  var armEx = pickBestFor('arms', { id:'ez_bar_curl', name:'EZ-Bar Curl', muscle:'biceps', sets:2, type:'isolation', isCompound:false });
  armEx.sets = 2;
  exercises.push(armEx);

  // Tag all as catch-up / full-body
  exercises.forEach(function(e) {
    e.isCatchup = true;
    e.source = 'catchup';
  });

  var totalSets = exercises.reduce(function(acc, e) { return acc + (e.sets || 2); }, 0);

  return {
    label: label || 'Full-Body Workout',
    cleanName: label || 'Full-Body Workout',
    programDay: dayIndex != null ? dayIndex : 0,
    exercises: exercises,
    isMerged: true,
    isFullBody: true,
    totalSets: totalSets
  };
}

export function planFullBodyMode(todayKeyStr, allMissed, remainingDays, prog, options) {
  var opts = options || {};
  var selectedDays = selectBestFullBodyDays(remainingDays);
  if (!selectedDays || selectedDays.length === 0) {
    return {
      mode: 'full_body',
      valid: false,
      reason: 'No remaining training days left this week',
      isFullBody: true,
      totalMissedSets: allMissed.reduce(function(acc, m) {
        return acc + (m.session.exercises || []).reduce(function(a, e) { return a + (e.sets || 2); }, 0);
      }, 0),
      totalRedistributedSets: 0,
      assignments: {},
      preview: [],
      selectedDays: [],
      remainingDays: remainingDays || []
    };
  }

  // Extract exercise pool from active program
  var pool = [];
  (prog || []).forEach(function(day) {
    (day.exercises || []).forEach(function(ex) {
      if (!pool.some(function(p) { return p.id === ex.id; })) {
        pool.push(ex);
      }
    });
  });

  var assignments = {};
  var preview = [];
  var totalSets = 0;

  selectedDays.forEach(function(dayDate, idx) {
    var sessionLabel = selectedDays.length === 1 ? 'Full-Body Workout' : ('Full-Body ' + (idx === 0 ? 'A' : 'B'));
    var session = buildFullBodySession(pool, sessionLabel, idx, opts);
    assignments[dayDate] = session;
    totalSets += session.totalSets;

    var dObj = new Date(dayDate + 'T00:00:00');
    var weekday = dObj.toLocaleDateString('en-GB', { weekday: 'short' });
    preview.push(weekday + ': ' + sessionLabel + ' (' + session.totalSets + ' sets)');
  });

  // Set unselected remaining days to 'rest'
  remainingDays.forEach(function(d) {
    if (!selectedDays.includes(d)) {
      assignments[d] = 'rest';
      var dObj = new Date(d + 'T00:00:00');
      var weekday = dObj.toLocaleDateString('en-GB', { weekday: 'short' });
      preview.push(weekday + ': Rest');
    }
  });

  return {
    mode: 'full_body',
    valid: selectedDays.length > 0,
    isFullBody: true,
    totalMissedSets: allMissed.reduce(function(acc, m) {
      return acc + (m.session.exercises || []).reduce(function(a, e) { return a + (e.sets || 2); }, 0);
    }, 0),
    totalRedistributedSets: totalSets,
    assignments: assignments,
    preview: preview,
    selectedDays: selectedDays,
    remainingDays: remainingDays
  };
}
