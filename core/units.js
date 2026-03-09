const PT_TO_MM = 25.4 / 72;
const PX_TO_MM = 25.4 / 96;

/**
 * Convert CSS px units to millimeters.
 * @param {number} value
 * @returns {number}
 */
function pxToMm(value) {
  return (Number(value) || 0) * PX_TO_MM;
}

/**
 * Convert typographic pt units to millimeters.
 * @param {number} value
 * @returns {number}
 */
function ptToMm(value) {
  return (Number(value) || 0) * PT_TO_MM;
}

/**
 * Convert font size + line-height multiplier to line height in millimeters.
 * @param {number} fontSizePt
 * @param {number} lineHeightMultiplier
 * @returns {number}
 */
function resolveLineHeightMm(fontSizePt, lineHeightMultiplier) {
  const multiplier = Number(lineHeightMultiplier) || 1.2;
  return ptToMm(Number(fontSizePt) || 10) * multiplier;
}

module.exports = {
  PT_TO_MM,
  PX_TO_MM,
  pxToMm,
  ptToMm,
  resolveLineHeightMm,
};
