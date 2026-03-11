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
SSPDF_DIR=$(node -e "console.log(require.resolve('h17-sspdf').replace('/index.js',''))")
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
- `bullet` - marker character + wrapped text (supports arrays)
- `divider` - horizontal line
- `spacer` - vertical space
- `hiddenText` - invisible text for ATS keyword injection
- `quote` - blockquote with optional attribution
- `block` - groups children, optional container background/border, `keepTogether`
- `section` - groups children, allows page breaks inside (keepTogether defaults false)
- `table` - data table with header, per-column alignment, alternating rows, borders

Read DOCUMENTATION.md for field details on each type.

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

## Rules

1. Every `label` in the source must exist in the theme. If using an existing theme, read it first to know what labels are available.
2. The source never says how to render. No colors, no sizes, no font names in the JSON. Only content and label references.
3. Use `keepWithNext` on headings to prevent orphaning. Use `block` with `keepTogether` for cards or grouped content.
4. Use `section` for logical grouping without forcing everything onto one page.
5. Prefer text arrays over repeating the same operation for multiple paragraphs.
6. Table `rows` must match `columns` length. Each cell is a string.

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
open output/my-doc.pdf
```

If something fails, check:
- All labels referenced in the source exist in the theme
- Table columns array is non-empty, rows array exists
- h17-sspdf is installed (`npx h17-sspdf --help`)
