/* Application entry point: initializes app, sets up router, and boots services */

import { profile, setProfile, tab, setTab, workoutTimer, restTimer, subscribe, getState, setState, preserveUiStateDuringRender, scrollByTab, MOTION_POLISH_ENABLED } from "./state.js";
import { ls, sv, SQLiteStorage, migrateWorkoutSessions, requestPersistentStorage, checkWeekRollover } from "./storage.js";
import { DEFAULT_MEAL_PLAN } from "./data/foods.js";
import { migrateWorkoutRoutineSwap, getActiveProgram } from "./data/plan.js";
import { todayKey, esc } from "./lib/format.js";
import { ic, triggerHaptic, initMaterialRipple } from "./lib/dom.js";
import { renderTodaySimple, migrateFoodTotals, openCheckinSheet } from "./screens/today.js?v=26";
import { renderProgressSimple } from "./screens/progress.js?v=25";
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
    + '<nav class="bottomnav tab-bar" role="tablist">'
    + '<button class="navitem tab-item' + (tab === 'today' ? ' active' : '') + '" data-tab="today" role="tab" aria-selected="' + (tab === 'today' ? 'true' : 'false') + '" aria-label="Today">'
      + '<span class="nav-pill-wrap"><span class="nav-pill"></span><span class="nav-icon nav-icon-outline">' + ic('home') + '</span><span class="nav-icon nav-icon-filled">' + ic('home_filled') + '</span></span>'
      + '<span class="tab-item-label">Today</span>'
    + '</button>'
    + '<button class="navitem tab-item' + (tab === 'progress' ? ' active' : '') + '" data-tab="progress" role="tab" aria-selected="' + (tab === 'progress' ? 'true' : 'false') + '" aria-label="Progress">'
      + '<span class="nav-pill-wrap"><span class="nav-pill"></span><span class="nav-icon nav-icon-outline">' + ic('chart') + '</span><span class="nav-icon nav-icon-filled">' + ic('chart_filled') + '</span></span>'
      + '<span class="tab-item-label">Progress</span>'
    + '</button>'
    + '<button class="navitem tab-item' + (tab === 'gym' ? ' active' : '') + '" data-tab="gym" role="tab" aria-selected="' + (tab === 'gym' ? 'true' : 'false') + '" aria-label="Gym">'
      + '<span class="nav-pill-wrap"><span class="nav-pill"></span><span class="nav-icon nav-icon-outline">' + ic('barbell') + '</span><span class="nav-icon nav-icon-filled">' + ic('barbell_filled') + '</span></span>'
      + '<span class="tab-item-label">Gym</span>'
    + '</button>'
    + '</nav>';
  renderTab();
  document.querySelectorAll('.navitem').forEach(function (btn) {
    btn.addEventListener('click', function () {
      triggerHaptic();
      setTab(btn.dataset.tab);
      document.querySelectorAll('.navitem').forEach(function (b) {
        var isAct = b.dataset.tab === tab;
        b.classList.toggle('active', isAct);
        b.setAttribute('aria-selected', isAct ? 'true' : 'false');
      });
      var c = document.getElementById('content');
      if (c) {
        c.classList.remove('page-enter');
        void c.offsetWidth;
        c.classList.add('page-enter');
        clearTimeout(c._enterTimer);
        c._enterTimer = setTimeout(function() { if (c) c.classList.remove('page-enter'); }, 320);
      }
      renderTab();
    });
  });
}

export function renderTab() {
  var content = document.getElementById('content');
  if (content) {
    content.innerHTML = '';
  }
  try {
    if (tab === 'today') renderTodaySimple();
    else if (tab === 'progress') renderProgressSimple();
    else renderGym();
  } catch (err) {
    console.error('Error rendering tab ' + tab + ':', err);
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(function() {
      var c = document.getElementById('content');
      if (c && scrollByTab && scrollByTab[tab] != null) {
        c.scrollTop = scrollByTab[tab];
      }
    });
  }
}

export function initSwipeNavigation() {
  // Slide navigation is scoped strictly to Progress sub-tabs (Body / Lifts / History).
  // Top-level tabs (Today, Gym, Progress) are tap-only via bottom navigation.
  if (typeof window === 'undefined') return;
  window._swipeNavInitialized = true;
}

export function initKeyboardHandling() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (window._keyboardInitialized) return;
  window._keyboardInitialized = true;

  if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Keyboard')) {
    try {
      var Keyboard = window.Capacitor.Plugins.Keyboard;
      Keyboard.addListener('keyboardWillShow', function() {
        document.body.classList.add('kb-open');
      });
      Keyboard.addListener('keyboardWillHide', function() {
        document.body.classList.remove('kb-open');
      });
    } catch(err) {
      console.warn('Capacitor Keyboard listener error:', err);
    }
  }

  document.addEventListener('focusin', function(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      document.body.classList.add('kb-open');
    }
  });

  document.addEventListener('focusout', function() {
    setTimeout(function() {
      var active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
        document.body.classList.remove('kb-open');
      }
    }, 100);
  });
}

export function initEdgeToEdgeAndSplash() {
  if (typeof window === 'undefined') return;

  if (window.Capacitor && window.Capacitor.isPluginAvailable) {
    if (window.Capacitor.isPluginAvailable('StatusBar')) {
      try {
        var StatusBar = window.Capacitor.Plugins.StatusBar;
        if (StatusBar.setOverlaysWebView) StatusBar.setOverlaysWebView({ overlay: true });
        if (StatusBar.setStyle) StatusBar.setStyle({ style: 'DARK' });
        if (StatusBar.setBackgroundColor) StatusBar.setBackgroundColor({ color: '#0B0B0C' });
      } catch (err) {
        console.warn('StatusBar init error:', err);
      }
    }

    if (window.Capacitor.isPluginAvailable('SplashScreen')) {
      try {
        var SplashScreen = window.Capacitor.Plugins.SplashScreen;
        if (SplashScreen.hide) {
          setTimeout(function() {
            SplashScreen.hide({ fadeOutDuration: 150 });
          }, 60);
        }
      } catch (err) {
        console.warn('SplashScreen hide error:', err);
      }
    }
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────────
function bootApp() {
  console.log('BOOT: bootApp running');
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-motion-polish', MOTION_POLISH_ENABLED ? 'true' : 'false');
  }
  initMaterialRipple();
  initKeyboardHandling();
  initSwipeNavigation();
  SQLiteStorage.init(function () {
    console.log('BOOT: SQLiteStorage init done');
    requestPersistentStorage();
    var loadedProfile = ls('rg_profile', null);
    console.log('BOOT: loadedProfile:', loadedProfile ? loadedProfile.name : 'null');
    setProfile(loadedProfile);
    migrateWorkoutSessions();
    migrateWorkoutRoutineSwap();
    checkWeekRollover();
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

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootApp);
  } else if (typeof document !== 'undefined' && document.getElementById && document.getElementById('app')) {
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
    if (p && (p.disableSlideNav || p.disableSwipeNav)) document.documentElement.classList.add('no-slide-nav');
    renderApp();
    subscribe(function() {
      preserveUiStateDuringRender(renderTab);
    });
    if (typeof location !== 'undefined') {
      if (location.hash === '#gym') { setTab('gym'); renderTab(); }
      else if (location.hash === '#progress') { setTab('progress'); renderTab(); }
      else if (location.hash === '#settings') { openSettings(); }
      else if (location.hash === '#checkin' || (location.search && location.search.indexOf('checkin') > -1)) {
        openCheckinSheet(todayKey());
      }
    }
  }
  initEdgeToEdgeAndSplash();
  dismissOpeningVisual();
}

function dismissOpeningVisual() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  var opening = document.getElementById('appOpeningVisual');
  if (opening && opening.classList && opening.classList.add) {
    opening.classList.add('is-dismissed');
    setTimeout(function () {
      if (opening && opening.parentNode && opening.parentNode.removeChild) {
        opening.parentNode.removeChild(opening);
      }
    }, 320);
  }
}

// ── Service Worker ──────────────────────────────────────────────────────────────
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js?v=regain-v26').then(function (reg) {
      if (!reg) return;
      var showUpdateBanner = function () {
        if (document.getElementById('swUpdateBanner')) return;
        var banner = document.createElement('div');
        banner.id = 'swUpdateBanner';
        banner.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#1C1C1F;border:1px solid #222;border-radius:12px;padding:8px 16px;z-index:9999;display:flex;align-items:center;gap:12px;font-size:15px;color:#F5F5F4';
        banner.innerHTML = '<span>Update available</span><button type="button" class="btn-text-action" style="color:var(--accent-primary);font-size:15px;font-weight:600;background:none;border:none;cursor:pointer;padding:0" onclick="location.reload()">Reload</button>';
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
    triggerHaptic();
    setTab(t);
    document.querySelectorAll('.navitem').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === t); });
    var c = document.getElementById('content');
    if (c) {
      c.classList.remove('page-enter');
      void c.offsetWidth;
      c.classList.add('page-enter');
      clearTimeout(c._enterTimer);
      c._enterTimer = setTimeout(function() { if (c) c.classList.remove('page-enter'); }, 320);
    }
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

// Hardware and gesture back button handling
if (typeof window !== 'undefined') {
  var handleBackButtonDismiss = function() {
    var overlays = document.querySelectorAll('.overlay, .sheet-overlay, .modal-backdrop, .quick-edit-modal-backdrop, [role="dialog"]');
    if (overlays && overlays.length > 0) {
      var topOverlay = overlays[overlays.length - 1];
      var closeBtn = topOverlay.querySelector('#closeSettingsBtn, #closeFoodSearch, #closeExerciseModal, #closeSheetBtn, #closeActionMenuBtn, #closeModalBtn, .close-btn');
      if (closeBtn) closeBtn.click();
      else topOverlay.remove();
      return true;
    }
    if (window.activeExpandedExId) {
      window.activeExpandedExId = null;
      renderGym();
      return true;
    }
    if (tab !== 'today') {
      window.setTab('today');
      return true;
    }
    return false;
  };

  window.addEventListener('popstate', function() {
    handleBackButtonDismiss();
  });

  if (window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('App')) {
    try {
      window.Capacitor.Plugins.App.addListener('backButton', function() {
        if (!handleBackButtonDismiss()) {
          window.Capacitor.Plugins.App.exitApp();
        }
      });
    } catch(e) {}
  }
}

// Global delegated event listeners for resilient tap handling
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', function(e) {
    var settingsBtn = e.target.closest('#settingsBtn, .settings-btn');
    if (settingsBtn) {
      e.preventDefault();
      e.stopPropagation();
      openSettings();
    }
  });
}
