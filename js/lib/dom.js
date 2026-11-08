/* DOM utilities: SVG icon renderer, Web Audio synthesizer, haptics, and wake lock */

export var ICONS = {
  home:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
  home_filled: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3 3 10.5V20a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1v-9.5L12 3z"/></svg>',
  chart:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  chart_filled: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="3" y="10" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="17" y="12" width="4" height="8" rx="1"/></svg>',
  barbell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12h2M20 12h2M5 8v8M19 8v8M5 12h14"/></svg>',
  barbell_filled: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2 11h2v2H2zm3-4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4V7zm14 0h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1zm3 4h2v2h-2zM6 11h12v2H6z"/></svg>',
  flame:   '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-.5-2 1 1 2 2.5 2 5a4.5 4.5 0 0 1-9 0C7.5 9 11 8 12 3z"/></svg>',
  bolt:    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  check:   '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 13l4 4L19 7"/></svg>',
  plus:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  x:       '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  settings:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  info:    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></svg>',
  moon:    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  shield:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 5-3 7.5-7 9-4-1.5-7-4-7-9V6l7-3z"/></svg>',
  skip:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5v14l10-7L5 5z"/><path d="M19 5v14"/></svg>',
  bowl:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M12 11V6"/></svg>',
  egg:     '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c4 4 7 9 7 13a7 7 0 0 1-14 0c0-4 3-9 7-13z"/></svg>',
  search:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  download:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v13M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>',
  upload:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V3M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>',
  trash:   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  trend_up:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M15 7h7v7"/></svg>',
  cook:    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12c.5-5 4-8 9-8a9 9 0 0 1 7 11H2z"/><path d="M2 12h17M12 12v8"/></svg>',
  book:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  sun:     '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  target:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  trophy:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3.5c0 3.3-2.7 6-6 6s-6-2.7-6-6V8a6 6 0 0 1 6-6Z"/></svg>',
  frown:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  avocado: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.5 2 6 6 6 12c0 5 3.5 8.5 6 8.5s6-3.5 6-8.5c0-6-2.5-10-6-10z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  user:    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};

export function ic(name, size) {
  var s = ICONS[name] || '';
  if (size) s = s.replace(/width="\d+"/, 'width="'+size+'"').replace(/height="\d+"/, 'height="'+size+'"');
  return '<span class="icon">' + s + '</span>';
}

// ── LocalStorage & SQLite helpers ────────────────────────────────────────────────
var SQLiteStorage = {
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
            if (callback) callback();
          })
          .catch(function(err) {
            console.error('SQLite init error, falling back to LocalStorage:', err);
            self.active = false;
            if (callback) callback();
          });
      } catch(e) {
        console.error('Capacitor SQLite plugin error:', e);
        self.active = false;
        if (callback) callback();
      }
    } else {
      self.active = false;
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
    var self=this;
    Object.keys(this.cache).forEach(function(key){delete self.cache[key];});
    localStorage.clear();
    if(this.active && window.Capacitor) {
      return window.Capacitor.Plugins.CapacitorSQLite.executeJSPS({
        database:'regain_storage',
        statements:'DELETE FROM rg_storage;'
      }).catch(function(e){console.error('SQLite clear error:',e);throw e;});
    }
    return Promise.resolve();
  }
};

export function hashPin(pin, salt) {
  var bytes = new TextEncoder().encode(pin);
  return crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']).then(function(key) {
    return crypto.subtle.deriveBits({name:'PBKDF2', salt:new TextEncoder().encode(salt), iterations:310000, hash:'SHA-256'}, key, 256);
  }).then(function(bits) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bits)));
  });
}

export function verifyPin(pin, stored) {
  return hashPin(pin, stored.salt).then(function(hash) { return hash === stored.hash; });
}

// ── Profile / Day helpers ──────────────────────────────────────────────────────

export var _audioCtx = null;
export function getAudioContext() {
  if (!_audioCtx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) _audioCtx = new AudioCtx();
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

export function playSound(type) {
  try {
    var ctx = getAudioContext();
    if (!ctx) return;
    var now = ctx.currentTime;
    if (type === 'set_logged') {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'timer_done') {
      [0, 0.15, 0.3].forEach(function(delay, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880 + i * 110, now + delay);
        gain.gain.setValueAtTime(0.2, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } else if (type === 'workout_complete') {
      [0, 0.1, 0.2, 0.32].forEach(function(delay, i) {
        var freqs = [523.25, 659.25, 783.99, 1046.5];
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[i], now + delay);
        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
        osc.start(now + delay);
        osc.stop(now + delay + 0.28);
      });
    }
  } catch(e) {}
}

export var _wakeLock = null;
export function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !_wakeLock) {
      navigator.wakeLock.request('screen').then(function(lock){
        _wakeLock = lock;
        lock.addEventListener('release', function(){ _wakeLock = null; });
      }).catch(function(){});
    }
  } catch(e) {}
}

export function releaseWakeLock() {
  try {
    if (_wakeLock) {
      _wakeLock.release().catch(function(){});
      _wakeLock = null;
    }
  } catch(e) {}
}

export function triggerHaptic(type) {
  try {
    var p = (typeof window !== 'undefined' && window.profile) || null;
    if (p && (p.hapticsMuted === true || p.hapticsEnabled === false)) return;
    var dur = 15;
    if (type === 'medium') dur = 35;
    else if (type === 'selection') dur = 8;
    else if (type === 'success') {
      if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Haptics')) {
        window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
      } else if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
      return;
    }
    if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Haptics')) {
      var H = window.Capacitor.Plugins.Haptics;
      if (type === 'selection' && H && H.selectionChanged) H.selectionChanged();
      else if (type === 'medium' && H && H.impact) H.impact({ style: 'MEDIUM' });
      else if (H && H.impact) H.impact({ style: 'LIGHT' });
      else if (H && H.vibrate) H.vibrate();
    } else if (navigator.vibrate) {
      navigator.vibrate(dur);
    }
  } catch(e) {}
}

var lastShownNumbers = new Map();
var activeNumberRafs = new Map();
var sessionCountUpDone = false;

export function animateNumber(el, from, to, opts) {
  if (!el) return;
  opts = opts || {};
  var duration = opts.duration != null ? opts.duration : 300;
  var key = el.id || (el.dataset && el.dataset.animKey) || el;
  var isDecimals = opts.decimals === 1;

  var prefersReduced = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  if (typeof window !== 'undefined' && window.MOTION_POLISH_ENABLED === false) {
    prefersReduced = true;
  }

  from = Number(from) || 0;
  to = Number(to) || 0;

  var formatVal = function(v) { return isDecimals ? v.toFixed(1) : v.toLocaleString(); };
  if (el.setAttribute) el.setAttribute('aria-label', formatVal(to));
  if (el.style) el.style.fontVariantNumeric = 'tabular-nums';

  var lastVal = lastShownNumbers.get(key);
  if (lastVal !== undefined && lastVal === to) {
    el.textContent = formatVal(to);
    return;
  }

  if (activeNumberRafs.has(key)) {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(activeNumberRafs.get(key));
    }
    activeNumberRafs.delete(key);
  }

  var isFirstPaint = (lastVal === undefined);
  if (isFirstPaint) {
    var allowFirstPaint = opts.duration === 600 || (opts.isTodayHero && !sessionCountUpDone);
    if (opts.isTodayHero) sessionCountUpDone = true;
    if (!allowFirstPaint) {
      lastShownNumbers.set(key, to);
      el.textContent = formatVal(to);
      return;
    }
  }

  if (lastVal !== undefined) {
    from = lastVal;
  }
  lastShownNumbers.set(key, to);

  if (prefersReduced || duration <= 0 || typeof requestAnimationFrame === 'undefined') {
    el.textContent = formatVal(to);
    return;
  }

  var startTime = null;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    var progress = Math.min((timestamp - startTime) / duration, 1);
    var ease = 1 - Math.pow(1 - progress, 3);
    var current = isDecimals ? (from + (to - from) * ease) : Math.round(from + (to - from) * ease);
    el.textContent = formatVal(current);
    if (progress < 1) {
      var handle = requestAnimationFrame(step);
      activeNumberRafs.set(key, handle);
    } else {
      activeNumberRafs.delete(key);
      el.textContent = formatVal(to);
    }
  }
  var initHandle = requestAnimationFrame(step);
  activeNumberRafs.set(key, initHandle);
}

export function showFoodAddedChip(kcal) {
  if (typeof document === 'undefined') return;
  var heroEl = document.getElementById('todayHeroCal');
  if (!heroEl) return;
  var prev = document.getElementById('foodAddedFloatChip');
  if (prev && prev.parentNode) prev.remove();
  var chip = document.createElement('span');
  chip.id = 'foodAddedFloatChip';
  chip.className = 'food-added-chip tabnum';
  chip.textContent = '+' + Math.round(kcal);
  heroEl.appendChild(chip);
  setTimeout(function() {
    if (chip && chip.parentNode) chip.remove();
  }, 700);
}

export function initMaterialRipple() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (document._rippleInitialized) return;
  document._rippleInitialized = true;

  document.addEventListener('pointerdown', function(e) {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    var target = e.target && e.target.closest && e.target.closest('.ripple, .list-row, .navitem, .tab-item, .chip, .quick-staple-chip, .week-strip-day, .settings-row, .btn:not(.btn-primary)');
    if (!target) return;
    if (target.classList.contains('btn-primary') || target.closest('.btn-primary')) return;

    var rect = target.getBoundingClientRect();
    var d = 2 * Math.max(rect.width, rect.height);
    var rip = document.createElement('span');
    rip.className = 'rip';
    rip.style.width = d + 'px';
    rip.style.height = d + 'px';
    rip.style.left = (e.clientX - rect.left - d / 2) + 'px';
    rip.style.top = (e.clientY - rect.top - d / 2) + 'px';
    rip.addEventListener('animationend', function() {
      rip.remove();
    });
    target.appendChild(rip);
  }, { passive: true });
}
