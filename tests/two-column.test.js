const { test, assert } = require("./test-utils");
const { renderDocument } = require("../core/render-document");
const { resolveLineHeightMm } = require("../core/units");

const TOLERANCE = 0.01;
function near(actual, expected, msg) {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff < TOLERANCE,
    `${msg}: expected ${expected.toFixed(4)}, got ${actual.toFixed(4)} (diff ${diff.toFixed(6)})`
  );
}

const baseTheme = {
  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
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
    },
    "t.small": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 8,
      color: [0, 0, 0],
      lineHeight: 1.2,
    },
    "t.cell": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 8,
      color: [0, 0, 0],
      lineHeight: 1.2,
      cellPaddingMm: 1,
    },
    "t.header": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 8,
      color: [255, 255, 255],
      lineHeight: 1.2,
      cellPaddingMm: 1,
    },
  },
};

// ─── columns: cursor advances past the taller column ──────────────────────────

test("columns: cursor advances past taller column (col2)", () => {
  const lineH = resolveLineHeightMm(10, 1.2);

  const result = renderDocument({
    theme: baseTheme,
    source: {
      operations: [
        {
          type: "columns",
          gutterMm: 10,
          column1: [
            { type: "text", label: "t.body", text: "Short" },
          ],
          column2: [
            { type: "text", label: "t.body", text: "Line 1" },
            { type: "text", label: "t.body", text: "Line 2" },
            { type: "text", label: "t.body", text: "Line 3" },
          ],
        },
      ],
    },
  });

  const expectedEnd = 10 + 3 * lineH;
  near(result.core.cursorY, expectedEnd, "cursor below tallest column");
});

// ─── columns: col1 taller drives cursor ────────────────────────────────────────

test("columns: cursor advances past taller column (col1)", () => {
  const lineH = resolveLineHeightMm(10, 1.2);

  const result = renderDocument({
    theme: baseTheme,
    source: {
      operations: [
        {
          type: "columns",
          gutterMm: 10,
          column1: [
            { type: "text", label: "t.body", text: "A" },
            { type: "text", label: "t.body", text: "B" },
            { type: "text", label: "t.body", text: "C" },
            { type: "text", label: "t.body", text: "D" },
          ],
          column2: [
            { type: "text", label: "t.body", text: "Only one" },
          ],
        },
      ],
    },
  });

  const expectedEnd = 10 + 4 * lineH;
  near(result.core.cursorY, expectedEnd, "cursor below tallest column (col1 wins)");
});

// ─── columns: subsequent full-width op starts at correct y ────────────────────

test("columns: full-width op after columns starts below taller column", () => {
  const lineH = resolveLineHeightMm(10, 1.2);

  const result = renderDocument({
    theme: baseTheme,
    source: {
      operations: [
        {
          type: "columns",
          gutterMm: 10,
          column1: [{ type: "text", label: "t.body", text: "One line" }],
          column2: [
            { type: "text", label: "t.body", text: "Line 1" },
            { type: "text", label: "t.body", text: "Line 2" },
          ],
        },
        { type: "text", label: "t.body", text: "After columns" },
      ],
    },
  });

  const expectedEnd = 10 + 3 * lineH;
  near(result.core.cursorY, expectedEnd, "cursor after full-width op below columns");
});

// ─── columns: column widths split content area minus gutter ───────────────────

test("columns: empty columns produce no height", () => {
  const result = renderDocument({
    theme: baseTheme,
    source: {
      operations: [
        {
          type: "columns",
          gutterMm: 10,
          column1: [],
          column2: [],
        },
      ],
    },
  });

  near(result.core.cursorY, 10, "cursor unchanged for empty columns");
});

// ─── columns: mixed columns + full page ops on same document ──────────────────

test("columns: full-page op then columns then full-page op", () => {
  const lineH = resolveLineHeightMm(10, 1.2);

  const result = renderDocument({
    theme: baseTheme,
    source: {
      operations: [
        { type: "text", label: "t.body", text: "Header line" },
        {
          type: "columns",
          gutterMm: 10,
          column1: [
            { type: "text", label: "t.body", text: "Col 1 A" },
            { type: "text", label: "t.body", text: "Col 1 B" },
          ],
          column2: [
            { type: "text", label: "t.body", text: "Col 2 A" },
          ],
        },
        { type: "text", label: "t.body", text: "Footer line" },
      ],
    },
  });

  const expectedEnd = 10 + 4 * lineH;
  near(result.core.cursorY, expectedEnd, "header + 2-col + footer cursor");
});

// ─── columns: validate rejects missing column arrays ──────────────────────────

test("columns: validation rejects missing column1", () => {
  let threw = false;
  try {
    renderDocument({
      validate: true,
      theme: baseTheme,
      source: {
        operations: [
          { type: "columns", column2: [] },
        ],
      },
    });
  } catch (e) {
    threw = true;
    assert(e.message.includes("column1"), `expected 'column1' in error, got: ${e.message}`);
  }
  assert(threw, "should have thrown for missing column1");
});

test("columns: throws when gutterMm not defined on op or in theme", () => {
  let threw = false;
  try {
    renderDocument({
      theme: baseTheme,
      source: { operations: [{ type: "columns", column1: [], column2: [] }] },
    });
  } catch (e) {
    threw = true;
    assert(e.message.includes("gutterMm"), `expected 'gutterMm' in error, got: ${e.message}`);
  }
  assert(threw, "should have thrown for missing gutter");
});

test("columns: theme.layout.columnGutterMm is used when op omits gutterMm", () => {
  const lineH = resolveLineHeightMm(10, 1.2);
  const themeWithGutter = Object.assign({}, baseTheme, { layout: { columnGutterMm: 10 } });

  const result = renderDocument({
    theme: themeWithGutter,
    source: {
      operations: [{
        type: "columns",
        column1: [{ type: "text", label: "t.body", text: "A" }],
        column2: [
          { type: "text", label: "t.body", text: "B" },
          { type: "text", label: "t.body", text: "C" },
        ],
      }],
    },
  });

  near(result.core.cursorY, 10 + 2 * lineH, "theme gutter applied, cursor at taller column end");
});

test("columns: validation rejects missing column2", () => {
  let threw = false;
  try {
    renderDocument({
      validate: true,
      theme: baseTheme,
      source: {
        operations: [
          { type: "columns", column1: [] },
        ],
      },
    });
  } catch (e) {
    threw = true;
    assert(e.message.includes("column2"), `expected 'column2' in error, got: ${e.message}`);
  }
  assert(threw, "should have thrown for missing column2");
});

// ─── columns saves vertical space compared to stacking ────────────────────────
//
// Placing two blocks in columns costs max(col1H, col2H) vertical space.
// Stacking them costs col1H + col2H.
// The cursor after the columns op must be strictly less than the cursor
// after the equivalent stacked layout (the shorter column's height is saved).

const twoColTheme = baseTheme;

// col1: 3 text lines. col2: 8 text lines. The shorter block's height is saved.
test("columns: cursor savings = height of the shorter column", () => {
  const lineH = resolveLineHeightMm(10, 1.2);
  const col1Lines = 3;
  const col2Lines = 8;

  const makeLines = (n) =>
    Array.from({ length: n }, (_, i) => ({
      type: "text", label: "t.body", text: `Line ${i + 1}`,
    }));

  const withCols = renderDocument({
    theme: twoColTheme,
    source: { operations: [{ type: "columns", gutterMm: 10, column1: makeLines(col1Lines), column2: makeLines(col2Lines) }] },
  });

  const stacked = renderDocument({
    theme: twoColTheme,
    source: { operations: [...makeLines(col1Lines), ...makeLines(col2Lines)] },
  });

  const expectedSaved = col1Lines * lineH;
  const actualSaved = stacked.core.cursorY - withCols.core.cursorY;
  near(actualSaved, expectedSaved, "columns saves exactly the shorter column height");
});
