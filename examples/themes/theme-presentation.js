const INTER = require("../../fonts/inter.js");

module.exports = {
  name: "Presentation Theme",

  customFonts: [
    {
      family: "Inter",
      faces: [
        { style: "normal", fileName: "Inter-Regular.ttf", data: INTER.Regular },
        { style: "bold", fileName: "Inter-Bold.ttf", data: INTER.Bold },
      ],
    },
  ],

  page: {
    pageWidthMm: 338,
    pageHeightMm: 190,
    orientation: "landscape",
    unit: "mm",
    compress: true,
    marginTopMm: 16,
    marginBottomMm: 14,
    marginLeftMm: 24,
    marginRightMm: 24,
    backgroundColor: [6, 6, 8],
    defaultText: {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 14,
      color: [232, 232, 236],
      lineHeight: 1.4,
    },
    defaultStroke: {
      color: [232, 232, 236],
      lineWidth: 0.2,
      lineCap: "butt",
      lineJoin: "miter",
    },
    defaultFillColor: [6, 6, 8],
  },

  labels: {
    // ─── Slide footer ─────────────────────────────────────────
    "slide.footer.rule": {
      color: [74, 74, 85],
      lineWidth: 0.25,
      marginBottomPx: 2,
    },
    "slide.footer.left": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 8,
      color: [122, 122, 136],
      marginBottomPx: 0,
    },
    "slide.footer.right": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 8,
      color: [122, 122, 136],
      marginBottomPx: 0,
    },

    // ─── Title slide ──────────────────────────────────────────
    "slide.kicker": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 11,
      textTransform: "upper",
      color: [0, 229, 255],
      marginBottomPx: 6,
    },
    "slide.title": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 36,
      color: [232, 232, 236],
      lineHeight: 1.15,
      marginBottomPx: 8,
    },
    "slide.subtitle": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 16,
      color: [122, 122, 136],
      lineHeight: 1.4,
      marginBottomPx: 6,
    },
    "slide.author": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 12,
      color: [74, 74, 85],
      marginBottomPx: 0,
    },

    // ─── Content slides ───────────────────────────────────────
    "slide.heading": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 24,
      color: [232, 232, 236],
      lineHeight: 1.2,
      marginBottomPx: 10,
    },
    "slide.body": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 14,
      color: [122, 122, 136],
      lineHeight: 1.5,
      marginBottomPx: 6,
    },
    "slide.body.bold": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 14,
      color: [232, 232, 236],
      lineHeight: 1.5,
      marginBottomPx: 6,
    },
    "slide.caption": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 10,
      color: [74, 74, 85],
      lineHeight: 1.3,
      marginBottomPx: 4,
    },

    // ─── Bullets ──────────────────────────────────────────────
    "slide.bullet.marker": {
      shape: "circle-filled",
      shapeColor: [0, 229, 255],
      shapeSize: 0.5,
      textIndentMm: 3,
    },
    "slide.bullet.text": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 14,
      color: [122, 122, 136],
      lineHeight: 1.5,
      marginBottomPx: 5,
    },

    // ─── Metrics / KPI ────────────────────────────────────────
    "slide.metric.value": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 28,
      color: [0, 229, 255],
      align: "center",
      marginBottomPx: 2,
    },
    "slide.metric.label": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 11,
      color: [122, 122, 136],
      align: "center",
      marginBottomPx: 4,
    },

    // ─── Dividers ─────────────────────────────────────────────
    "slide.divider": {
      color: [18, 18, 24],
      lineWidth: 0.4,
      marginTopPx: 6,
      marginBottomPx: 6,
    },
    "slide.divider.accent": {
      color: [0, 229, 255],
      lineWidth: 1.2,
      marginTopPx: 4,
      marginBottomPx: 8,
    },

    // ─── Callout box ──────────────────────────────────────────
    "slide.callout": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 13,
      color: [0, 229, 255],
      lineHeight: 1.45,
      backgroundColor: [12, 12, 16],
      borderColor: [0, 165, 184],
      borderWidthMm: 0.35,
      borderRadiusMm: 2,
      paddingTopMm: 4,
      paddingBottomMm: 4,
      paddingLeftMm: 5,
      paddingRightMm: 5,
      marginTopPx: 4,
      marginBottomPx: 6,
    },

    // ─── Image ────────────────────────────────────────────────
    "slide.image": {
      paddingTopMm: 2,
      paddingBottomMm: 2,
    },
    "slide.image.caption": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 9,
      color: [74, 74, 85],
      align: "center",
      lineHeight: 1.3,
    },

    // ─── Table ────────────────────────────────────────────────
    "slide.table": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 11,
      color: [200, 200, 210],
      lineHeight: 1.3,
      cellPaddingMm: 2.5,
      borderColor: [30, 30, 40],
      borderTopMm: 0,
      borderBottomMm: 0.15,
      borderLeftMm: 0,
      borderRightMm: 0,
      altRowColor: [12, 12, 16],
    },
    "slide.table.header": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 11,
      color: [6, 6, 8],
      lineHeight: 1.3,
      cellPaddingMm: 2.5,
      backgroundColor: [0, 229, 255],
      borderColor: [0, 200, 220],
      borderTopMm: 0,
      borderBottomMm: 0.3,
      borderLeftMm: 0,
      borderRightMm: 0,
    },

    // ─── Row labels ───────────────────────────────────────────
    "slide.row.left": {
      fontFamily: "Inter",
      fontStyle: "bold",
      fontSize: 12,
      color: [232, 232, 236],
      marginBottomPx: 2,
    },
    "slide.row.right": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 12,
      color: [122, 122, 136],
      marginBottomPx: 2,
    },

    // ─── Spacers ──────────────────────────────────────────────
    "slide.spacer.sm": { spaceMm: 4 },
    "slide.spacer.md": { spaceMm: 8 },
    "slide.spacer.lg": { spaceMm: 16 },
  },
};
