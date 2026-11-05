/* Application entry point: initializes app, sets up router, and boots services */

import { profile, setProfile, tab, setTab, workoutTimer, restTimer, subscribe, getState, setState, preserveUiStateDuringRender } from "./state.js";
import { ls, sv, SQLiteStorage, migrateWorkoutSessions, requestPersistentStorage } from "./storage.js";
import { DEFAULT_MEAL_PLAN } from "./data/foods.js";
import { migrateWorkoutRoutineSwap, getActiveProgram } from "./data/plan.js";
import { todayKey, esc } from "./lib/format.js";
import { ic } from "./lib/dom.js";
import { renderTodaySimple, migrateFoodTotals, openCheckinSheet } from "./screens/today.js";
import { renderProgressSimple } from "./screens/progress.js";
import { renderGym } from "./screens/gym.js";
import { renderOnboarding, openSettings } from "./screens/settings.js";
import { openEditWorkoutSheet, openSplitManagerSheet } from "./screens/gym/plan-editor.js";
import { openGymDateDaySheet, chooseWorkoutForDate } from "./screens/gym/session-sheet.js";
import { openSwapSheet } from "./screens/gym/swap.js";

export function renderApp() {
  if (!profile) {
    var p = ls('rg_profile', null);
    if (p) setProfile(p);
  }
  document.getElementById('app').innerHTML =
    '<main class="content page-gutter" id="content"></main>'
    + '<nav class="bottomnav tab-bar">'
    + '<button class="navitem tab-item' + (tab === 'today' ? ' active' : '') + '" data-tab="today">' + ic('home') + '<span class="tab-item-label">Today</span></button>'
    + '<button class="navitem tab-item' + (tab === 'progress' ? ' active' : '') + '" data-tab="progress">' + ic('chart') + '<span class="tab-item-label">Progress</span></button>'
    + '<button class="navitem tab-item' + (tab === 'gym' ? ' active' : '') + '" data-tab="gym">' + ic('barbell') + '<span class="tab-item-label">Gym</span></button>'
    + '</nav>';
  renderTab();
  document.querySelectorAll('.navitem').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (workoutTimer.interval) { clearInterval(workoutTimer.interval); workoutTimer.interval = null; }
      if (restTimer.interval) { clearInterval(restTimer.interval); restTimer.interval = null; restTimer.endAt = 0; restTimer.remaining = 0; }
      setTab(btn.dataset.tab);
      document.querySelectorAll('.navitem').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
      renderTab();
    });
  });
}

export function renderTab() {
  var content = document.getElementById('content');
  if (content) content.innerHTML = '';
  try {
    if (tab === 'today') renderTodaySimple();
    else if (tab === 'progress') renderProgressSimple();
    else renderGym();
  } catch (err) {
    console.error('Error rendering tab ' + tab + ':', err);
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────────
function bootApp() {
  console.log('BOOT: bootApp running');
  SQLiteStorage.init(function () {
    console.log('BOOT: SQLiteStorage init done');
    requestPersistentStorage();
    var loadedProfile = ls('rg_profile', null);
    console.log('BOOT: loadedProfile:', loadedProfile ? loadedProfile.name : 'null');
    setProfile(loadedProfile);
    migrateWorkoutSessions();
    migrateWorkoutRoutineSwap();
    if (typeof window.FoodDB !== 'undefined' && window.FoodDB.open) {
      window.FoodDB.open().then(function () {
        console.log('BOOT: FoodDB opened');
        onStorageReady();
      }).catch(function (err) {
        console.error('FoodDB open failed, proceeding:', err);
        onStorageReady();
      });
    } else {
      console.log('BOOT: FoodDB not defined');
      onStorageReady();
    }
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }
}

function onStorageReady() {
  var p = ls('rg_profile', null);
  setProfile(p);
  if (p) {
    migrateFoodTotals();
    if (!p.mealPlan) {
      p.mealPlan = JSON.parse(JSON.stringify(DEFAULT_MEAL_PLAN));
      sv('rg_profile', p);
      setProfile(p);
    }
  }
  if (!p) {
    renderOnboarding();
  } else {
    if (p.pin) {
      delete p.pin;
      sv('rg_profile', p);
      setProfile(p);
    }
    renderApp();
    subscribe(function() {
      preserveUiStateDuringRender(renderTab);
    });
    if (location.hash === '#checkin' || location.search.indexOf('checkin') > -1) {
      openCheckinSheet(todayKey());
    }
  }
}

// ── Service Worker ──────────────────────────────────────────────────────────────
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js?v=tally-v1').then(function (reg) {
      if (!reg) return;
      var showUpdateBanner = function () {
        if (document.getElementById('swUpdateBanner')) return;
        var banner = document.createElement('div');
        banner.id = 'swUpdateBanner';
        banner.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#1C1C1F;border:1px solid #222;border-radius:12px;padding:8px 16px;z-index:9999;display:flex;align-items:center;gap:12px;font-size:15px;color:#F5F5F4';
        banner.innerHTML = '<span>Update available</span><button type="button" class="btn-text-action" style="color:#C6F432;font-size:15px;font-weight:600;background:none;border:none;cursor:pointer;padding:0" onclick="location.reload()">Reload</button>';
        document.body.appendChild(banner);
      };

      if (reg.waiting) {
        showUpdateBanner();
      }
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    }).catch(function () {});
  });
}

// Expose key functions on window for inline HTML onclick handlers and test runner
if (typeof window !== 'undefined') {
  window.setTab = function(t) {
    setTab(t);
    document.querySelectorAll('.navitem').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === t); });
    renderTab();
  };
  window.openEditWorkoutSheet = openEditWorkoutSheet;
  window.openSettings = openSettings;
  window.renderApp = renderApp;
  window.renderTab = renderTab;
  window.renderTodaySimple = renderTodaySimple;
  window.renderGym = renderGym;
  window.renderProgressSimple = renderProgressSimple;
  window.renderProgress = renderProgressSimple;
  window.chooseWorkoutForDate = chooseWorkoutForDate;
  window.openGymDateDaySheet = openGymDateDaySheet;
  window.openSwapSheet = openSwapSheet;
  window.openSplitManagerSheet = openSplitManagerSheet;
}

// Global delegated event listeners for resilient tap handling
if (typeof document !== 'undefined') {
  document.addEventListener('click', function(e) {
    var settingsBtn = e.target.closest('#settingsBtn, .settings-btn');
    if (settingsBtn) {
      e.preventDefault();
      e.stopPropagation();
      openSettings();
    }
  });
}
