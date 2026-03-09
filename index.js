const { PDFCore, getStyleMarginsMm, getTextPaddingMm, applyTextTransform } = require("./core/pdf-core");
const { renderDocument } = require("./core/render-document");
const { registerThemeFonts } = require("./core/font-registry");
const { registerPlugin, unregisterPlugin, clearPlugins } = require("./core/plugin-registry");
const { validateSource, validateTheme, validateSourceAgainstTheme } = require("./core/validate");

module.exports = {
  PDFCore,
  renderDocument,
  registerThemeFonts,
  registerPlugin,
  unregisterPlugin,
  clearPlugins,
  validateSource,
  validateTheme,
  validateSourceAgainstTheme,
  getStyleMarginsMm,
  getTextPaddingMm,
  applyTextTransform,
  // Built-in plugins (opt-in — require peer deps separately)
  plugins: {
    chart: require('./core/plugin-chart'),
  },
};
