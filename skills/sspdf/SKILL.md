---
name: sspdf
description: Generate PDF documents with the sspdf engine. Use when asked to create, render, or generate a PDF, invoice, report, article, tear sheet, or any printable document.
user-invocable: true
argument-hint: "what to generate (e.g. 'invoice for $7,250', 'Apple tear sheet', 'event program')"
metadata:
  author: Hugo Palma
  version: 1.0.0
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

## Step 0: Verify installation

Before anything else, verify h17-sspdf is installed:

```bash
npx h17-sspdf --help
```

If this fails, install it:

```bash
npm install h17-sspdf
```

The `canvas` npm package (native C++ addon) is the only dependency. If canvas fails to build, the user needs build tools (`python3`, `make`, `g++`/`clang`) and Cairo headers. See the canvas npm page for platform-specific instructions.

## Context

The sspdf engine takes two inputs: a theme (styling) and a source (content as JSON). The source contains only content and structural intent, no colors, no sizes, no positions. The theme controls every visual decision via labels. The core does the math.

Resolve the package location:

```bash
SSPDF_DIR=$(node -e "console.log(require('path').dirname(require.resolve('h17-sspdf')))")
```

If working inside the sspdf repo itself, use the current working directory instead.

## Required reading

Before generating any document, always read:

```bash
cat $SSPDF_DIR/DOCUMENTATION.md
```

Read the full Source section for operation types, field requirements, and patterns. Read the Theme section if you need to create or modify a theme.

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
- `hiddenText` - invisible text for ATS keyword injection
- `quote` - blockquote with optional attribution
- `block` - groups children, optional container background/border, `keepTogether`
- `section` - groups children, allows page breaks inside (keepTogether defaults false)
- `table` - data table with header, per-column alignment, alternating rows, borders

Read DOCUMENTATION.md for field details on each type.

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
    "headerBypassMargins": true,
    "footerBypassMargins": false
  }
}
```

Key: `headerHeightMm`/`footerHeightMm` reserves space so body text does not overlap. `{{page}}` resolves to current page number.

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

## Workflow

1. Read `DOCUMENTATION.md` for the full operation reference.
2. Determine what document the user needs.
3. Check `examples/themes/` for an existing theme that fits. If none fits, generate one using the sspdf-theme-generator approach (read its skill or DOCUMENTATION.md Theme section).
4. Build the source JSON with the correct operations and labels.
5. Write the source JSON to `examples/sources/` (or wherever the user specifies).
6. If using charts, register the chart plugin and pre-render before calling renderDocument. See DOCUMENTATION.md Chart plugin section.
7. Render the PDF.

## Rendering

### CLI (simplest)

```bash
npx h17-sspdf -s my-source.json -t default -o output/my-doc.pdf
```

Built-in themes: `default`, `editorial`, `newsprint`, `corporate`, `ceremony`, `program`, `financial`.

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
