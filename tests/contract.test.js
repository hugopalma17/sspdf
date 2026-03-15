const { test, assert } = require("./test-utils");
const { PDFCore, getStyleMarginsMm, getTextPaddingMm } = require("../core/pdf-core");
const { renderDocument } = require("../core/render-document");
const { resolveLineHeightMm, pxToMm, ptToMm } = require("../core/units");

// ─── Test theme with known values ───────────────────────────────

const theme = {
  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    marginTopMm: 20,
    marginBottomMm: 20,
    marginLeftMm: 20,
    marginRightMm: 20,
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
  },
  labels: {
    "t.body": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginBottomPx: 4,
    },
    "t.heading": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 16,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginBottomPx: 8,
    },
    "t.padded": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      paddingTopMm: 2,
      paddingBottomMm: 3,
      marginBottomPx: 4,
    },
    "t.margined": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginTopPx: 6,
      marginBottomPx: 8,
    },
    "t.divider": {
      color: [0, 0, 0],
      lineWidth: 0.3,
      marginBottomPx: 6,
    },
    "t.divider.margined": {
      color: [0, 0, 0],
      lineWidth: 0.5,
      marginTopPx: 4,
      marginBottomPx: 8,
    },
    "bullet.marker": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marker: "-",
    },
    "bullet.marker.arrow": {
      shape: "arrow",
      shapeColor: [0, 128, 255],
      shapeSize: 1,
      textIndentMm: 2,
    },
    "t.row.left": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginBottomPx: 4,
    },
    "t.row.right": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginBottomPx: 4,
    },
    "t.row.left.big": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 14,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginTopPx: 2,
      marginBottomPx: 4,
    },
    "t.row.right.small": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 8,
      color: [0, 0, 0],
      lineHeight: 1.2,
      marginTopPx: 0,
      marginBottomPx: 6,
    },
    "t.block.bg": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
      backgroundColor: [240, 240, 240],
    },
    "t.hidden": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 1,
      color: [255, 255, 255],
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────

const TOLERANCE = 0.01;

function near(actual, expected, msg) {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff < TOLERANCE,
    `${msg}: expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff ${diff.toFixed(6)})`
  );
}

function makeCore() {
  return new PDFCore(theme);
}

function lh(fontSizePt, lineHeightMult) {
  return resolveLineHeightMm(fontSizePt, lineHeightMult);
}

// ─── Page geometry ──────────────────────────────────────────────

test("page: contentTopY = marginTop", () => {
  const core = makeCore();
  assert.strictEqual(core.contentTopY, 20);
});

test("page: contentBottomY = pageHeight - marginBottom", () => {
  const core = makeCore();
  near(core.contentBottomY, 297 - 20, "contentBottomY");
});

test("page: cursor starts at contentTopY", () => {
  const core = makeCore();
  assert.strictEqual(core.cursorY, core.contentTopY);
});

// ─── Text cursor math ──────────────────────────────────────────

test("text: single line delta = lineHeight + marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const style = theme.labels["t.body"];

  core.drawText({ text: "Hello", style, x: 20, maxWidth: 170 });

  const expected = startY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "cursor after single-line text");
});

test("text: multi-line delta = (lines * lineHeight) + marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const style = theme.labels["t.body"];
  const longText = "This is a paragraph that will definitely wrap to multiple lines when rendered in helvetica 10pt within a constrained width of eighty millimeters";

  const lines = core.measureWrappedLines(longText, 80, style);
  assert.ok(lines.length > 1, `expected wrapping, got ${lines.length} lines`);

  core.drawText({ text: longText, style, x: 20, maxWidth: 80 });

  const expected = startY + (lines.length * lh(10, 1.2)) + pxToMm(4);
  near(core.cursorY, expected, "cursor after multi-line text");
});

test("text: padding adds to delta", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const style = theme.labels["t.padded"];

  core.drawText({ text: "Padded", style, x: 20, maxWidth: 170 });

  // paddingTop(2) + 1 line + paddingBottom(3) + marginBottom(4px)
  const expected = startY + 2 + lh(10, 1.2) + 3 + pxToMm(4);
  near(core.cursorY, expected, "cursor after padded text");
});

test("text: top and bottom margins", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const style = theme.labels["t.margined"];

  core.drawText({ text: "Margined", style, x: 20, maxWidth: 170 });

  // marginTop(6px) + 1 line + marginBottom(8px)
  const expected = startY + pxToMm(6) + lh(10, 1.2) + pxToMm(8);
  near(core.cursorY, expected, "cursor after margined text");
});

test("text: advance=false leaves cursor unchanged", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawText({
    text: "No advance",
    style: theme.labels["t.body"],
    x: 20,
    maxWidth: 170,
    advance: false,
  });

  assert.strictEqual(core.cursorY, startY);
});

test("text: heading (16pt) has larger delta than body (10pt)", () => {
  const coreA = makeCore();
  coreA.drawText({ text: "Body", style: theme.labels["t.body"], x: 20, maxWidth: 170 });
  const bodyDelta = coreA.cursorY - coreA.contentTopY;

  const coreB = makeCore();
  coreB.drawText({ text: "Heading", style: theme.labels["t.heading"], x: 20, maxWidth: 170 });
  const headingDelta = coreB.cursorY - coreB.contentTopY;

  assert.ok(headingDelta > bodyDelta, `heading delta (${headingDelta}) should exceed body delta (${bodyDelta})`);

  const expectedHeading = lh(16, 1.2) + pxToMm(8);
  near(headingDelta, expectedHeading, "heading delta");
});

// ─── Row cursor math ────────────────────────────────────────────

test("row: same-size labels delta = lineHeight + marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawRow({
    leftText: "Left",
    rightText: "Right",
    leftStyle: theme.labels["t.row.left"],
    rightStyle: theme.labels["t.row.right"],
    xLeft: 20,
    xRight: 190,
  });

  // Both 10pt → max lineHeight is the same, max marginBottom is the same
  const expected = startY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "cursor after same-size row");
});

test("row: different sizes uses max(lineHeight) and max(margins)", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawRow({
    leftText: "Big left",
    rightText: "Small right",
    leftStyle: theme.labels["t.row.left.big"],
    rightStyle: theme.labels["t.row.right.small"],
    xLeft: 20,
    xRight: 190,
  });

  // left: marginTop 2px, fontSize 14, marginBottom 4px
  // right: marginTop 0, fontSize 8, marginBottom 6px
  const topMm = Math.max(pxToMm(2), 0);
  const rowHeight = Math.max(lh(14, 1.2), lh(8, 1.2));
  const bottomMm = Math.max(pxToMm(4), pxToMm(6));
  const expected = startY + topMm + rowHeight + bottomMm;
  near(core.cursorY, expected, "cursor after mixed-size row");
});

// ─── Divider cursor math ────────────────────────────────────────

test("divider: delta = lineWidth + marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawDivider({
    style: theme.labels["t.divider"],
    x1: 20,
    x2: 190,
  });

  const expected = startY + 0.3 + pxToMm(6);
  near(core.cursorY, expected, "cursor after divider");
});

test("divider: with marginTop and marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawDivider({
    style: theme.labels["t.divider.margined"],
    x1: 20,
    x2: 190,
  });

  const expected = startY + pxToMm(4) + 0.5 + pxToMm(8);
  near(core.cursorY, expected, "cursor after margined divider");
});

// ─── Bullet cursor math ────────────────────────────────────────

test("bullet: single line delta = lineHeight + marginBottom", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const textStyle = theme.labels["t.body"];
  const markerStyle = theme.labels["bullet.marker"];

  core.drawBullet({
    text: "Short bullet",
    textStyle,
    markerStyle,
    x: 20,
    textIndentMm: 4,
    maxWidth: 166,
  });

  const expected = startY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "cursor after single-line bullet");
});

test("bullet: multi-line wraps correctly", () => {
  const core = makeCore();
  const startY = core.cursorY;
  const textStyle = theme.labels["t.body"];
  const markerStyle = theme.labels["bullet.marker"];
  const text = "A bullet point with enough text that it will definitely need to wrap across at least two lines when rendered in helvetica ten point";

  const lines = core.measureWrappedLines(text, 100, textStyle);
  assert.ok(lines.length > 1, `expected wrapping, got ${lines.length} lines`);

  core.drawBullet({
    text,
    textStyle,
    markerStyle,
    x: 20,
    textIndentMm: 4,
    maxWidth: 100,
  });

  const expected = startY + (lines.length * lh(10, 1.2)) + pxToMm(4);
  near(core.cursorY, expected, "cursor after multi-line bullet");
});

test("bullet: shape marker same cursor delta as text marker", () => {
  const { getShapeWidth } = require("../core/shapes");
  const core = makeCore();
  const startY = core.cursorY;
  const textStyle = theme.labels["t.body"];
  const markerStyle = theme.labels["bullet.marker.arrow"];

  const shapeW = getShapeWidth("arrow", 1);
  const indent = shapeW + 2; // shapeWidth + markerStyle.textIndentMm
  const maxWidth = 170 - indent;

  core.drawBullet({
    text: "Shape bullet",
    textStyle,
    markerStyle,
    x: 20,
    textIndentMm: indent,
    maxWidth,
  });

  const expected = startY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "cursor after shape bullet");
});

test("renderDocument: shape marker bullet via markerLabel", () => {
  const { getShapeWidth } = require("../core/shapes");
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Before" },
      {
        type: "bullet",
        label: "t.body",
        markerLabel: "bullet.marker.arrow",
        bullets: ["First point", "Second point"],
      },
      { type: "text", label: "t.body", text: "After" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  // Shape indent = getShapeWidth("arrow", 1) + textIndentMm(2) + gap(1.5)
  const textDelta = lh(10, 1.2) + pxToMm(4);
  const bulletDelta = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + textDelta + bulletDelta + bulletDelta + textDelta;
  near(core.cursorY, expected, "cursor after shape bullet list via renderDocument");
});

// ─── Spacer and hidden text ─────────────────────────────────────

test("moveDown: advances cursor by exact mm", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.moveDown(12.5);

  assert.strictEqual(core.cursorY, startY + 12.5);
});

test("hiddenText: does not move cursor", () => {
  const core = makeCore();
  const startY = core.cursorY;

  core.drawHiddenText({
    text: "hidden keywords for ATS",
    style: theme.labels["t.hidden"],
    x: 20,
  });

  assert.strictEqual(core.cursorY, startY);
});

// ─── Page breaks ────────────────────────────────────────────────

test("ensureSpace: triggers page break when insufficient", () => {
  const core = makeCore();
  core.cursorY = core.contentBottomY - 5;
  const pagesBefore = core.doc.getNumberOfPages();

  core.ensureSpace(10);

  assert.strictEqual(core.doc.getNumberOfPages(), pagesBefore + 1);
  assert.strictEqual(core.cursorY, core.contentTopY);
});

test("ensureSpace: no break when space is sufficient", () => {
  const core = makeCore();
  core.cursorY = core.contentTopY + 10;
  const pagesBefore = core.doc.getNumberOfPages();
  const cursorBefore = core.cursorY;

  core.ensureSpace(5);

  assert.strictEqual(core.doc.getNumberOfPages(), pagesBefore);
  assert.strictEqual(core.cursorY, cursorBefore);
});

test("ensureSpace: exact fit does not break", () => {
  const core = makeCore();
  const remaining = core.contentBottomY - core.cursorY;

  core.ensureSpace(remaining);

  assert.strictEqual(core.doc.getNumberOfPages(), 1);
});

test("ensureSpace: one unit over triggers break", () => {
  const core = makeCore();
  const remaining = core.contentBottomY - core.cursorY;

  core.ensureSpace(remaining + 0.01);

  assert.strictEqual(core.doc.getNumberOfPages(), 2);
  assert.strictEqual(core.cursorY, core.contentTopY);
});

// ─── renderDocument integration ─────────────────────────────────

test("renderDocument: sequential texts accumulate", () => {
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "First" },
      { type: "text", label: "t.body", text: "Second" },
      { type: "text", label: "t.body", text: "Third" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const perText = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + (3 * perText);
  near(core.cursorY, expected, "cursor after 3 sequential texts");
});

test("renderDocument: text + divider + text", () => {
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Before" },
      { type: "divider", label: "t.divider" },
      { type: "text", label: "t.body", text: "After" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const textDelta = lh(10, 1.2) + pxToMm(4);
  const divDelta = 0.3 + pxToMm(6);
  const expected = core.contentTopY + textDelta + divDelta + textDelta;
  near(core.cursorY, expected, "cursor after text-divider-text");
});

test("renderDocument: row between texts", () => {
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Above" },
      { type: "row", leftLabel: "t.row.left", rightLabel: "t.row.right", leftText: "L", rightText: "R" },
      { type: "text", label: "t.body", text: "Below" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const textDelta = lh(10, 1.2) + pxToMm(4);
  const rowDelta = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + textDelta + rowDelta + textDelta;
  near(core.cursorY, expected, "cursor after text-row-text");
});

test("renderDocument: spacer adds exact mm", () => {
  const source = {
    operations: [
      { type: "spacer", mm: 15 },
      { type: "text", label: "t.body", text: "After spacer" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const expected = core.contentTopY + 15 + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "cursor after spacer + text");
});

test("renderDocument: hiddenText does not affect cursor", () => {
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Visible" },
      { type: "hiddenText", label: "t.hidden", text: "invisible keywords" },
      { type: "text", label: "t.body", text: "Also visible" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const textDelta = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + textDelta + textDelta;
  near(core.cursorY, expected, "hiddenText has zero cursor impact");
});

test("renderDocument: section wrapper is transparent to cursor", () => {
  const source = {
    sections: [
      {
        type: "section",
        content: [
          { type: "text", label: "t.body", text: "Inside section" },
        ],
      },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const expected = core.contentTopY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "section wrapper doesn't add cursor delta");
});

test("renderDocument: block cursor = sum of children", () => {
  const source = {
    operations: [
      {
        type: "block",
        label: "t.block.bg",
        keepTogether: true,
        children: [
          { type: "text", label: "t.body", text: "Child one" },
          { type: "text", label: "t.body", text: "Child two" },
        ],
      },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const childDelta = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + (2 * childDelta);
  near(core.cursorY, expected, "block cursor = sum of children");
});

test("renderDocument: keepWithNext forces page break when group won't fit", () => {
  // A4 content: 20mm top to 277mm bottom = 257mm usable
  // Spacer 250mm → cursor at 270mm → 7mm remaining
  // Heading (16pt) + body (10pt) group ≈ 14mm → won't fit → page break
  const headingDelta = lh(16, 1.2) + pxToMm(8);
  const bodyDelta = lh(10, 1.2) + pxToMm(4);
  const groupHeight = headingDelta + bodyDelta;

  const source = {
    operations: [
      { type: "spacer", mm: 250 },
      { type: "text", label: "t.heading", text: "Heading", keepWithNext: 1 },
      { type: "text", label: "t.body", text: "Body after heading" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  assert.strictEqual(core.doc.getNumberOfPages(), 2, "should be 2 pages");

  // On page 2: heading + body from contentTopY
  const expected = core.contentTopY + groupHeight;
  near(core.cursorY, expected, "cursor on page 2 after keepWithNext group");
});

test("renderDocument: keepWithNext does NOT break if group fits", () => {
  const source = {
    operations: [
      { type: "text", label: "t.heading", text: "Heading", keepWithNext: 1 },
      { type: "text", label: "t.body", text: "Body after heading" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  assert.strictEqual(core.doc.getNumberOfPages(), 1, "should be 1 page");

  const headingDelta = lh(16, 1.2) + pxToMm(8);
  const bodyDelta = lh(10, 1.2) + pxToMm(4);
  const expected = core.contentTopY + headingDelta + bodyDelta;
  near(core.cursorY, expected, "cursor after keepWithNext group on same page");
});

test("renderDocument: page token {{page}} resolves", () => {
  // Can't check rendered text easily, but we can verify it doesn't throw
  // and the cursor math is still correct
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Page {{page}}" },
    ],
  };

  const { core } = renderDocument({ source, theme });
  const expected = core.contentTopY + lh(10, 1.2) + pxToMm(4);
  near(core.cursorY, expected, "page token doesn't affect cursor math");
});

test("renderDocument: mixed operations complex sequence", () => {
  const source = {
    operations: [
      { type: "text", label: "t.heading", text: "Title" },
      { type: "divider", label: "t.divider" },
      { type: "text", label: "t.body", text: "Paragraph one" },
      { type: "text", label: "t.body", text: "Paragraph two" },
      { type: "row", leftLabel: "t.row.left", rightLabel: "t.row.right", leftText: "Name", rightText: "Value" },
      { type: "spacer", mm: 5 },
      { type: "text", label: "t.body", text: "Final paragraph" },
    ],
  };

  const { core } = renderDocument({ source, theme });

  const headingDelta = lh(16, 1.2) + pxToMm(8);
  const divDelta = 0.3 + pxToMm(6);
  const bodyDelta = lh(10, 1.2) + pxToMm(4);
  const rowDelta = lh(10, 1.2) + pxToMm(4);

  const expected = core.contentTopY
    + headingDelta
    + divDelta
    + bodyDelta
    + bodyDelta
    + rowDelta
    + 5
    + bodyDelta;
  near(core.cursorY, expected, "cursor after complex mixed sequence");
});

// ─── Table cursor math ──────────────────────────────────────────

const tableTheme = Object.assign({}, theme, {
  labels: Object.assign({}, theme.labels, {
    "t.table.cell": {
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
    },
    "t.table.header": {
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
    },
    "t.table.noheader": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [50, 50, 50],
      lineHeight: 1.3,
      cellPaddingMm: 2,
    },
  }),
});

test("table: single row cursor = marginTop + headerHeight + rowHeight + marginBottom", () => {
  const source = {
    operations: [
      {
        type: "table",
        label: "t.table.cell",
        headerLabel: "t.table.header",
        columns: [
          { header: "Name", width: "50%", align: "left" },
          { header: "Value", width: "50%", align: "right" },
        ],
        rows: [["Apple", "100"]],
      },
    ],
  };

  const { core } = renderDocument({ source, theme: tableTheme });

  const cellLh = lh(9, 1.3);
  const headerRowH = 2 + cellLh + 2;  // padding + 1 line + padding
  const dataRowH = 2 + cellLh + 2;
  // marginTopMm from cell style is 0, marginBottomMm is 0
  const expected = core.contentTopY + headerRowH + dataRowH;
  near(core.cursorY, expected, "cursor after table with header + 1 row");
});

test("table: multiple rows accumulate correctly", () => {
  const source = {
    operations: [
      {
        type: "table",
        label: "t.table.cell",
        headerLabel: "t.table.header",
        columns: [
          { header: "A", width: "50%" },
          { header: "B", width: "50%" },
        ],
        rows: [
          ["row1-a", "row1-b"],
          ["row2-a", "row2-b"],
          ["row3-a", "row3-b"],
        ],
      },
    ],
  };

  const { core } = renderDocument({ source, theme: tableTheme });

  const cellLh = lh(9, 1.3);
  const headerRowH = 2 + cellLh + 2;
  const dataRowH = 2 + cellLh + 2;
  const expected = core.contentTopY + headerRowH + (3 * dataRowH);
  near(core.cursorY, expected, "cursor after table with 3 data rows");
});

test("table: no header when headerLabel omitted", () => {
  const source = {
    operations: [
      {
        type: "table",
        label: "t.table.noheader",
        columns: [
          { header: "X", width: "50%" },
          { header: "Y", width: "50%" },
        ],
        rows: [["a", "b"], ["c", "d"]],
      },
    ],
  };

  const { core } = renderDocument({ source, theme: tableTheme });

  const cellLh = lh(9, 1.3);
  const dataRowH = 2 + cellLh + 2;
  const expected = core.contentTopY + (2 * dataRowH);
  near(core.cursorY, expected, "cursor after headerless table");
});

test("table: text before and after table accumulate", () => {
  const source = {
    operations: [
      { type: "text", label: "t.body", text: "Before table" },
      {
        type: "table",
        label: "t.table.cell",
        headerLabel: "t.table.header",
        columns: [
          { header: "Col", width: "100%" },
        ],
        rows: [["data"]],
      },
      { type: "text", label: "t.body", text: "After table" },
    ],
  };

  const { core } = renderDocument({ source, theme: tableTheme });

  const textDelta = lh(10, 1.2) + pxToMm(4);
  const cellLh = lh(9, 1.3);
  const headerRowH = 2 + cellLh + 2;
  const dataRowH = 2 + cellLh + 2;
  const expected = core.contentTopY + textDelta + headerRowH + dataRowH + textDelta;
  near(core.cursorY, expected, "cursor after text + table + text");
});

test("table: auto column widths divide evenly", () => {
  const source = {
    operations: [
      {
        type: "table",
        label: "t.table.noheader",
        columns: [
          { header: "A" },
          { header: "B" },
          { header: "C" },
        ],
        rows: [["1", "2", "3"]],
      },
    ],
  };

  // Should not throw - 3 auto columns split 170mm (210 - 20 - 20)
  const { core } = renderDocument({ source, theme: tableTheme });
  assert.ok(core.cursorY > core.contentTopY, "cursor advanced");
});

test("table: page break repeats header", () => {
  // Fill most of the page, then a table that won't fit
  const source = {
    operations: [
      { type: "spacer", mm: 240 },
      {
        type: "table",
        label: "t.table.cell",
        headerLabel: "t.table.header",
        columns: [
          { header: "Name", width: "50%" },
          { header: "Value", width: "50%" },
        ],
        rows: [
          ["row1", "val1"],
          ["row2", "val2"],
          ["row3", "val3"],
          ["row4", "val4"],
          ["row5", "val5"],
        ],
      },
    ],
  };

  const { core } = renderDocument({ source, theme: tableTheme });

  assert.ok(core.doc.getNumberOfPages() >= 2, "table should span at least 2 pages");
});
