'use strict';

/**
 * Built-in chart plugin for sspdf.
 *
 * Renders any Chart.js configuration server-side via chartjs-node-canvas
 * and embeds the result as a PNG image in the PDF.
 *
 * Requires the `canvas` npm package (native C++ addon):
 *   npm install canvas
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
 * - Pass any valid Chart.js config in data and options, the plugin does not
 *   modify or abstract it.
 */

let _ChartJSNodeCanvas = null;

function getCanvas() {
  if (!_ChartJSNodeCanvas) {
    try {
      _ChartJSNodeCanvas = require('../vendor/chartjs-node-canvas').ChartJSNodeCanvas;
    } catch {
      throw new Error(
        'chart plugin requires the canvas package - run: npm install canvas'
      );
    }
  }
  return _ChartJSNodeCanvas;
}

/**
 * Pre-render the chart to a PNG buffer and cache it on the operation.
 * Call this before renderDocument() for any source containing chart operations.
 * @param {object} operation - the chart operation object (mutated in place)
 * @returns {Promise<void>}
 */
/**
 * Walk an options object and convert callback template strings like "{{v}}%"
 * into real functions. This lets JSON sources define simple tick formatters
 * without requiring executable code in the source file.
 *
 * Supported token: {{v}} - replaced with the callback's first argument (value).
 */
function resolveCallbackTemplates(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = resolveCallbackTemplates(obj[i]);
    }
    return obj;
  }
  for (const key of Object.keys(obj)) {
    if (key === 'callback' && typeof obj[key] === 'string' && obj[key].includes('{{v}}')) {
      const template = obj[key];
      obj[key] = function (value) { return template.replace(/\{\{v\}\}/g, String(value)); };
    } else {
      obj[key] = resolveCallbackTemplates(obj[key]);
    }
  }
  return obj;
}

async function preRender(operation) {
  const ChartJSNodeCanvas = getCanvas();
  const canvasW = operation.canvasWidth  || 1600;
  const canvasH = operation.canvasHeight || 800;

  const canvas = new ChartJSNodeCanvas({
    width: canvasW,
    height: canvasH,
    backgroundColour: 'transparent',
  });

  const options = resolveCallbackTemplates({
    ...(operation.options || {}),
    responsive: false,
    animation:  false,
  });

  operation._buf = await canvas.renderToBuffer({
    type:    operation.chartType || 'bar',
    data:    operation.data    || { labels: [], datasets: [] },
    options,
  });
}

module.exports = {
  preRender,

  render(ctx) {
    const { core, operation, bounds } = ctx;

    if (!operation._buf) {
      throw new Error(
        'chart plugin: operation._buf is missing - call plugin.preRender(operation) before renderDocument()'
      );
    }

    const { theme } = ctx;
    const contentWidth = bounds.right - bounds.left;
    const widthMm  = operation.widthMm  || contentWidth;
    const heightMm = operation.heightMm === "fill"
      ? Math.max(0, core.contentBottomY - core.getCursorY())
      : (operation.heightMm || 80);
    const align = operation.align || (theme && theme.layout && theme.layout.chartAlign) || "left";

    let x;
    if (operation.xMm !== undefined) {
      x = operation.xMm;
    } else if (align === "center") {
      x = bounds.left + (contentWidth - widthMm) / 2;
    } else {
      x = bounds.left;
    }

    core.drawImage({ data: operation._buf, format: 'PNG', x, widthMm, heightMm });
  },

  estimateHeight(ctx) {
    if (ctx.operation.heightMm === "fill") {
      return ctx.core.contentBottomY - ctx.core.getCursorY();
    }
    return (ctx.operation.heightMm || 80) + 4;
  },

  validate(operation) {
    if (!operation.chartType) {
      throw new Error('chart operation requires chartType (e.g. "bar", "line", "doughnut")');
    }
    if (!operation.data) {
      throw new Error('chart operation requires data - pass a Chart.js data config object');
    }
  },
};
