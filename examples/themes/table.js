/**
 * Shared table style constants for theme authors.
 *
 * Usage in a theme:
 *   const table = require('./table');
 *   labels: {
 *     "my.table":        { ...table.cell,   color: [51, 65, 85] },
 *     "my.table.header": { ...table.header, backgroundColor: [37, 99, 235] },
 *   }
 */

const cell = {
  fontFamily: "helvetica",
  fontStyle: "normal",
  fontSize: 9,
  color: [50, 50, 50],
  lineHeight: 1.3,
  cellPaddingMm: 2,
  borderColor: [200, 200, 200],
  borderTopMm: 0,
  borderBottomMm: 0.15,
  borderLeftMm: 0,
  borderRightMm: 0,
  altRowColor: [245, 245, 250],
};

const header = {
  fontFamily: "helvetica",
  fontStyle: "bold",
  fontSize: 9,
  color: [255, 255, 255],
  lineHeight: 1.3,
  cellPaddingMm: 2,
  backgroundColor: [50, 50, 50],
  borderColor: [50, 50, 50],
  borderTopMm: 0,
  borderBottomMm: 0.3,
  borderLeftMm: 0,
  borderRightMm: 0,
};

module.exports = { cell, header };
