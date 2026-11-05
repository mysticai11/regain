/* Storage Backup & Restore: atomic export and import with Capacitor Filesystem & Share, Replace/Merge */

import { profile, setProfile } from "./state.js";
import { sv, ls, dayRecord, allDayKeys, SQLiteStorage, WORKOUT_SESSIONS_KEY, WORKOUT_SESSIONS_VERSION, getWorkoutSessions } from "./storage.js";
import { DEFAULT_MEAL_PLAN } from "./data/foods.js";
import { todayKey, esc } from "./lib/format.js";
import { showToast } from "./components/toast.js";
import { openSheet } from "./components/sheet.js";

export async function serializeAllStores() {
  var dbExportPromise = Promise.resolve({});
  var dbObj = (typeof window !== 'undefined' && window.FoodDB) ? window.FoodDB : (typeof FoodDB !== 'undefined' ? FoodDB : null);
  if (dbObj && typeof dbObj.exportAll === 'function') {
    try { dbExportPromise = dbObj.exportAll(); } catch(e) {}
  }
  var dbData = await dbExportPromise;

  var keys = allDayKeys();
  var keySet = {};
  keys.forEach(function(k){ keySet[k] = true; });
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage).forEach(function(k){ if(k.indexOf('rg_day_') === 0) keySet[k.slice(7)] = true; });
  }
  Object.keys(SQLiteStorage.cache || {}).forEach(function(k){ if(k.indexOf('rg_day_') === 0) keySet[k.slice(7)] = true; });
  keys = Object.keys(keySet).sort();

  var daysMap = {};
  keys.forEach(function(k){ daysMap[k] = dayRecord(k); });

  var currentProfile = profile || ls('rg_profile', null) || {};
  var sessions = getWorkoutSessions();
  var customEx = ls('rg_custom_exercises', currentProfile.customExercises || []);
  var customStaples = ls('rg_custom_staples', currentProfile.customStaples || []);
  var recentFoods = ls('rg_recent_foods', []);
  var meals = ls('rg_meals', DEFAULT_MEAL_PLAN);

  return {
    app: "forge",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profile: currentProfile,
      days: daysMap,
      workoutSessions: sessions,
      customExercises: customEx,
      customStaples: customStaples,
      recentFoods: recentFoods,
      meals: meals,
      idb: dbData
    }
  };
}

export async function exportData() {
  try {
    var backupObject = await serializeAllStores();
    var jsonStr = JSON.stringify(backupObject, null, 2);
    var fileName = 'forge-backup-' + todayKey() + '.json';

    if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Filesystem')) {
      try {
        var Filesystem = window.Capacitor.Plugins.Filesystem;
        var Share = window.Capacitor.Plugins.Share;
        var writeRes = await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: 'CACHE',
          encoding: 'utf8'
        });
        if (Share && typeof Share.share === 'function') {
          await Share.share({
            title: 'Forge Backup ' + todayKey(),
            url: writeRes.uri
          });
          sv('rg_last_backup', Date.now());
          showToast('Backup shared successfully', 'ok');
          return;
        }
      } catch (err) {
        console.warn('Capacitor native share failed, trying fallback download:', err);
      }
    }

    if (navigator.share && navigator.canShare) {
      try {
        var file = new File([jsonStr], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Forge Backup ' + todayKey(), files: [file] });
          sv('rg_last_backup', Date.now());
          showToast('Backup shared successfully', 'ok');
          return;
        }
      } catch(e) {}
    }

    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    sv('rg_last_backup', Date.now());
    showToast('Backup downloaded successfully', 'ok');
  } catch (err) {
    console.error('Export failed:', err);
    showToast('Export failed. Check storage permissions.', 'warn');
  }
}

export function parseAndValidateBackup(rawText) {
  var parsed = null;
  try { parsed = JSON.parse(rawText); } catch(e) { return null; }
  if (!parsed || typeof parsed !== 'object') return null;

  var appName = (parsed.app || '').toLowerCase();
  if (appName && appName !== 'forge' && appName !== 'tally' && appName !== 'regain') return null;

  var payload = parsed.data || parsed;
  if (!payload.profile && !payload.days) return null;

  var foodCount = 0;
  var daysObj = payload.days || {};
  Object.keys(daysObj).forEach(function(k) {
    var d = daysObj[k];
    if (!d) return;
    if (Array.isArray(d.foodLog)) foodCount += d.foodLog.length;
    if (Array.isArray(d.meals)) {
      d.meals.forEach(function(m){ if (Array.isArray(m.items)) foodCount += m.items.length; });
    }
  });

  var weightsCount = 0;
  if (payload.profile && Array.isArray(payload.profile.weightEntries)) {
    weightsCount = payload.profile.weightEntries.length;
  } else {
    Object.keys(daysObj).forEach(function(k) { if (daysObj[k] && daysObj[k].weight) weightsCount++; });
  }

  var workoutCount = 0;
  if (Array.isArray(payload.workoutSessions)) {
    workoutCount = payload.workoutSessions.length;
  } else if (payload.workoutSessions && typeof payload.workoutSessions.sessions === 'object') {
    workoutCount = Object.keys(payload.workoutSessions.sessions).length;
  } else {
    Object.keys(daysObj).forEach(function(k) { if (daysObj[k] && (daysObj[k].workoutDone || daysObj[k].workout)) workoutCount++; });
  }

  return {
    valid: true,
    schemaVersion: parsed.schemaVersion || parsed.version || 1,
    counts: { food: foodCount, weights: weightsCount, workouts: workoutCount },
    payload: payload
  };
}

export async function applyRestore(payload, mode) {
  var snapshot = await serializeAllStores();
  try {
    var pData = payload.profile || {};
    var incomingDays = payload.days || {};

    if (mode === 'replace') {
      var existingKeys = allDayKeys();
      existingKeys.forEach(function(k) { SQLiteStorage.delete('rg_day_' + k); });
      sv('rg_profile', pData);
      sv('rg_meals', payload.meals || DEFAULT_MEAL_PLAN);
      sv('rg_recent_foods', payload.recentFoods || []);
      sv('rg_custom_exercises', payload.customExercises || pData.customExercises || []);
      sv('rg_custom_staples', payload.customStaples || pData.customStaples || []);
      if (payload.workoutSessions) sv(WORKOUT_SESSIONS_KEY, payload.workoutSessions);
      Object.keys(incomingDays).forEach(function(k) { sv('rg_day_' + k, incomingDays[k]); });
    } else {
      var curProf = profile || ls('rg_profile', {});
      var mergedProfile = Object.assign({}, curProf, pData);
      var wMap = {};
      (curProf.weightEntries || []).forEach(function(w){ if(w.id) wMap[w.id] = w; });
      (pData.weightEntries || []).forEach(function(w){ if(w.id) wMap[w.id] = w; });
      mergedProfile.weightEntries = Object.values(wMap);
      sv('rg_profile', mergedProfile);

      var exMap = {};
      (ls('rg_custom_exercises', [])).forEach(function(e){ exMap[e.id || e.name] = e; });
      (payload.customExercises || []).forEach(function(e){ exMap[e.id || e.name] = e; });
      sv('rg_custom_exercises', Object.values(exMap));

      var stMap = {};
      (ls('rg_custom_staples', [])).forEach(function(s){ stMap[s.id || s.name] = s; });
      (payload.customStaples || []).forEach(function(s){ stMap[s.id || s.name] = s; });
      sv('rg_custom_staples', Object.values(stMap));

      Object.keys(incomingDays).forEach(function(k) {
        var existing = dayRecord(k);
        var inc = incomingDays[k];
        var mergedDay = Object.assign({}, existing, inc);
        if (existing.meals && inc.meals) {
          mergedDay.meals = inc.meals;
        }
        sv('rg_day_' + k, mergedDay);
      });
    }

    var dbObj = (typeof window !== 'undefined' && window.FoodDB) ? window.FoodDB : (typeof FoodDB !== 'undefined' ? FoodDB : null);
    if (dbObj && typeof dbObj.importAll === 'function' && payload.idb) {
      await dbObj.importAll(payload.idb);
    }
    sv('rg_last_backup', Date.now());
    return { success: true };
  } catch (err) {
    console.error('Import transaction error, rolling back:', err);
    try {
      if (snapshot && snapshot.data) {
        sv('rg_profile', snapshot.data.profile);
        Object.keys(snapshot.data.days || {}).forEach(function(k){ sv('rg_day_' + k, snapshot.data.days[k]); });
      }
    } catch(rollbackErr) {}
    throw err;
  }
}

export function openImportConfirmSheet(validated, onApplied) {
  var c = validated.counts;
  var countsStr = c.food + ' food entries, ' + c.weights + ' weigh-ins, ' + c.workouts + ' workouts';

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = '<div class="sheet" style="background:#141416;border-radius:20px 20px 0 0;padding:20px 20px calc(24px + var(--safe-b));max-width:480px;width:100%">'
    + '<div class="sheet-handle"></div>'
    + '<div style="font-size:28px;font-weight:600;color:#F5F5F4;margin-bottom:8px">Import Backup</div>'
    + '<div style="font-size:15px;color:#8A8A8E;margin-bottom:16px">' + esc(countsStr) + ' found in backup file. Choose how to apply:</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">'
      + '<button type="button" class="btn" id="confirmMergeBackupBtn" style="height:48px;border-radius:12px;background:#C6F432;color:#0B0B0C;font-size:15px;font-weight:600;border:none;cursor:pointer">Merge with existing data</button>'
      + '<button type="button" class="btn" id="confirmReplaceBackupBtn" style="height:48px;border-radius:12px;background:#1C1C1F;color:#FF4D4F;border:1px solid #FF4D4F;font-size:15px;font-weight:600;cursor:pointer">Replace all data</button>'
      + '<button type="button" class="btn" id="cancelImportBackupBtn" style="height:48px;border-radius:12px;background:#1C1C1F;color:#8A8A8E;border:none;font-size:15px;cursor:pointer">Cancel</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);

  overlay.querySelector('#cancelImportBackupBtn').onclick = function() { overlay.remove(); };
  overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#confirmMergeBackupBtn').onclick = async function() {
    overlay.remove();
    try {
      await applyRestore(validated.payload, 'merge');
      showToast('Data merged successfully', 'ok');
      if (typeof onApplied === 'function') onApplied();
      setTimeout(function(){ location.reload(); }, 600);
    } catch(e) {
      showToast('Import failed. Rolled back.', 'warn');
    }
  };

  overlay.querySelector('#confirmReplaceBackupBtn').onclick = async function() {
    overlay.remove();
    try {
      await applyRestore(validated.payload, 'replace');
      showToast('Data replaced successfully', 'ok');
      if (typeof onApplied === 'function') onApplied();
      setTimeout(function(){ location.reload(); }, 600);
    } catch(e) {
      showToast('Import failed. Rolled back.', 'warn');
    }
  };
}

export function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = function() {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var validated = parseAndValidateBackup(e.target.result);
      if (!validated || !validated.valid) {
        showToast('Invalid or corrupted backup file', 'warn');
        return;
      }
      openImportConfirmSheet(validated, function() {});
    };
    reader.readAsText(file);
  };
  input.click();
}

