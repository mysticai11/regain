/* Application entry point: initializes app, sets up router, and boots services */

import { profile, setProfile, tab, setTab, workoutTimer, restTimer } from "./state.js";
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
    '<main class="content" id="content"></main>'
    +'<nav class="bottomnav tab-bar">'
      +'<button class="navitem tab-item'+(tab==='today'?' active':'')+'" data-tab="today">'+ic('home')+'<span class="tab-item-label">Today</span></button>'
      +'<button class="navitem tab-item'+(tab==='progress'?' active':'')+'" data-tab="progress">'+ic('chart')+'<span class="tab-item-label">Progress</span></button>'
      +'<button class="navitem tab-item'+(tab==='gym'?' active':'')+'" data-tab="gym">'+ic('barbell')+'<span class="tab-item-label">Gym</span></button>'
    +'</nav>';
  renderTab();
  document.querySelectorAll('.navitem').forEach(function(btn){
    btn.addEventListener('click',function(){
      if(workoutTimer.interval){clearInterval(workoutTimer.interval);workoutTimer.interval=null;}
      if(restTimer.interval){clearInterval(restTimer.interval);restTimer.interval=null;restTimer.endAt=0;restTimer.remaining=0;}
      setTab(btn.dataset.tab);
      document.querySelectorAll('.navitem').forEach(function(b){b.classList.toggle('active',b.dataset.tab===tab);});
      renderTab();
    });
  });
}

export function renderTab() {
  if(tab==='today') renderTodaySimple();
  else if(tab==='progress') renderProgressSimple();
  else renderGym();
}

// ── Boot ────────────────────────────────────────────────────────────────────────
function bootApp() {
  console.log('BOOT: bootApp running');
  SQLiteStorage.init(function(){
    console.log('BOOT: SQLiteStorage init done');
    requestPersistentStorage();
    var loadedProfile = ls('rg_profile', null);
    console.log('BOOT: loadedProfile:', loadedProfile ? loadedProfile.name : 'null');
    setProfile(loadedProfile);
    migrateWorkoutSessions();
    migrateWorkoutRoutineSwap();
    if (typeof window.FoodDB !== 'undefined' && window.FoodDB.open) {
      window.FoodDB.open().then(function(){
        console.log('BOOT: FoodDB opened');
        onStorageReady();
      }).catch(function(err){
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
  if(p) {
    migrateFoodTotals();
    if(!p.mealPlan) {
      p.mealPlan = JSON.parse(JSON.stringify(DEFAULT_MEAL_PLAN));
      sv('rg_profile', p);
      setProfile(p);
    }
  }
  if(!p) {
    renderOnboarding();
  } else {
    if(p.pin) {
      delete p.pin;
      sv('rg_profile', p);
      setProfile(p);
    }
    renderApp();
    if (location.hash === '#checkin' || location.search.indexOf('checkin') > -1) {
      openCheckinSheet(todayKey());
    }
  }
}

// ── Service Worker ──────────────────────────────────────────────────────────────
if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js?v=regain-v1').catch(function(){});
  });
}

// Expose key functions on window for inline HTML onclick handlers and test runner
if (typeof window !== 'undefined') {
  window.openEditWorkoutSheet = openEditWorkoutSheet;
  window.openSettings = openSettings;
  window.renderApp = renderApp;
  window.renderTab = renderTab;
  window.chooseWorkoutForDate = chooseWorkoutForDate;
  window.openGymDateDaySheet = openGymDateDaySheet;
  window.openSwapSheet = openSwapSheet;
  window.openSplitManagerSheet = openSplitManagerSheet;
}
