/* Data persistence: localStorage, SQLiteStorage, day records, and backup export/import */

import { esc, allDayKeys, todayKey } from "./lib/format.js";
import { showToast } from "./components/toast.js";
import { DEFAULT_MEAL_PLAN } from "./data/foods.js";
import { saveWorkoutSessionFromDay, workoutSessionStore, WORKOUT_SESSIONS_KEY, WORKOUT_SESSIONS_VERSION } from "./storage-sessions.js";
export * from "./storage-sessions.js";
export * from "./storage-catchup.js";
export { allDayKeys };

export var SQLiteStorage = {
  db: null,
  cache: {},
  active: false,
  
  init: function(callback) {
    var self = this;
    if (window.Capacitor && typeof window.Capacitor.isPluginAvailable === 'function' && window.Capacitor.isPluginAvailable('CapacitorSQLite') && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorSQLite && typeof window.Capacitor.Plugins.CapacitorSQLite.createConnection === 'function') {
      try {
        var sqlite = window.Capacitor.Plugins.CapacitorSQLite;
        sqlite.createConnection({ database: 'regain_storage', version: 1, encrypted: false, mode: 'no-encryption' })
          .then(function(conn) {
            self.db = conn;
            return sqlite.open({ database: 'regain_storage' });
          })
          .then(function() {
            var query = 'CREATE TABLE IF NOT EXISTS rg_storage (key TEXT PRIMARY KEY, value TEXT);';
            return window.Capacitor.Plugins.CapacitorSQLite.execute({ database: 'regain_storage', statements: query });
          })
          .then(function() {
            var select = 'SELECT * FROM rg_storage;';
            return window.Capacitor.Plugins.CapacitorSQLite.query({ database: 'regain_storage', statement: select });
          })
          .then(function(res) {
            if (res && res.values) {
              res.values.forEach(function(row) {
                self.cache[row.key] = row.value;
                localStorage.setItem(row.key, row.value); // Self-healing sync
              });
            }
            self.active = true;
            console.log('SQLite database pre-loaded successfully!');
            createMigrationGuardBackup();
            migrateLegacyKeys();
            if (callback) callback();
          })
          .catch(function(err) {
            console.error('SQLite init error, falling back to LocalStorage:', err);
            self.active = false;
            createMigrationGuardBackup();
            migrateLegacyKeys();
            if (callback) callback();
          });
      } catch(e) {
        console.error('Capacitor SQLite plugin error:', e);
        self.active = false;
        createMigrationGuardBackup();
        migrateLegacyKeys();
        if (callback) callback();
      }
    } else {
      self.active = false;
      createMigrationGuardBackup();
      migrateLegacyKeys();
      if (callback) callback();
    }
  },
  
  get: function(key) {
    return this.cache[key] || null;
  },
  
  set: function(key, valStr) {
    this.cache[key] = valStr;
    if (this.active && window.Capacitor) {
      var query = 'INSERT OR REPLACE INTO rg_storage (key, value) VALUES (?, ?);';
      window.Capacitor.Plugins.CapacitorSQLite.executeJSPS({
        database: 'regain_storage',
        statements: query,
        values: [key, valStr]
      }).catch(function(e) {
        console.error('SQLite write error:', e);
      });
    }
  },
  
  delete: function(key) {
    delete this.cache[key];
    localStorage.removeItem(key);
    if (this.active && window.Capacitor) {
      var query = 'DELETE FROM rg_storage WHERE key = ?;';
      window.Capacitor.Plugins.CapacitorSQLite.executeJSPS({
        database: 'regain_storage',
        statements: query,
        values: [key]
      }).catch(function(e) {
        console.error('SQLite delete error:', e);
      });
    }
  },

  clear: function() {
    var self = this;
    Object.keys(this.cache).forEach(function(key){ delete self.cache[key]; });
    try { localStorage.clear(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
    if(this.active && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorSQLite) {
      var sqlite = window.Capacitor.Plugins.CapacitorSQLite;
      var p = (typeof sqlite.execute === 'function')
        ? sqlite.execute({ database: 'regain_storage', statements: 'DELETE FROM rg_storage;' })
        : (typeof sqlite.executeJSPS === 'function' ? sqlite.executeJSPS({ database: 'regain_storage', statements: 'DELETE FROM rg_storage;', values: [] }) : Promise.resolve());
      return p.catch(function(e){
        console.error('SQLite clear error:', e);
        return Promise.resolve();
      });
    }
    return Promise.resolve();
  }
};

export function resetAllData() {
  return new Promise(function(resolve) {
    try {
      if (typeof window !== 'undefined' && window.FoodDB && typeof window.FoodDB.close === 'function') {
        window.FoodDB.close();
      }
    } catch(e) {}

    SQLiteStorage.clear().catch(function() { return Promise.resolve(); }).then(function() {
      try {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      } catch(e) {}

      if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) {
        try {
          var req = indexedDB.deleteDatabase('rg_food_db');
          var resolved = false;
          var done = function() {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          req.onsuccess = req.onerror = req.onblocked = done;
          setTimeout(done, 800);
        } catch(e) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  });
}

export function ls(k, fb) {
  try {
    var v = SQLiteStorage.active ? SQLiteStorage.get(k) : localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch(e) {
    return fb;
  }
}

export function sv(k, v) {
  try {
    var valStr = JSON.stringify(v);
    localStorage.setItem(k, valStr);
    SQLiteStorage.set(k, valStr);
    return true;
  } catch(e) {
    console.error('Save failed for '+k, e);
    if(typeof showToast === 'function') showToast('Could not save data. Export a backup and try again.','warn');
    return false;
  }
}

export function createMigrationGuardBackup() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem('backup-before-migration')) return;
    var snapshot = {
      timestamp: new Date().toISOString(),
      keys: {}
    };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k) snapshot.keys[k] = localStorage.getItem(k);
    }
    if (SQLiteStorage.cache) {
      Object.keys(SQLiteStorage.cache).forEach(function(k) {
        if (!snapshot.keys[k]) snapshot.keys[k] = SQLiteStorage.cache[k];
      });
    }
    var jsonStr = JSON.stringify(snapshot);
    localStorage.setItem('backup-before-migration', jsonStr);
    if (SQLiteStorage.active) {
      SQLiteStorage.set('backup-before-migration', jsonStr);
    }
  } catch(e) {
    console.warn('Migration guard backup failed:', e);
  }
}

export function migrateLegacyKeys() {
  createMigrationGuardBackup();
  try {
    var prefixMap = {
      'tally_profile': 'rg_profile',
      'regain_profile': 'rg_profile',
      'tally_meals': 'rg_meals',
      'regain_meals': 'rg_meals',
      'tally_recent_foods': 'rg_recent_foods',
      'regain_recent_foods': 'rg_recent_foods',
      'tally_last_backup': 'rg_last_backup',
      'tally_workout_sessions': 'rg_workout_sessions'
    };
    Object.keys(prefixMap).forEach(function(oldKey) {
      var newKey = prefixMap[oldKey];
      var current = ls(newKey, null);
      if (current === null) {
        var legacy = ls(oldKey, null);
        if (legacy !== null) {
          sv(newKey, legacy);
        }
      }
    });

    if (typeof localStorage !== 'undefined') {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        var match = k.match(/^(?:tally|regain)_day_(\d{4}-\d{2}-\d{2})$/);
        if (match) {
          var newKey = 'rg_day_' + match[1];
          if (ls(newKey, null) === null) {
            var val = ls(k, null);
            if (val !== null) sv(newKey, val);
          }
        }
      }
    }
  } catch(e) {
    console.warn('Migration error:', e);
  }
}

export function dayRecord(key) {
  var r = ls('rg_day_'+key, null);
  if (!r) return {weight:null,sleep:null,readiness:null,steps:null,activeBurn:null,workoutDurationMins:0,meals:{},extra:[],workout:{},workoutDone:false,shielded:false};
  if (!Array.isArray(r.extra)) r.extra = [];
  if (!r.workout) r.workout = {};
  if (!r.meals) r.meals = {};
  if (r.steps === undefined) r.steps = null;
  if (r.activeBurn === undefined) r.activeBurn = null;
  if (r.workoutDurationMins === undefined) r.workoutDurationMins = 0;
  return r;
}

export function saveDayRecord(key, rec, options){
  sv('rg_day_'+key, rec);
  if (!options || !options.silent) {
    saveWorkoutSessionFromDay(key, rec, Object.keys(workoutSessionStore().sessions).length, options);
    if (typeof window !== 'undefined' && typeof window.scheduleStateNotification === 'function') {
      window.scheduleStateNotification();
    }
  } else {
    saveWorkoutSessionFromDay(key, rec, Object.keys(workoutSessionStore().sessions).length, { silent: true });
  }
}

export { exportData, importData, serializeAllStores, parseAndValidateBackup, applyRestore } from "./storage-backup.js";

export function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return;
  navigator.storage.persist().then(function(granted) {
    if (!granted) console.info('Persistent storage was not granted by the browser');
  }).catch(function(err) {
    console.warn('Persistent storage request failed:', err);
  });
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
