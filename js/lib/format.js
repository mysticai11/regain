/* Formatting and date utilities: string escaping, date keys, durations, and labels */

import { profile } from "../state.js";
import { dayRecord } from "../storage.js";

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function dateKey(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  d = d || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function todayKey() {
  return dateKey();
}

export function addDays(key, n) {
  var d = (typeof key === 'string') ? new Date(key + 'T00:00:00') : new Date(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function daysBetween(k1, k2) {
  var d1 = new Date(k1 + 'T00:00:00');
  var d2 = new Date(k2 + 'T00:00:00');
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—';
  var m = Math.round(Number(minutes) || 0);
  if (m < 60) return m + 'm';
  var hrs = Math.floor(m / 60);
  var rem = m % 60;
  return hrs + 'h ' + rem + 'm';
}

export function workoutElapsed(meta) {
  if (!meta || !meta.startedAt) return 0;
  var start = new Date(meta.startedAt).getTime();
  var end = meta.completedAt ? new Date(meta.completedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function currentDayNum() {
  return daysBetween((profile && profile.programStartDate) || todayKey(), todayKey()) + 1;
}

export function allDayKeys() {
  var start = (profile && profile.programStartDate) || todayKey();
  var end = todayKey();
  var count = Math.max(daysBetween(start, end) + 1, 1);
  var keys = [];
  for (var i = 0; i < count; i++) {
    keys.push(addDays(start, i));
  }
  return keys;
}

export function currentWeight() {
  var keys = allDayKeys().reverse();
  for (var i = 0; i < keys.length; i++) {
    var r = dayRecord(keys[i]);
    if (r && r.weight != null && !isNaN(Number(r.weight))) {
      return Number(r.weight);
    }
  }
  return Number(profile && profile.startWeight) || 54.0;
}

export function goalDirection() {
  var cur = currentWeight(), tgt = Number(profile && profile.targetWeight) || 60;
  return tgt > cur ? 'gain' : tgt < cur ? 'lose' : 'maintain';
}

export function goalLabel() {
  var d = goalDirection();
  return d === 'gain' ? 'Gain Mass' : d === 'lose' ? 'Cut Fat' : 'Maintain';
}

export function goalRateLabel() {
  var d = goalDirection();
  if (d === 'gain') return '+0.2 kg / wk';
  if (d === 'lose') return '-0.4 kg / wk';
  return '0.0 kg / wk';
}

export function profileName() {
  return (profile && profile.name) ? profile.name : 'Athlete';
}

export function personalizedEyebrow(defaultTxt) {
  return profileName().toUpperCase() + ' · ' + (defaultTxt || 'TODAY');
}

