const assert = require('assert');

// Mock browser environment
const localStorageData = {
  'rg_profile': JSON.stringify({ name: 'Test' }),
  'rg_meals': JSON.stringify({ test: 123 }),
  'rg_workout_sessions': JSON.stringify({ sessions: {} }),
  'backup-before-migration': 'true'
};

global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = v; },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }
};

global.sessionStorage = {
  clear: () => {}
};

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  FoodDB: {
    closed: false,
    close: function() { this.closed = true; }
  }
};

global.indexedDB = {
  deleteDatabase: function(name) {
    return {
      onsuccess: null,
      onerror: null,
      onblocked: null
    };
  }
};

async function testReset() {
  const { SQLiteStorage, resetAllData } = await import('../js/storage.js');
  
  SQLiteStorage.cache['test_key'] = 'val';
  assert.strictEqual(SQLiteStorage.cache['test_key'], 'val');
  assert.strictEqual(localStorage.getItem('rg_profile') !== null, true);

  await resetAllData();

  assert.strictEqual(Object.keys(SQLiteStorage.cache).length, 0, 'SQLiteStorage cache must be empty');
  assert.strictEqual(localStorage.getItem('rg_profile'), null, 'localStorage rg_profile must be null');
  assert.strictEqual(window.FoodDB.closed, true, 'FoodDB.close must have been called');
  
  console.log('✓ resetAllData test passed with 100% success!');
}

testReset().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

