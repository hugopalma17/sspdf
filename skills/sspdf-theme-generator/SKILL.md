---
name: sspdf-theme-generator
description: Generate sspdf theme files from brand specs (colors, fonts, document type). Use when asked to create a theme, style a document, or design a PDF layout for sspdf.
user-invocable: true
argument-hint: "brand colors, fonts, and document type (e.g. 'navy headers, Arial, financial tear sheet')"
metadata:
  author: Hugo Palma
  version: 1.0.0
  tags: [pdf, theme, styling, design, sspdf]
  input_format: brand specs (plain text)
  output_format: theme.js file
license: Apache-2.0
---

# Skill: sspdf Theme Generator

You generate theme files for the sspdf PDF engine. A theme is a JS object that controls every visual decision in a document. You know the full label property schema and produce themes that work on first render.

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

## Context

The sspdf engine takes two inputs: a theme (styling rules) and a source (content). The theme controls page geometry, baseline state, and label styles. The source references labels by name. If a label is missing, the engine throws.

Resolve the package location:

```bash
SSPDF_DIR=$(node -e "console.log(require('path').dirname(require.resolve('h17-sspdf')))")
```

If working inside the sspdf repo itself, use the current working directory instead.

## What you produce

A single `.js` file that exports a valid theme object. The file goes wherever the user specifies.

## Required reading

Before generating a theme, always read:

```bash
cat $SSPDF_DIR/DOCUMENTATION.md
```

Read the full Theme section (page config, labels, customFonts, layout). This is your source of truth for every property name, type, and constraint.

Also check existing themes for patterns:

```bash
ls $SSPDF_DIR/examples/themes/
```

Read at least one existing theme to match the project's conventions.

## Theme structure

```js
module.exports = {
  name: "Theme Name",

  page: {
    format: "a4",            // named format: "a4", "letter", etc.
    orientation: "portrait",  // or "landscape"
    unit: "mm",              // only mm
    pageWidthMm: 338,        // custom width (overrides format)
    pageHeightMm: 190,       // custom height (overrides format)
    compress: true,

    // margins
    marginTopMm: 20,
    marginBottomMm: 20,
    marginLeftMm: 18,
    marginRightMm: 18,

    // background
    backgroundColor: [255, 255, 255],

    // baseline text state (required, every property)
    defaultText: {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
    },

    // baseline stroke state (required)
    defaultStroke: {
      color: [0, 0, 0],
      lineWidth: 0.2,
      lineCap: "butt",
      lineJoin: "miter",
    },

    // baseline fill (required)
    defaultFillColor: [255, 255, 255],
  },

  layout: {
    chartAlign: "center",     // optional: "left" (default) or "center"
    bulletIndentMm: 4,        // optional: bullet text indent
  },

  labels: {
    // every label the source JSON will reference
  },
};
```

When `pageWidthMm` and `pageHeightMm` are both set, they override the `format` field and create a page with those exact dimensions. All layout math adapts automatically. For 16:9 presentations, use 338x190mm. See `examples/themes/theme-presentation.js` for a complete example.

## Built-in fonts

The package ships with 20 Google Fonts as base64 TTF files. Each exports `{ Regular, Bold }` (capitalized). Only normal and bold faces ship. No italic TTFs included.

**Sans-serif:** Inter (`inter`), Roboto (`roboto`), Open Sans (`open-sans`), Montserrat (`montserrat`), Lato (`lato`), Raleway (`raleway`), Nunito (`nunito`), Work Sans (`work-sans`), IBM Plex Sans (`ibm-plex-sans`), PT Sans (`pt-sans`), Oswald (`oswald`)

**Serif:** Merriweather (`merriweather`), Lora (`lora`), Playfair Display (`playfair-display`), Crimson Text (`crimson-text`), Libre Baskerville (`libre-baskerville`), Source Serif 4 (`source-serif-4`)

**Monospace:** Fira Code (`fira-code`), JetBrains Mono (`jetbrains-mono`), Source Code Pro (`source-code-pro`)

Require path: `h17-sspdf/fonts/<name>.js` where `<name>` is the value in parentheses above.

```js
const INTER = require("h17-sspdf/fonts/inter.js");
const MERRIWEATHER = require("h17-sspdf/fonts/merriweather.js");

customFonts: [
  {
    family: "Inter",
    faces: [
      { style: "normal", fileName: "Inter-Regular.ttf", data: INTER.Regular },
      { style: "bold", fileName: "Inter-Bold.ttf", data: INTER.Bold },
    ],
  },
  {
    family: "Merriweather",
    faces: [
      { style: "normal", fileName: "Merriweather-Regular.ttf", data: MERRIWEATHER.Regular },
      { style: "bold", fileName: "Merriweather-Bold.ttf", data: MERRIWEATHER.Bold },
    ],
  },
],
```

If you set `fontStyle: "italic"` without a matching TTF, jsPDF throws: `Unable to look up font label for font 'Inter', 'italic'`.

## Shape-based bullet markers

Instead of text markers that may have unicode encoding issues, use vector shapes:

```js
"doc.marker.arrow": {
  shape: "arrow",           // shape name from core/shapes.js
  shapeColor: [0, 128, 255],
  shapeSize: 0.8,
  textIndentMm: 2,          // gap after shape (added to shape width)
}
```

List available shapes: `npx h17-sspdf --shapes`

The source JSON uses the same `bullet` operation with `markerLabel` pointing to this label. No changes needed on the source side.

## Rules

1. Every label is self-contained. No inheritance between labels. If a label needs `fontFamily`, write `fontFamily`.
2. Colors are always `[R, G, B]` arrays, 0-255.
3. Default format is `"a4"`. Custom dimensions are supported via `pageWidthMm`/`pageHeightMm` (e.g. 338x190mm for 16:9 presentations). Only `"mm"` units are supported.
4. The `page` section must include `defaultText`, `defaultStroke`, and `defaultFillColor`, all fully specified. These reset after every operation to prevent style leaks.
5. Label names are arbitrary strings. Use a dot-namespace convention: `invoice.title`, `report.body`, `news.headline`.
6. Built-in jsPDF font families: `helvetica`, `courier`, `times`. For better typography, use the 20 shipped Google Fonts listed in the Built-in fonts section above, or embed your own TTF via `customFonts`.
7. Table labels need `cellPaddingMm`, border properties, and optionally `altRowColor`. Use the shared constants pattern from `examples/themes/table.js` if the document includes tables.
8. Do not hardcode positions or sizes in labels that belong in the source JSON.
9. Only `"normal"` and `"bold"` font styles are available for built-in fonts. Do not use `"italic"` or `"bolditalic"` unless the font includes those TTF files.

## Label property quick reference

**Text labels:** `fontFamily`, `fontStyle`, `fontSize`, `color`, `lineHeight`, `lineHeightMm`, `align`, `textTransform`

**Spacing:** `marginTopMm`, `marginTopPx`, `marginBottomMm`, `marginBottomPx`

**Padding:** `paddingMm`, `paddingPx`, `paddingTopMm`, `paddingBottomMm`, `paddingLeftMm`, `paddingRightMm` (and Px variants)

**Container:** `backgroundColor`, `borderWidthMm`, `borderColor`, `borderRadiusMm`

**Left border accent:** `leftBorder: { color, widthMm, gapMm, heightMm, topOffsetMm }`

**Divider labels:** `color`, `lineWidth`, `opacity`, `dashPattern`, spacing props

**Bullet marker (text):** `fontFamily`, `fontStyle`, `fontSize`, `color`, `lineHeight`, `marker`

**Bullet marker (shape):** `shape`, `shapeColor`, `shapeSize`, `textIndentMm`

**Spacer labels:** `spaceMm`, `spacePx`

**Image labels:** `paddingTopMm`, `paddingBottomMm`, `paddingLeftMm`, `paddingRightMm`, `marginTopMm`, `marginBottomMm` (controls spacing around the image block, not typography)

**Image caption labels:** `fontFamily`, `fontStyle`, `fontSize`, `color`, `lineHeight`, `align` (always center-aligned). If not declared in the theme, the engine applies defaults: same font family as `page.defaultText`, italic, 2pt smaller, centered, 1.5mm gap. Color inherited from `defaultText`. To override, declare the caption label in the theme.

**Table cell labels:** `fontFamily`, `fontStyle`, `fontSize`, `color`, `lineHeight`, `cellPaddingMm`, `backgroundColor`, `altRowColor`, `borderColor`, `borderTopMm`, `borderBottomMm`, `borderLeftMm`, `borderRightMm`, per-edge color overrides

## Workflow

1. Read `DOCUMENTATION.md` for the full property reference.
2. Read at least one existing theme in `examples/themes/` for conventions.
3. Ask the user what document type they need (or infer from context).
4. Identify every visual element the document will have. Each one needs a label.
5. Generate the theme file with all labels fully specified.
6. If the document uses tables, read `examples/themes/table.js` and use the shared constants pattern.
7. Write the file to the specified path.

## Theme validation checklist

Before finalizing a theme, verify:

**Page section:**
- `format: "a4"` (default) or custom via `pageWidthMm`/`pageHeightMm`. `unit: "mm"` required.
- `orientation`: "portrait" or "landscape"
- All four margins set (`marginTopMm`, `marginBottomMm`, `marginLeftMm`, `marginRightMm`)
- `defaultText` fully specified (`fontFamily`, `fontStyle`, `fontSize`, `color`, `lineHeight`)
- `defaultStroke` fully specified (`color`, `lineWidth`, `lineCap`, `lineJoin`)
- `defaultFillColor` set

**Labels:**
- Every label has `fontFamily` explicitly set (no inheritance)
- Table labels have `cellPaddingMm`, `borderColor`, `altRowColor` if using alternating rows
- Divider labels have `color` and `lineWidth`
- Bullet text marker labels have `marker` character
- Bullet shape marker labels have `shape` name
- Image labels use padding/margin props only (not font props)
- Image caption labels have `fontFamily`, `fontSize`, `color`, `align: "center"`
- Colors are `[R, G, B]` arrays, not hex strings

**If using custom fonts:**
- `customFonts` array includes all fonts used in labels
- Each face has `style`, `fileName` (ending in `.ttf`), and `data` (base64)
- `fontFamily` in labels matches `family` in `customFonts` exactly

## Verification

If the user has a source JSON ready, render it:

```bash
npx h17-sspdf -s <source.json> -t <theme-path> -o output/test.pdf
```
