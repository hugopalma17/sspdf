'use strict';

/**
 * Built-in chart plugin for sspdf.
 *
 * Renders any Chart.js configuration server-side via chartjs-node-canvas
 * and embeds the result as a PNG image in the PDF.
 *
 * Requires peer dependencies:
 *   npm install chart.js chartjs-node-canvas
 *
 * Registration:
 *   const { registerPlugin, plugins } = require('h17-sspdf');
 *   registerPlugin('chart', plugins.chart);
 *
 * Operation format in source JSON:
 *   {
 *     "type": "chart",
 *     "widthMm": 160,
 *     "heightMm": 80,
 *     "canvasWidth": 1600,
 *     "canvasHeight": 800,
 *     "chartType": "line",
 *     "data": {
 *       "labels": ["Jan", "Feb", "Mar"],
 *       "datasets": [
 *         {
 *           "label": "Revenue",
 *           "data": [100, 200, 150],
 *           "borderColor": "rgba(110, 158, 210, 0.88)",
 *           "backgroundColor": "rgba(110, 158, 210, 0.10)"
 *         }
 *       ]
 *     },
 *     "options": {
 *       "responsive": false,
 *       "animation": false,
 *       "scales": {
 *         "y": { "beginAtZero": true }
 *       }
 *     }
 *   }
 *
 * Notes:
 * - canvasWidth/canvasHeight control render resolution (default 1600x800).
 *   Higher values = sharper chart. widthMm/heightMm control the PDF slot size.
 * - responsive: false and animation: false are injected automatically.
 * - Pass any valid Chart.js config in data and options — the plugin does not
 *   modify or abstract it.
 */

let _ChartJSNodeCanvas = null;

function getCanvas() {
  if (!_ChartJSNodeCanvas) {
    try {
      _ChartJSNodeCanvas = require('chartjs-node-canvas').ChartJSNodeCanvas;
    } catch {
      throw new Error(
        'chart plugin requires chartjs-node-canvas — run: npm install chart.js chartjs-node-canvas'
      );
    }
  }
  return _ChartJSNodeCanvas;
}

module.exports = {
  async render(ctx) {
    const { core, operation, bounds } = ctx;
    const ChartJSNodeCanvas = getCanvas();

    const widthMm    = operation.widthMm    || (bounds.right - bounds.left);
    const heightMm   = operation.heightMm   || 80;
    const canvasW    = operation.canvasWidth  || 1600;
    const canvasH    = operation.canvasHeight || 800;
    const x          = operation.xMm !== undefined ? operation.xMm : bounds.left;

    const canvas = new ChartJSNodeCanvas({
      width: canvasW,
      height: canvasH,
      backgroundColour: 'transparent',
    });

    const buf = await canvas.renderToBuffer({
      type:    operation.chartType || 'bar',
      data:    operation.data    || { labels: [], datasets: [] },
      options: {
        ...(operation.options || {}),
        responsive: false,
        animation:  false,
      },
    });

    core.drawImage({ data: buf, format: 'PNG', x, widthMm, heightMm });
  },

  estimateHeight(ctx) {
    return (ctx.operation.heightMm || 80) + 4;
  },

  validate(operation) {
    if (!operation.chartType) {
      throw new Error('chart operation requires chartType (e.g. "bar", "line", "doughnut")');
    }
    if (!operation.data) {
      throw new Error('chart operation requires data — pass a Chart.js data config object');
    }
  },
};
