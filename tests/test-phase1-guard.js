const assert = require('assert');

global.localStorage = {
  _store: {
    'rg_profile': JSON.stringify({ kcal: 3000, protein: 120 }),
    'rg_day_2026-11-05': JSON.stringify({ weight: 55, workoutDone: false })
  },
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  key(i) { return Object.keys(this._store)[i]; },
  get length() { return Object.keys(this._store).length; }
};
global.window = {};

async function testGuard() {
  const storage = await import('../js/storage.js');
  storage.createMigrationGuardBackup();
  const raw = global.localStorage.getItem('backup-before-migration');
  assert.ok(raw, 'backup-before-migration must be written to storage');
  const backup = JSON.parse(raw);
  assert.ok(backup.timestamp, 'timestamp must exist');
  assert.ok(backup.keys['rg_profile'], 'rg_profile must be backed up');
  assert.ok(backup.keys['rg_day_2026-11-05'], 'rg_day_2026-11-05 must be backed up');
  console.log('✓ Migration guard backup test PASSED!');
}

testGuard().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
