/* Reusable shared UI component builders: ListRow, SectionLabel, Button, Input, DotGrid, DayToggles */

import { esc } from "../lib/format.js";

export function renderSectionLabel(text, meta, extraStyle) {
  if (typeof meta === 'string' && extraStyle == null && meta.indexOf(':') > -1) {
    extraStyle = meta;
    meta = null;
  }
  var styleAttr = extraStyle ? ' style="' + esc(extraStyle) + '"' : '';
  var metaHTML = meta ? '<span class="section-label-meta">' + esc(meta) + '</span>' : '';
  return '<div class="section-label"' + styleAttr + '><span>' + esc(text) + '</span>' + metaHTML + '</div>';
}

export function renderStatNumber(val, unit, extraClass) {
  var cls = 'stat-number' + (extraClass ? ' ' + extraClass : '');
  return '<span class="' + cls + '"><span class="stat-number-val">' + esc(val) + '</span><span class="stat-number-unit">' + esc(unit || '') + '</span></span>';
}

export function renderListRow(title, value, options) {
  options = options || {};
  var sub = options.subtitle ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + esc(options.subtitle) + '</div>' : '';
  var badge = options.badge ? ' <span style="font-size:11px;color:var(--lime);font-weight:600;margin-left:6px">' + esc(options.badge) + '</span>' : '';
  var clickAttr = options.onClickAttr ? ' ' + options.onClickAttr : '';
  var cls = 'list-row' + (options.className ? ' ' + options.className : '');
  return '<div class="' + cls + '"' + clickAttr + '>'
    + '<div class="list-row-name">' + esc(title) + badge + sub + '</div>'
    + '<div class="list-row-val">' + (options.rawVal ? value : esc(value)) + '</div>'
    + '</div>';
}

export function renderButton(options) {
  options = options || {};
  var cls = 'btn' + (options.variant ? ' btn-' + options.variant : '') + (options.className ? ' ' + options.className : '');
  var idAttr = options.id ? ' id="' + options.id + '"' : '';
  var typeAttr = options.type ? ' type="' + options.type + '"' : ' type="button"';
  var dataAttr = options.dataAttr ? ' ' + options.dataAttr : '';
  var icon = options.icon ? '<span class="btn-icon" style="margin-right:6px;display:inline-flex">' + options.icon + '</span>' : '';
  var style = options.style ? ' style="' + options.style + '"' : '';
  return '<button' + typeAttr + cls + idAttr + dataAttr + style + '>' + icon + esc(options.text || '') + '</button>';
}

export function renderPrecisionSetRow(options) {
  // options: { setNum, weightVal, repsVal, rirVal, done, isExtra, onCycleRir, tag }
  var tagHTML = options.tag ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:-2px;margin-bottom:6px;padding-left:26px">' + esc(options.tag) + '</div>' : '';
  var isDone = !!options.done;
  var rirText = options.rirVal === 0 ? 'F' : (options.rirVal != null ? 'RIR ' + options.rirVal : '3+');
  return '<div class="set-row-precision' + (options.isExtra ? ' is-extra' : '') + '">'
    + '<span style="font-size:15px;font-weight:600;color:var(--text-secondary);width:18px;text-align:center">' + options.setNum + '</span>'
    + '<input type="number" step="0.5" class="precision-input" placeholder="kg" value="' + (options.weightVal || '') + '">'
    + '<input type="number" step="1" class="precision-input" placeholder="reps" value="' + (options.repsVal || '') + '">'
    + '<button type="button" class="rir-cycle-text">' + rirText + '</button>'
    + '<button type="button" class="precision-circle-tap">'
      + '<span class="precision-circle' + (isDone ? ' done' : '') + '">' + (isDone ? '✓' : '') + '</span>'
    + '</button>'
    + '</div>'
    + tagHTML;
}

export function renderDotGrid(days) {
  // days: array of { trained, isToday, isUntrainedToday, empty }
  var cells = (days || []).map(function(d) {
    var cls = 'dot-cell';
    if (d.trained) cls += ' trained';
    else if (d.isToday && d.trained) cls += ' today-session';
    else if (d.isToday) cls += ' today-untrained';
    else if (d.empty) cls += ' empty';
    return '<span class="' + cls + '"></span>';
  }).join('');
  return '<div class="dot-grid">' + cells + '</div>';
}

export function renderProgressLine(percent) {
  var p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return '<div class="prog-line-wrap"><div class="prog-line-fill" style="width:' + p + '%"></div></div>';
}

export function renderDayToggles(activeDays, dataPrefix) {
  dataPrefix = dataPrefix || 'day-toggle';
  var dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var activeSet = new Set(activeDays || []);
  var btns = dayNames.map(function(name, idx) {
    var dayNum = idx + 1; // 1=Mon .. 7=Sun
    var isActive = activeSet.has(dayNum);
    return '<button type="button" class="day-toggle' + (isActive ? ' active' : '') + '" data-' + dataPrefix + '="' + dayNum + '">' + name + '</button>';
  }).join('');
  return '<div class="day-toggles">' + btns + '</div>';
}

