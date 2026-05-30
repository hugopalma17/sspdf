---
name: sspdf
description: Generate PDF documents with the sspdf engine. Use when asked to create, render, or generate a PDF, invoice, report, article, tear sheet, or any printable document.
user-invocable: true
argument-hint: "what to generate (e.g. 'invoice for $7,250', 'Apple tear sheet', 'event program')"
metadata:
  author: Hugo Palma
  version: 1.2.0
  tags: [pdf, document, generation, rendering, sspdf]
  input_format: task description (plain text)
  output_format: PDF file
license: Apache-2.0
---

# Skill: sspdf Document Generator

You generate PDF documents using the sspdf engine. You build the source JSON, pick or generate the right theme, and render the output. One invoke, one PDF.

## GitHub repository

The full source, examples, tests, and additional resources are at:
https://github.com/hugopalma17/sspdf

The npm package includes core, fonts, vendor, example themes, and example sources. The GitHub repo also contains test suites, skills, and development history.

## Step 0: Locate the engine

Start building first. Only run install checks when you need to render and the package cannot be resolved.

If working inside the sspdf repo, use the current working directory. Otherwise resolve the installed package:

```bash
SSPDF_DIR=$(node -e "console.log(require('path').dirname(require.resolve('h17-sspdf')))")
```

If resolution fails:

```bash
npm install h17-sspdf
```

The base package has no runtime dependency tree. The optional chart plugin needs the `canvas` peer dependency:

```bash
npm install canvas
```

## Context

The sspdf engine takes two inputs: a theme (styling) and a source (content as JSON). The source contains only content and structural intent, no colors, no sizes, no positions. The theme controls every visual decision via labels. The core does the math.

## Fast path

When asked to create a PDF, do this immediately:

1. Pick output paths, usually `source.json`, `theme.js`, and `output.pdf` unless the user specified names.
2. Draft the source and theme together. Every source label must exist in `theme.labels`.
3. Use 6 to 12 labels for a normal document: title, subtitle, body, meta row left/right, rule, bullet text, bullet marker, table cell/header, footer left/right.
4. Render with the CLI.
5. Inspect failures, add missing labels or adjust layout, render again.

Minimal source:

```json
{
  "pageTemplates": {
    "footer": [
      { "type": "divider", "label": "doc.footer.rule" },
      {
        "type": "row",
        "leftLabel": "doc.footer.left",
        "rightLabel": "doc.footer.right",
        "leftText": "Document",
        "rightText": "Page {{page}}"
      }
    ],
    "footerHeightMm": 10,
    "footerBypassMargins": false
  },
  "operations": [
    { "type": "text", "label": "doc.title", "text": "Document Title" },
    { "type": "text", "label": "doc.body", "text": ["First paragraph.", "Second paragraph."] }
  ]
}
```

Minimal theme:

```js
module.exports = {
  name: "Quick Theme",
  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    marginTopMm: 18,
    marginBottomMm: 18,
    marginLeftMm: 18,
    marginRightMm: 18,
    backgroundColor: [255, 255, 255],
    defaultText: { fontFamily: "helvetica", fontStyle: "normal", fontSize: 10, color: [35, 35, 35], lineHeight: 1.35 },
    defaultStroke: { color: [35, 35, 35], lineWidth: 0.2, lineCap: "butt", lineJoin: "miter" },
    defaultFillColor: [255, 255, 255],
  },
  layout: { bulletIndentMm: 4, columnGutterMm: 6 },
  labels: {
    "doc.title": { fontFamily: "helvetica", fontStyle: "bold", fontSize: 22, color: [20, 28, 38], lineHeight: 1.1, marginBottomMm: 4 },
    "doc.body": { fontFamily: "helvetica", fontStyle: "normal", fontSize: 10, color: [45, 50, 58], lineHeight: 1.35, marginBottomMm: 3 },
    "doc.footer.rule": { color: [180, 185, 194], lineWidth: 0.25, marginBottomMm: 2 },
    "doc.footer.left": { fontFamily: "helvetica", fontStyle: "normal", fontSize: 8, color: [100, 108, 120], lineHeight: 1 },
    "doc.footer.right": { fontFamily: "helvetica", fontStyle: "normal", fontSize: 8, color: [100, 108, 120], lineHeight: 1 },
  },
};
```

Render:

```bash
npx h17-sspdf -s source.json -t ./theme.js -o output.pdf
```

## Read on demand

Do not read all docs before drafting a normal document. Read only what you need:

```bash
rg -n "#### `table`|#### `columns`|#### `image`|#### `chart`|Theme structure|Label property" $SSPDF_DIR/DOCUMENTATION.md
```

Read `DOCUMENTATION.md` sections when:
- You hit a validation/rendering error.
- You need a specialized operation (`chart`, `image`, `columns`, `table`, page templates).
- You need exact label property names.

Check available themes:

```bash
ls $SSPDF_DIR/examples/themes/
```

Check existing source examples for patterns:

```bash
ls $SSPDF_DIR/examples/sources/
```

## Operation types

- `text` - wrapped text paragraphs (supports string arrays for multiple paragraphs)
- `row` - two values on one line, left-aligned and right-aligned
- `bullet` - marker character or vector shape + wrapped text (supports arrays)
- `divider` - horizontal line
- `spacer` - vertical space
- `pageBreak` - forces a new page (useful for presentation-style layouts)
- `hiddenText` - invisible text for ATS keyword injection
- `quote` - blockquote with optional attribution
- `block` - groups children, optional container background/border, `keepTogether`
- `section` - groups children, allows page breaks inside (keepTogether defaults false)
- `table` - data table with header, per-column alignment, alternating rows, borders
- `chart` - bar, line, doughnut, pie via Chart.js (requires `canvas` npm package)
- `image` - embedded PNG/JPEG with optional centered caption
- `columns` - two-column side-by-side layout; cursor lands below the taller column

Read DOCUMENTATION.md for field details on each type.

## Image operations

Embed images from file paths. Works in any source JSON, any layout.

```json
{
  "type": "image",
  "src": "photos/building.jpg",
  "width": "100%",
  "label": "doc.image",
  "caption": "Fig. 1 - The main office building",
  "captionLabel": "doc.image.caption"
}
```

**Size options:**
- `width: "80%"` - percentage of content width, height from aspect ratio (most common)
- `widthMm: 120` - explicit width in mm, height from aspect ratio
- `widthMm: 120, heightMm: 80` - exact slot, may distort if ratio differs
- No size specified - fills content width, height from aspect ratio

**Caption:** If `caption` is set, renders centered below the image. Uses `captionLabel` for styling. If no `captionLabel` is specified, defaults to `label + ".caption"`. If that label does not exist in the theme, the engine applies defaults: same font family as `page.defaultText`, italic, 2pt smaller, centered, 1.5mm gap. Color inherited from `defaultText`. To override, declare a `captionLabel` in the theme.

**Label:** Controls padding and margins around the image block, not text. Set `paddingTopMm`, `paddingBottomMm`, `paddingLeftMm`, `paddingRightMm`, `marginTopMm`, `marginBottomMm`.

**Keep-together:** Image + caption never split across pages. If the block does not fit, it moves to the next page.

**Resolution:** For crisp output at full content width, images should be at least 1000px wide. 1200px+ is comfortable. Below 800px it starts looking soft.

## Built-in fonts

The package ships with 20 Google Fonts as base64 TTF files. Each exports `{ Regular, Bold }` (capitalized). Only normal and bold faces ship. No italic TTFs included.

**Sans-serif:** Inter (`inter`), Roboto (`roboto`), Open Sans (`open-sans`), Montserrat (`montserrat`), Lato (`lato`), Raleway (`raleway`), Nunito (`nunito`), Work Sans (`work-sans`), IBM Plex Sans (`ibm-plex-sans`), PT Sans (`pt-sans`), Oswald (`oswald`)

**Serif:** Merriweather (`merriweather`), Lora (`lora`), Playfair Display (`playfair-display`), Crimson Text (`crimson-text`), Libre Baskerville (`libre-baskerville`), Source Serif 4 (`source-serif-4`)

**Monospace:** Fira Code (`fira-code`), JetBrains Mono (`jetbrains-mono`), Source Code Pro (`source-code-pro`)

Require path: `h17-sspdf/fonts/<name>.js`. Also: `npx h17-sspdf --fonts`

```js
const INTER = require("h17-sspdf/fonts/inter.js");

customFonts: [{
  family: "Inter",
  faces: [
    { style: "normal", fileName: "Inter-Regular.ttf", data: INTER.Regular },
    { style: "bold", fileName: "Inter-Bold.ttf", data: INTER.Bold },
  ],
}],
```

## Vector shapes as bullet markers

The engine includes 20 vector shapes that bypass text encoding. Use them as bullet markers by setting `shape` on the marker label instead of `marker`:

```js
// Theme label
"doc.marker.arrow": {
  shape: "arrow",
  shapeColor: [0, 128, 255],
  shapeSize: 0.8,
  textIndentMm: 2,
}
```

```json
// Source JSON (unchanged from text markers)
{
  "type": "bullet",
  "label": "doc.body",
  "markerLabel": "doc.marker.arrow",
  "bullets": ["First point", "Second point"]
}
```

List available shapes:

```bash
npx h17-sspdf --shapes
```

Available: `arrow`, `circle`, `square`, `diamond`, `triangle`, `dash`, `chevron`, `doubleColon`, `commentSlash`, `hashComment`, `bracketChevron`, `treeBranch`, `terminalPrompt`, `checkmark`, `cross`, `star`, `plus`, `minus`, `warning`, `infoCircle`.

## Source JSON structure

```json
{
  "pageTemplates": {
    "header": [ /* operations */ ],
    "footer": [ /* operations */ ],
    "headerHeightMm": 12,
    "footerHeightMm": 10
  },
  "operations": [
    { "type": "text", "label": "doc.title", "text": "Document Title" },
    { "type": "divider", "label": "doc.rule" },
    { "type": "text", "label": "doc.body", "text": ["Paragraph one.", "Paragraph two."] }
  ]
}
```

The `{{page}}` token in any text value resolves to the current page number.

## Two-column layout

Place two independent blocks side by side with the `columns` operation. The cursor lands below the taller column; full-width operations after the block start from there.

```json
{
  "type": "columns",
  "gutterMm": 5,
  "column1": [
    { "type": "text", "label": "doc.heading", "text": "Remunerations" },
    { "type": "table", "label": "doc.table.cell", "headerLabel": "doc.table.header",
      "columns": [{ "header": "Item", "width": "70%", "align": "left" }, { "header": "Value", "width": "30%", "align": "right" }],
      "rows": [["Salary", "R$ 2,344.95"], ["Overtime", "R$ 1,151.16"]] }
  ],
  "column2": [
    { "type": "text", "label": "doc.heading", "text": "Deductions" },
    { "type": "table", "label": "doc.table.cell", "headerLabel": "doc.table.header",
      "columns": [{ "header": "Item", "width": "70%", "align": "left" }, { "header": "Value", "width": "30%", "align": "right" }],
      "rows": [["INSS", "R$ 426.56"], ["Health", "R$ 89.00"]] }
  ]
}
```

**Gutter:** set `gutterMm` on the operation, or set `columnGutterMm` in `theme.layout` as a document-wide default. If neither is defined, the engine throws. The per-operation value takes precedence.

**Column width:** `(contentWidth - gutterMm) / 2`. Both columns are always equal width.

Any operation type works inside columns: tables, images, bullets, nested blocks.

## Table operations

Tables are first-class. Define columns with width and alignment, provide rows as string arrays.

```json
{
  "type": "table",
  "label": "report.table.cell",
  "headerLabel": "report.table.header",
  "columns": [
    { "header": "Item", "width": "50%", "align": "left" },
    { "header": "Amount", "width": "50%", "align": "right" }
  ],
  "rows": [
    ["Widget A", "$1,200.00"],
    ["Widget B", "$800.00"]
  ]
}
```

Column widths: `"30%"` (percentage), `35` (fixed mm), or omitted (auto-divide). Headers re-draw on page breaks.

## Table labels pattern

For tables, use the shared constants from `examples/themes/table.js`:

```js
const table = require("h17-sspdf/examples/themes/table");

labels: {
  "report.table.cell": {
    ...table.cell,
    color: [51, 65, 85],
    altRowColor: [248, 249, 252],
  },
  "report.table.header": {
    ...table.header,
    backgroundColor: [55, 65, 81],
    color: [255, 255, 255],
  },
}
```

## Page templates (headers/footers)

Reserve space and control margins for repeating headers/footers:

```json
{
  "pageTemplates": {
    "footer": [
      { "type": "divider", "label": "footer.rule" },
      {
        "type": "row",
        "leftLabel": "footer.left",
        "rightLabel": "footer.right",
        "leftText": "Document Title",
        "rightText": "Page {{page}}"
      }
    ],
    "headerHeightMm": 12,
    "footerHeightMm": 10,
    "headerStartMm": 5,
    "footerStartMm": 280,
    "headerBypassMargins": false,
    "footerBypassMargins": false
  }
}
```

Key: `headerHeightMm`/`footerHeightMm` reserves space so body text does not overlap. `{{page}}` resolves to current page number.

Header/footer margins are controlled in the source JSON, not by trying to add side margins to theme labels. Set `headerBypassMargins: false` and `footerBypassMargins: false` when template content should align to the normal page content area. Leave a bypass flag true only for intentional full-bleed rules, backgrounds, or edge-to-edge bands.

If a template needs both full-bleed graphics and margin-aligned text, split them: use one full-bleed divider/block operation with explicit `xMm`/width or a bypassing template, then keep the text template margin-aware with the bypass flag false. Do not rely on `marginLeftMm`/`marginRightMm` inside header/footer label styles to fix template bounds.

## Colors

All colors are `[R, G, B]` arrays, values 0-255. Example: `[255, 0, 128]` is pink, `[0, 0, 0]` is black.

## Rules

1. Every `label` in the source must exist in the theme. If using an existing theme, read it first to know what labels are available.
2. The source never says how to render. No colors, no sizes, no font names in the JSON. Only content and label references.
3. Use `keepWithNext` on headings to prevent orphaning. Use `block` with `keepTogether` for cards or grouped content.
4. Use `section` for logical grouping without forcing everything onto one page.
5. Prefer text arrays over repeating the same operation for multiple paragraphs.
6. Table `rows` must match `columns` length. Each cell is a string.
7. When using shapes as bullet markers, the source JSON is identical to text markers. Only the theme label changes (`shape` instead of `marker`).
8. Image `src` must point to an existing PNG or JPEG file. For crisp full-width output, source images should be at least 1000px wide.
9. Image + caption are always kept together. They never split across pages.
10. Custom page sizes are supported via `pageWidthMm`/`pageHeightMm` in the theme (e.g. 338x190mm for 16:9 presentations). Default is A4.
11. Charts support `heightMm: "fill"` to use all remaining vertical space on the page. Charts can be centered via `layout.chartAlign: "center"` in the theme or `align: "center"` per operation.

## Workflow

1. Determine the document type and choose a simple structure.
2. Create the source JSON and theme JS in parallel. Do not wait for a separate theme pass unless the user asked for only one file.
3. Keep source JSON content-only. Put all font, color, spacing, and page geometry in the theme.
4. Start with a minimal label set, render, then add labels for sections that fail or look wrong.
5. Use examples only as pattern references. Do not copy a full example unless the user asked for that style.
6. If using charts, install `canvas` if needed. The CLI auto-detects chart operations and pre-renders them.
7. Render the PDF and leave the source/theme files next to it unless the user requested a different location.

## Rendering

### CLI (simplest)

```bash
npx h17-sspdf -s my-source.json -t default -o output/my-doc.pdf
```

Built-in themes: `default`, `editorial`, `newsprint`, `corporate`, `ceremony`, `program`, `financial`, `presentation`.

Custom theme file:

```bash
npx h17-sspdf -s my-source.json -t ./my-custom-theme.js -o output/custom.pdf
```

The CLI auto-detects chart operations and pre-renders them. No extra setup needed.

### Programmatic

```js
const { renderDocument } = require("h17-sspdf");
const theme = require("h17-sspdf/examples/themes/theme-default");
const source = require("./my-source.json");

renderDocument({ source, theme, outputPath: "output/my-doc.pdf" });
```

### With charts (async, programmatic only)

```js
const { renderDocument, registerPlugin, plugins } = require("h17-sspdf");
const theme = require("h17-sspdf/examples/themes/theme-default");

registerPlugin("chart", plugins.chart);

async function main() {
  const chartOp = { type: "chart", chartType: "bar", data: { ... }, widthMm: 160, heightMm: 90 };
  await plugins.chart.preRender(chartOp);

  renderDocument({
    source: { operations: [ chartOp ] },
    theme,
    outputPath: "output/chart.pdf",
  });
}

main();
```

Note: the CLI handles chart pre-rendering automatically. The programmatic API requires manual pre-rendering.

## Verification

After rendering, confirm the PDF exists and open it for the user:

```bash
ls -la output/my-doc.pdf
if [[ "$OSTYPE" == "darwin"* ]]; then open output/my-doc.pdf; elif [[ "$OSTYPE" == "linux"* ]]; then xdg-open output/my-doc.pdf; else start output/my-doc.pdf; fi
```

If something fails, check:
- All labels referenced in the source exist in the theme
- Table columns array is non-empty, rows array exists
- h17-sspdf is installed (`npx h17-sspdf --help`)
