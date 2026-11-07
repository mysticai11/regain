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
    if (tile.sparklinePoints && tile.sparklinePoints.length > 0) {
      sparklineHTML = renderSparklineSVG(tile.sparklinePoints, {
        width: 56,
        height: 20,
        stroke: tile.id === 'protein' ? '#F5F5F4' : '#C6F432',
        strokeWidth: 1.5
      });
    } else if (tile.trend) {
      var arrow = tile.trend === 'up' ? '↗' : (tile.trend === 'down' ? '↘' : '→');
      var color = tile.trend === 'up' ? 'var(--lime)' : (tile.trend === 'down' ? '#FF4D4F' : 'var(--text-secondary)');
      sparklineHTML = '<span style="font-size:15px;font-weight:600;color:' + color + ';line-height:1">' + arrow + '</span>';
    }

    return '<div class="stat-tile" style="background:var(--surface);border:1px solid var(--hairline);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;min-height:92px;box-sizing:border-box">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">'
        + '<span class="t-micro" style="color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">' + esc(tile.title) + '</span>'
        + sparklineHTML
      + '</div>'
      + '<div style="margin-top:6px">'
        + '<div style="font-size:28px;font-weight:600;line-height:1.1;color:var(--text);font-variant-numeric:tabular-nums">' + esc(tile.value) + (tile.unit ? (' <span style="font-size:15px;font-weight:500;color:var(--text-secondary)">' + esc(tile.unit) + '</span>') : '') + '</div>'
        + '<div class="t-micro" style="color:var(--text-secondary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(tile.subtitle) + '">' + esc(tile.subtitle) + '</div>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="stat-tiles-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0">'
    + cardsHTML
    + '</div>';
}

export function enhanceProgressBodyTiles(container, data) {
  if (!container) return;
  var tiles = computeWeeklyStatTiles(data);
  container.innerHTML = buildWeeklyStatTilesHTML(tiles);
}

