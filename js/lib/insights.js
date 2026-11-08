/* Centralized Evidence-Based Smart Insights Generator */

import { profile } from "../state.js";
import { dayRecord } from "../storage.js";
import { todayKey, currentWeight } from "./format.js";
import { getTargetsForDate, getLoggedWeeklyVolume, checkMuscleVolumeLandmarks } from "./calc.js";

export function generateSmartInsights(dateKeyStr) {
  var dKey = dateKeyStr || todayKey();
  var rec = dayRecord(dKey) || {};
  var targets = getTargetsForDate(dKey);
  var insights = [];

  // 1. Weight Spike / Water Retention
  var entries = (profile && profile.weightEntries) || [];
  if (entries.length >= 2) {
    var sorted = entries.slice().sort(function(a, b) {
      return new Date(a.createdAt || a.dayKey).getTime() - new Date(b.createdAt || b.dayKey).getTime();
    });
    var latest = sorted[sorted.length - 1];
    var prev = sorted[sorted.length - 2];
    var diff = Number(latest.weight) - Number(prev.weight);
    if (diff >= 1.5) {
      insights.push({
        type: 'warning',
        tag: 'Water Retention',
        title: 'Weight Spike Detected',
        text: 'Weight jumped +' + diff.toFixed(1) + ' kg overnight. This is likely water retention, not fat. Stay the course.'
      });
    }
  }

  // 2. Nutrition Macro Insight
  var meals = rec.meals || {};
  var plan = (profile && profile.mealPlan) || {};
  var todayKcal = 0, todayProt = 0;
  Object.keys(plan).forEach(function(gKey) {
    var group = plan[gKey];
    (group.items || []).forEach(function(item) {
      if (meals[item.id]) {
        todayKcal += (item.kcal || 0);
        todayProt += (item.protein || 0);
      }
    });
  });
  if (rec.extra && Array.isArray(rec.extra)) {
    rec.extra.forEach(function(x) {
      todayKcal += (x.kcal || 0);
      todayProt += (x.protein || 0);
    });
  }

  var targetProt = targets.protein || 160;
  if (todayKcal > 0) {
    if (todayProt >= targetProt) {
      insights.push({
        type: 'positive',
        tag: 'Optimal Protein',
        title: 'Protein Target Reached',
        text: 'You reached ' + Math.round(todayProt) + 'g protein (>=2.2g/kg), maximizing muscle protein synthesis.'
      });
    } else if (targetProt - todayProt <= 35) {
      insights.push({
        type: 'info',
        tag: 'Nutrition',
        title: 'Almost at Protein Goal',
        text: 'Only ' + Math.round(targetProt - todayProt) + 'g protein needed to hit your daily hypertrophy threshold.'
      });
    }
  }

  // 3. Junk Volume / Recovery Insight
  try {
    var vol = getLoggedWeeklyVolume();
    var volWarnings = checkMuscleVolumeLandmarks(vol);
    if (volWarnings && volWarnings.length) {
      volWarnings.forEach(function(vw) {
        if (vw.warning) {
          insights.push({
            type: 'warning',
            tag: 'Volume Alert',
            title: vw.muscle + ' Overreach',
            text: vw.message
          });
        }
      });
    }
  } catch(e) {}

  // 4. Default high-morale insight if no alerts
  if (!insights.length) {
    var isGym = (profile && profile.trainingDays || [1, 2, 4, 5, 6]).includes(new Date().getDay());
    insights.push({
      type: 'positive',
      tag: 'Double Progression',
      title: isGym ? 'Training Day Active' : 'Active Recovery',
      text: isGym
        ? 'Focus on hitting the top of your rep range with 1–2 RIR before adding load.'
        : 'Rest is where adaptation occurs. Prioritize sleep and protein synthesis.'
    });
  }

  return insights;
}

export function renderSmartInsightsHTML(dateKeyStr) {
  var list = generateSmartInsights(dateKeyStr);
  if (!list || !list.length) return '';
  return '<div class="smart-insights-wrap" style="margin-bottom:20px">'
    + '<div style="font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Sports Science Insights</div>'
    + list.map(function(item) {
      var borderColor = item.type === 'warning' ? 'rgba(239,68,68,0.3)' : item.type === 'positive' ? 'rgba(139,92,246,0.3)' : 'var(--hairline)';
      var bgColor = item.type === 'warning' ? 'rgba(239,68,68,0.08)' : item.type === 'positive' ? 'rgba(139,92,246,0.08)' : 'var(--surface2)';
      var tagColor = item.type === 'warning' ? '#FF4D4F' : 'var(--accent-primary)';
      return '<div class="metric-card" style="background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:14px;padding:12px 14px;margin-bottom:8px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
          + '<span style="font-size:11px;font-weight:700;color:' + tagColor + ';text-transform:uppercase;letter-spacing:0.06em">' + item.tag + '</span>'
        + '</div>'
        + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:2px">' + item.title + '</div>'
        + '<div style="font-size:12px;color:var(--text-secondary);line-height:1.4">' + item.text + '</div>'
      + '</div>';
    }).join('')
    + '</div>';
}
