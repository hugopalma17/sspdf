const table = require("./table");

const BLACK  = [15, 15, 15];
const MUTED  = [100, 100, 100];
const WHITE  = [255, 255, 255];
const LIGHT  = [245, 245, 245];
const RULE   = [210, 210, 210];
const ACCENT = [30, 90, 180];

module.exports = {
  name: "Two-Column Demo",

  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    compress: true,
    marginTopMm: 14,
    marginBottomMm: 14,
    marginLeftMm: 14,
    marginRightMm: 14,
    backgroundColor: WHITE,
    defaultText: {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: BLACK,
      lineHeight: 1.4,
    },
    defaultStroke: {
      color: RULE,
      lineWidth: 0.2,
      lineCap: "butt",
      lineJoin: "miter",
    },
    defaultFillColor: WHITE,
    metadata: {
      title: "Service Plan Comparison",
      subject: "sspdf two-column layout demo",
    },
  },

  layout: {
    columnGutterMm: 6,
  },

  labels: {
    "demo.title": {
      fontFamily: "helvetica", fontStyle: "bold", fontSize: 18, color: BLACK,
      lineHeight: 1.1, marginBottomMm: 1,
    },
    "demo.subtitle": {
      fontFamily: "helvetica", fontStyle: "normal", fontSize: 10, color: MUTED,
      lineHeight: 1.3, marginBottomMm: 5,
    },
    "demo.rule": {
      color: ACCENT, lineWidth: 0.6, marginBottomMm: 5,
    },
    "demo.rule.soft": {
      color: RULE, lineWidth: 0.2, marginTopMm: 3, marginBottomMm: 3,
    },

    "demo.col.heading": {
      fontFamily: "helvetica", fontStyle: "bold", fontSize: 11, color: ACCENT,
      lineHeight: 1.15, marginBottomMm: 2,
    },
    "demo.col.tagline": {
      fontFamily: "helvetica", fontStyle: "normal", fontSize: 8, color: MUTED,
      lineHeight: 1.3, marginBottomMm: 3,
    },
    "demo.col.price": {
      fontFamily: "helvetica", fontStyle: "bold", fontSize: 20, color: BLACK,
      lineHeight: 1.1, marginBottomMm: 1,
    },
    "demo.col.price.note": {
      fontFamily: "helvetica", fontStyle: "normal", fontSize: 7, color: MUTED,
      lineHeight: 1.2, marginBottomMm: 3,
    },

    "demo.table.cell": {
      ...table.cell,
      fontFamily: "helvetica", fontStyle: "normal", fontSize: 8, color: BLACK,
      lineHeight: 1.3, cellPaddingMm: 1.2,
      backgroundColor: WHITE, altRowColor: LIGHT,
      borderColor: RULE,
      borderTopMm: 0, borderBottomMm: 0.15, borderLeftMm: 0, borderRightMm: 0,
    },
    "demo.table.header": {
      ...table.header,
      fontFamily: "helvetica", fontStyle: "bold", fontSize: 8, color: WHITE,
      lineHeight: 1.3, cellPaddingMm: 1.2,
      backgroundColor: ACCENT, borderColor: ACCENT,
      borderTopMm: 0, borderBottomMm: 0, borderLeftMm: 0, borderRightMm: 0,
    },

    "demo.footer.note": {
      fontFamily: "helvetica", fontStyle: "normal", fontSize: 7.5, color: MUTED,
      lineHeight: 1.4, marginTopMm: 4, align: "center",
    },
    "demo.footer.cta": {
      fontFamily: "helvetica", fontStyle: "bold", fontSize: 9, color: ACCENT,
      lineHeight: 1.3, align: "center",
    },
  },
};
