/**
 * Example chart plugin for the document engine.
 *
 * Handles operation type "chart". In production, this would use chart.js
 * with node-canvas to render a chart to PNG, then embed it via core.drawImage().
 *
 * Usage:
 *   const { registerPlugin } = require("../index");
 *   const chartPlugin = require("./examples/plugins/plugin-chart");
 *   registerPlugin("chart", chartPlugin);
 *
 * Operation format in source JSON:
 *   {
 *     "type": "chart",
 *     "chartType": "bar",
 *     "widthMm": 160,
 *     "heightMm": 80,
 *     "data": { ... chart.js data config ... },
 *     "options": { ... chart.js options ... }
 *   }
 */

module.exports = {
  render(ctx) {
    const { core, operation, bounds } = ctx;
    const widthMm = operation.widthMm || (bounds.right - bounds.left);
    const heightMm = operation.heightMm || 60;
    const x = operation.xMm !== undefined ? operation.xMm : bounds.left;

    // In a real implementation:
    // 1. Create offscreen canvas via node-canvas
    // 2. Render chart using Chart.js
    // 3. Export to PNG buffer
    // 4. core.drawImage({ data: pngBuffer, format: "PNG", x, widthMm, heightMm })

    // Placeholder: draw a bordered rectangle where the chart would go
    core.ensureSpace(heightMm);
    const y = core.getCursorY();
    core.doc.setDrawColor(200, 200, 200);
    core.doc.setLineWidth(0.3);
    core.doc.rect(x, y, widthMm, heightMm, "S");
    core.setCursorY(y + heightMm);
  },

  estimateHeight(ctx) {
    return (ctx.operation.heightMm || 60) + 4;
  },

  validate(operation) {
    if (!operation.chartType) {
      throw new Error("Chart operation requires chartType");
    }
  },
};
