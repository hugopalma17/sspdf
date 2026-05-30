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
const _rendererCache = new Map();
const MAX_RENDERER_CACHE_SIZE = 8;
const DEFAULT_CANVAS_WIDTH = 1600;
const DEFAULT_CANVAS_HEIGHT = 800;

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

function getRenderer(width, height) {
  const ChartJSNodeCanvas = getCanvas();
  const key = `${width}x${height}`;
  if (_rendererCache.has(key)) {
    return _rendererCache.get(key);
  }
  if (_rendererCache.size >= MAX_RENDERER_CACHE_SIZE) {
    const oldestKey = _rendererCache.keys().next().value;
    _rendererCache.delete(oldestKey);
  }
  const renderer = new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: 'transparent',
  });
  _rendererCache.set(key, renderer);
  return renderer;
}

function resolvePositiveNumber(value, fallback, name) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`chart plugin: ${name} must be a positive number`);
  }
  return numberValue;
}

function cloneChartValue(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneChartValue);
  const out = {};
  for (const key of Object.keys(value)) {
    out[key] = cloneChartValue(value[key]);
  }
  return out;
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
function resolveCallbackTemplates(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(resolveCallbackTemplates);

  const out = {};
  for (const key of Object.keys(value)) {
    if (key === 'callback' && typeof value[key] === 'string' && value[key].includes('{{v}}')) {
      const template = value[key];
      out[key] = function (callbackValue) {
        return template.replace(/\{\{v\}\}/g, String(callbackValue));
      };
    } else {
      out[key] = resolveCallbackTemplates(value[key]);
    }
  }
  return out;
}

async function preRender(operation) {
  const canvasW = resolvePositiveNumber(operation.canvasWidth, DEFAULT_CANVAS_WIDTH, 'canvasWidth');
  const canvasH = resolvePositiveNumber(operation.canvasHeight, DEFAULT_CANVAS_HEIGHT, 'canvasHeight');
  const canvas = getRenderer(canvasW, canvasH);

  const options = resolveCallbackTemplates({
    ...(operation.options || {}),
    responsive: false,
    animation:  false,
  });

  operation._buf = await canvas.renderToBuffer({
    type:    operation.chartType || 'bar',
    data:    cloneChartValue(operation.data || { labels: [], datasets: [] }),
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
