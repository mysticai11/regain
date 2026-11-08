/* UI Component: 6 Weekly Stat Tiles Grid (Task R2-2) */

import { renderSparklineSVG } from "../../ui/sparkline.js";
import { computeWeeklyStatTiles } from "../../view/weeklyStats.js";
import { esc } from "../../lib/format.js";

/**
 * Builds the 6-tile grid HTML string for Progress > Body.
 *
 * @param {Array<Object>} tiles Array of 6 tile objects from computeWeeklyStatTiles
 * @returns {string} HTML string
 */
export function buildWeeklyStatTilesHTML(tiles) {
  if (!Array.isArray(tiles) || tiles.length === 0) return '';

  var cardsHTML = tiles.map(function(tile) {
    var sparklineHTML = '';
    var strokeColor = 'var(--accent-primary)';
    if (tile.id === 'calories' || tile.id === 'protein') {
      strokeColor = 'var(--accent-secondary)';
    } else if (tile.id === 'workouts' || tile.id === 'sets' || tile.id === 'rate') {
      strokeColor = 'var(--accent-pink)';
    }

    if (tile.sparklinePoints && tile.sparklinePoints.length > 0) {
      sparklineHTML = renderSparklineSVG(tile.sparklinePoints, {
        width: 56,
        height: 20,
        stroke: strokeColor,
        strokeWidth: 1.5
      });
    } else if (tile.trend) {
      var arrow = tile.trend === 'up' ? '↗' : (tile.trend === 'down' ? '↘' : '→');
      var color = tile.trend === 'up' ? 'var(--accent-primary)' : (tile.trend === 'down' ? '#FF4D4F' : 'var(--text-secondary)');
      sparklineHTML = '<span style="font-size:15px;font-weight:600;color:' + color + ';line-height:1">' + arrow + '</span>';
    }

    return '<div class="stat-tile metric-card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between;min-height:106px;min-width:0;box-sizing:border-box">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;width:100%;min-width:0">'
        + '<span style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:var(--text-secondary);text-transform:uppercase;min-width:0;flex:1;line-height:1.2;word-break:break-word">' + esc(tile.title) + '</span>'
        + '<span style="flex-shrink:0">' + sparklineHTML + '</span>'
      + '</div>'
      + '<div style="margin-top:8px;min-width:0;overflow:hidden">'
        + '<div style="font-size:28px;font-weight:700;line-height:1.1;color:var(--text);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(tile.value) + (tile.unit ? (' <span style="font-size:15px;font-weight:500;color:var(--text-secondary)">' + esc(tile.unit) + '</span>') : '') + '</div>'
        + '<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(tile.subtitle) + '">' + esc(tile.subtitle) + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="stat-tiles-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:24px 0;width:100%;max-width:100%;box-sizing:border-box">'
    + cardsHTML
    + '</div>';
}

export function enhanceProgressBodyTiles(container, data) {
  if (!container) return;
  var tiles = computeWeeklyStatTiles(data);
  container.innerHTML = buildWeeklyStatTilesHTML(tiles);
}

