const table = require("./table");

module.exports = {
  name: "Financial Reporting Theme",

  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    compress: true,
    marginTopMm: 18,
    marginBottomMm: 16,
    marginLeftMm: 18,
    marginRightMm: 18,
    backgroundColor: [255, 255, 255],
    defaultText: {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
    },
    defaultStroke: {
      color: [0, 0, 0],
      lineWidth: 0.2,
      lineCap: "butt",
      lineJoin: "miter",
    },
    defaultFillColor: [255, 255, 255],
    metadata: {
      title: "Quarterly Performance Report",
      author: "sspdf",
    },
  },

  layout: {
    bulletIndentMm: 4.5,
    headerBypassMargins: false,
    footerBypassMargins: false,
  },

  labels: {
    // -- Header / Footer --
    "fin.header.left": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 7.5,
      textTransform: "upper",
      color: [15, 23, 42],
      lineHeight: 1.2,
    },
    "fin.header.right": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 7.5,
      color: [100, 116, 139],
      lineHeight: 1.2,
    },
    "fin.header.rule": {
      color: [15, 23, 42],
      lineWidth: 0.4,
      marginBottomPx: 6,
    },
    "fin.footer.rule": {
      color: [203, 213, 225],
      lineWidth: 0.2,
      marginBottomPx: 2,
    },
    "fin.footer.left": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 7,
      color: [148, 163, 184],
      lineHeight: 1.2,
    },
    "fin.footer.right": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 7,
      color: [148, 163, 184],
      lineHeight: 1.2,
    },

    // -- Title block --
    "fin.title": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 20,
      color: [15, 23, 42],
      lineHeight: 1.2,
      marginBottomPx: 2,
    },
    "fin.subtitle": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 11,
      color: [100, 116, 139],
      lineHeight: 1.3,
      marginBottomPx: 6,
    },
    "fin.meta.left": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 116, 139],
      lineHeight: 1.2,
    },
    "fin.meta.right": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 116, 139],
      lineHeight: 1.2,
    },
    "fin.rule": {
      color: [226, 232, 240],
      lineWidth: 0.3,
      marginTopPx: 4,
      marginBottomPx: 6,
    },

    // -- Section headings --
    "fin.heading": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 13,
      color: [15, 23, 42],
      lineHeight: 1.2,
      marginTopPx: 10,
      marginBottomPx: 4,
    },
    "fin.subheading": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      color: [51, 65, 85],
      lineHeight: 1.2,
      marginTopPx: 6,
      marginBottomPx: 3,
    },

    // -- Body text --
    "fin.body": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9.5,
      color: [51, 65, 85],
      lineHeight: 1.45,
      marginBottomPx: 4,
    },
    "fin.body.bold": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 9.5,
      color: [51, 65, 85],
      lineHeight: 1.45,
      marginBottomPx: 4,
    },

    // -- Bullets --
    "fin.marker": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9.5,
      color: [100, 116, 139],
      lineHeight: 1.45,
      marker: "-",
    },

    // -- KPI row --
    "fin.kpi.label": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 116, 139],
      lineHeight: 1.2,
    },
    "fin.kpi.value": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 9,
      color: [15, 23, 42],
      lineHeight: 1.2,
    },

    // -- Table --
    "fin.table.cell": {
      ...table.cell,
      color: [51, 65, 85],
      altRowColor: [248, 250, 252],
    },
    "fin.table.header": {
      ...table.header,
      backgroundColor: [15, 23, 42],
      borderColor: [15, 23, 42],
    },

    // -- Callout box --
    "fin.callout": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [51, 65, 85],
      lineHeight: 1.4,
      backgroundColor: [248, 250, 252],
      borderWidthMm: 0.3,
      borderColor: [226, 232, 240],
      paddingMm: 4,
      marginTopPx: 4,
      marginBottomPx: 4,
    },
    "fin.callout.title": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 9,
      color: [15, 23, 42],
      lineHeight: 1.3,
      marginBottomPx: 2,
    },

    // -- Spacers --
    "fin.gap.sm": { spaceMm: 3 },
    "fin.gap.md": { spaceMm: 6 },
    "fin.gap.lg": { spaceMm: 10 },
  },
};
