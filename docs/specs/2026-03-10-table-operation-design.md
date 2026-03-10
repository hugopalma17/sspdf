# Table Operation — Design Spec

**Branch:** `beta/table-operation`
**Date:** 2026-03-10

## Summary

Add `table` as a built-in operation type in sspdf. Native vector rendering — `doc.text()`, `doc.rect()`, `doc.line()` — no images, no external deps. Sits alongside `text`, `row`, `bullet`, `divider` as a first-class primitive.

Also: auto-register the `chart` plugin and fix documentation that incorrectly describes it as manual opt-in.

## Source JSON Format

```json
{
  "type": "table",
  "label": "fin.cell",
  "headerLabel": "fin.header",
  "columns": [
    { "header": "Company",      "align": "left",  "width": "30%" },
    { "header": "Revenue ($M)", "align": "right", "width": "25%" },
    { "header": "EBITDA ($M)",  "align": "right", "width": "25%" },
    { "header": "EV/EBITDA",    "align": "right", "width": "20%" }
  ],
  "rows": [
    ["Apple",     "394,328", "130,541", "21.3x"],
    ["Microsoft", "211,915", "100,360", "25.1x"]
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"table"` |
| `label` | yes | Theme label for data cell styling |
| `headerLabel` | no | Theme label for header cells. No header row if omitted. |
| `columns` | yes | Column definitions array |
| `columns[].header` | no | Header text for this column |
| `columns[].align` | no | `"left"` (default), `"right"`, `"center"` |
| `columns[].width` | no | `"30%"` (percentage of table width), `35` (fixed mm), or omitted (auto-divide remaining space) |
| `rows` | yes | Array of arrays. Each inner array matches columns length. |

### Source-level overrides

The operation JSON can override table-specific style properties directly, same pattern as `xMm`/`maxWidthMm` on text operations:

- `altRowColor`
- `cellPaddingMm`
- `borderColor`, `borderTopMm`, `borderBottomMm`, `borderLeftMm`, `borderRightMm`

## Theme Label Properties

### New table-specific properties

These join the existing label property set (fontFamily, fontSize, color, lineHeight, backgroundColor, margins, padding, etc.):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cellPaddingMm` | number | 1.5 | Padding inside each cell (all sides) |
| `altRowColor` | [r,g,b] | null | Background color for odd data rows (even rows use `backgroundColor`) |
| `borderColor` | [r,g,b] | [200,200,200] | Default border color for all edges |
| `borderTopMm` | number | 0 | Top border width per cell |
| `borderBottomMm` | number | 0 | Bottom border width per cell |
| `borderLeftMm` | number | 0 | Left border width per cell |
| `borderRightMm` | number | 0 | Right border width per cell |
| `borderTopColor` | [r,g,b] | (borderColor) | Override top border color |
| `borderBottomColor` | [r,g,b] | (borderColor) | Override bottom border color |
| `borderLeftColor` | [r,g,b] | (borderColor) | Override left border color |
| `borderRightColor` | [r,g,b] | (borderColor) | Override right border color |

### Example: data cell label

```js
"fin.cell": {
  fontFamily: "helvetica",
  fontStyle: "normal",
  fontSize: 8.5,
  color: [50, 50, 50],
  lineHeight: 1.3,
  cellPaddingMm: 1.5,
  altRowColor: [242, 242, 242],
  borderColor: [204, 204, 204],
  borderTopMm: 0,
  borderBottomMm: 0.15,
  borderLeftMm: 0,
  borderRightMm: 0,
}
```

### Example: header label

```js
"fin.header": {
  fontFamily: "helvetica",
  fontStyle: "bold",
  fontSize: 8.5,
  color: [255, 255, 255],
  lineHeight: 1.3,
  cellPaddingMm: 1.5,
  backgroundColor: [31, 56, 100],
  borderColor: [31, 56, 100],
  borderTopMm: 0,
  borderBottomMm: 0.5,
  borderBottomColor: [0, 0, 0],
  borderLeftMm: 0,
  borderRightMm: 0,
}
```

## Three-Layer Cascade

```
Engine defaults  →  Theme label  →  Source JSON override
```

1. **Engine defaults** — built into `drawTable` as fallbacks (cellPaddingMm: 1.5, borders: 0, altRowColor: null)
2. **Theme label** — full control, composed from shared const files
3. **Source override** — operation JSON can override table-specific properties per-instance

## Theme Authoring — Shared Constants Pattern

Theme authors create a `table.js` const file with base table styles:

```js
// examples/themes/table.js
const cell = {
  fontFamily: "helvetica", fontStyle: "normal",
  fontSize: 9, color: [50, 50, 50], lineHeight: 1.3,
  cellPaddingMm: 1.5,
  borderColor: [200, 200, 200],
  borderTopMm: 0, borderBottomMm: 0.15,
  borderLeftMm: 0, borderRightMm: 0,
  altRowColor: [245, 245, 250],
};

const header = {
  fontFamily: "helvetica", fontStyle: "bold",
  fontSize: 9, color: [255, 255, 255], lineHeight: 1.3,
  cellPaddingMm: 1.5,
  backgroundColor: [50, 50, 50],
  borderColor: [200, 200, 200],
  borderTopMm: 0, borderBottomMm: 0.3,
  borderLeftMm: 0, borderRightMm: 0,
};

module.exports = { cell, header };
```

Themes import and override:

```js
const table = require('./table');

labels: {
  "brief.table":        { ...table.cell,   color: [51, 65, 85] },
  "brief.table.header": { ...table.header, backgroundColor: [37, 99, 235] },
}
```

The engine sees fully resolved labels. The const file is a theme-author convenience, not an engine feature.

## Engine Implementation

### pdf-core.js — `drawTable` method

New method alongside `drawText`, `drawRow`, `drawBullet`, `drawDivider`, `drawImage`.

```
drawTable(payload)
  payload.columns       — array of { widthMm, align }  (resolved, in mm)
  payload.headers       — array of header strings, or null
  payload.rows          — array of string arrays
  payload.cellStyle     — resolved label style for data cells
  payload.headerStyle   — resolved label style for header cells (or null)
  payload.x             — left edge x position
  payload.maxWidth      — total available width
  payload.allowPageBreak — whether to paginate (false in templates)
```

#### Rendering algorithm

1. **Resolve column widths** — `"%"` → mm from maxWidth; fixed mm stays; unspecified columns split remaining space equally.

2. **Draw header row** (if headerStyle and headers provided):
   - For each cell: `measureWrappedLines(text, columnWidth - 2*padding, headerStyle)`
   - Row height = `max(cellLineCount) * lineHeightMm + paddingTop + paddingBottom`
   - For each cell: draw background rect, draw text, draw per-edge borders
   - Advance cursor by row height

3. **Draw data rows** — for each row:
   - Measure all cells → compute row height (max cell height + padding)
   - `ensureSpace(rowHeight)` — if page breaks, re-draw header row first
   - Background: even rows use `backgroundColor`, odd rows use `altRowColor` (if set, else same)
   - For each cell: draw background rect, draw text at column position with alignment, draw per-edge borders
   - Advance cursor

4. **All drawing** uses existing jsPDF primitives: `doc.text()`, `doc.rect()`, `doc.line()`, `doc.setFont()`, `doc.setFillColor()`, etc. Same primitives as `drawText`, `drawRow`, `drawDivider`.

### render-document.js changes

1. **`isOperationType()`** — add `"table"` to the built-in type set.

2. **`executeOperation()`** — add table case:
   - Resolve `label` and `headerLabel` styles via `resolveLabelStyle()`
   - Get horizontal bounds
   - Resolve `xMm`/`maxWidthMm` overrides
   - Merge source-level style overrides onto resolved label style
   - Extract header texts from `columns[].header`
   - Call `core.drawTable(...)` with resolved data

3. **`estimateOperationHeight()`** — add table case:
   - Header height + sum of data row heights
   - Each row: `max(cellLineCount) * lineHeightMm + paddingTop + paddingBottom`
   - Uses `measureWrappedLines` per cell for wrapped height estimation

### Page break with header repetition

Inside `drawTable`:

```
for each data row:
  measure row height
  if cursorY + rowHeight > contentBottomY:
    addPage()
    re-draw header row (same headerStyle, same column widths)
  draw data row
```

Header data and style are kept in scope during the render loop. Re-drawing on page break is internal to `drawTable`.

## Chart Auto-Registration

Separate from table but included in this beta:

- In `render-document.js`, when `executeOperation` encounters `type: "chart"` and no plugin is registered, lazily register the built-in chart plugin.
- Remove the need for `registerPlugin('chart', plugins.chart)` in user code.
- Keep chart.js/chartjs-node-canvas as optional peer deps (the lazy `require` with try/catch stays).
- Update README to remove the manual registration step. Document chart as a built-in operation.
- Keep `plugins.chart` export for backwards compat but note it's auto-registered.

## Files Changed

| File | Change |
|------|--------|
| `core/pdf-core.js` | Add `drawTable()` method |
| `core/render-document.js` | Add `"table"` to built-in types, execution, height estimation. Auto-register chart plugin. |
| `core/validate.js` | Add table validation (columns required, rows required, label required) |
| `core/plugin-registry.js` | Add `"table"` to `BUILT_IN_TYPES` set |
| `examples/themes/table.js` | New file — shared table style constants |
| `examples/themes/theme-corporate.js` | Add table labels using shared constants |
| `examples/sources/` | New example source JSON with table operations |
| `examples/generate-*.js` | New example generation script |
| `tests/` | Table operation tests |
| `index.js` | No changes needed (table is built-in, not exported separately) |
| `README.md` | Document table operation, fix chart documentation |
| `DOCUMENTATION.md` | Add table to full API docs |

## Not in Scope

- `altLabel` (full separate label for alt rows) — `altRowColor` covers 95% of cases, add later if needed
- Per-cell style overrides — all cells in a row share the row's label style
- Column spanning / row spanning — not needed for financial tables
- Nested tables
- Images in cells
