"use strict";
// Vendored for sspdf - original: chartjs-node-canvas by Sean Sobey (MIT)
// Removed tslib dependency, direct re-exports only.
Object.defineProperty(exports, "__esModule", { value: true });
const chartJSNodeCanvas = require("./chartJSNodeCanvas");
const chartJSNodeCanvasBase = require("./chartJSNodeCanvasBase");
Object.keys(chartJSNodeCanvas).forEach(function (key) {
  if (key !== "default" && !exports.hasOwnProperty(key)) exports[key] = chartJSNodeCanvas[key];
});
Object.keys(chartJSNodeCanvasBase).forEach(function (key) {
  if (key !== "default" && !exports.hasOwnProperty(key)) exports[key] = chartJSNodeCanvasBase[key];
});
