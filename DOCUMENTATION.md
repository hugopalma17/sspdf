# Documentation

How to create themes and source documents for this engine.

The engine takes two inputs - a **theme** (styling rules) and a **source** (content) - and produces a PDF. The theme controls every visual decision. The source contains only content and structural intent. The core does math.

---

## Theme

A theme is a JS object with this shape:

```js
module.exports = {
  name: "My Theme",              // used in PDF metadata

  page: { /* page config */ },
  labels: { /* label styles */ },

  // optional
  layout: { /* shared layout defaults */ },
  customFonts: [ /* embedded fonts */ ],
};
```

### `page` (required)

Controls page geometry, background, and baseline rendering state.

```js
page: {
  // Page geometry
  format: "a4",                   // only "a4" is supported
  orientation: "portrait",        // "portrait" or "landscape"
  unit: "mm",                     // only "mm" is supported
  compress: true,                 // PDF compression (default true)

  // Margins - individual margins override the shared `margin` value
  margin: 15,                     // fallback for all four sides (mm)
  marginTopMm: 20,                // overrides margin for top
  marginBottomMm: 20,             // overrides margin for bottom
  marginLeftMm: 18,               // overrides margin for left
  marginRightMm: 18,              // overrides margin for right

  // Background
  backgroundColor: [255, 252, 248],  // [R, G, B] - painted on every page

  // Baseline text state - applied after every operation to prevent style leakage.
  // Every property is required.
  defaultText: {
    fontFamily: "helvetica",      // jsPDF built-in or custom font family
    fontStyle: "normal",          // "normal", "bold", "italic", "bolditalic"
    fontSize: 10,                 // points
    color: [0, 0, 0],             // [R, G, B]
    lineHeight: 1.2,              // multiplier
  },

  // Baseline stroke state - required.
  defaultStroke: {
    color: [0, 0, 0],             // [R, G, B]
    lineWidth: 0.2,               // mm
    lineCap: "butt",              // "butt", "round", "square"
    lineJoin: "miter",            // "miter", "round", "bevel"
  },

  // Baseline fill color - required.
  defaultFillColor: [255, 255, 255],  // [R, G, B]

  // PDF metadata (optional)
  metadata: {
    title: "Document Title",
    subject: "",
    author: "Author Name",
    keywords: "",
  },
}
```

The content area runs from `marginTop` to `pageHeight - marginBottom` vertically, and `marginLeft` to `pageWidth - marginRight` horizontally. On A4 portrait, the page is 210 × 297 mm.

### `labels` (required)

A flat map of label names to style objects. Every operation in the source references a label by name. If the label doesn't exist in the theme, the engine throws.

Label names are arbitrary strings. Use a naming convention that makes sense for your document (e.g., `news.headline`, `resume.title`, `invoice.total`).

#### Text label properties

Used by `text`, `row`, `bullet`, and `block` operations.

| Property | Type | Description |
|---|---|---|
| `fontFamily` | string | Font family name (`"helvetica"`, `"courier"`, or custom) |
| `fontStyle` | string | `"normal"`, `"bold"`, `"italic"`, `"bolditalic"` |
| `fontSize` | number | Font size in points |
| `color` | [R,G,B] | Text color |
| `lineHeight` | number | Line height multiplier (e.g., `1.2`) |
| `lineHeightMm` | number | Direct line height in mm (overrides fontSize × lineHeight) |
| `align` | string | `"left"`, `"center"`, `"right"`, `"justify"` |
| `textTransform` | string | `"upper"` or `"lower"` |

#### Spacing

Every label can define vertical spacing around its content.

| Property | Type | Description |
|---|---|---|
| `marginTopMm` | number | Space above in mm |
| `marginTopPx` | number | Space above in CSS px (converted to mm) |
| `marginBottomMm` | number | Space below in mm |
| `marginBottomPx` | number | Space below in CSS px (converted to mm) |

#### Padding

Padding is inside the content box. Affects text position and background/border sizing.

| Property | Type | Description |
|---|---|---|
| `paddingMm` | number | Shorthand - all four sides |
| `paddingPx` | number | Shorthand - all four sides (CSS px) |
| `paddingTopMm` | number | Top padding in mm |
| `paddingBottomMm` | number | Bottom padding in mm |
| `paddingLeftMm` | number | Left padding in mm |
| `paddingRightMm` | number | Right padding in mm |

Each side also accepts a `Px` variant (e.g., `paddingTopPx`). Individual sides override the shorthand.

For **row labels**, `paddingLeftMm` on the left label and `paddingRightMm` on the right label offset the text inward from the content edge.

#### Container (background & border)

When a label defines a background or border, the text is drawn inside a container rect.

| Property | Type | Description |
|---|---|---|
| `backgroundColor` | [R,G,B] | Fill color behind text |
| `borderWidthMm` | number | Border stroke width in mm |
| `borderColor` | [R,G,B] | Border stroke color |
| `borderRadiusMm` | number | Rounded corners (if jsPDF supports `roundedRect`) |

#### Left border accent

A vertical bar drawn to the left of the text block.

```js
leftBorder: {
  color: [13, 148, 136],    // [R, G, B]
  widthMm: 1.4,             // bar width
  gapMm: 2.5,               // gap between bar and text
  heightMm: 10,             // optional - defaults to text block height
  topOffsetMm: 0,           // optional - vertical offset from text top
}
```

#### Divider label properties

Used by `divider` operations. Does not use font properties.

| Property | Type | Description |
|---|---|---|
| `color` | [R,G,B] | Line color |
| `lineWidth` | number | Line thickness in mm |
| `opacity` | number | 0-1 stroke opacity |
| `dashPattern` | number[] | Dash pattern (e.g., `[2, 1]`) |
| `marginTopMm` | number | Space above |
| `marginBottomMm` | number | Space below |

(Also accepts `Px` variants for margins.)

#### Bullet marker label properties

The marker label controls the bullet character's appearance. A marker can be either a text character or a vector shape.

**Text marker** (default):

| Property | Type | Description |
|---|---|---|
| `fontFamily` | string | Marker font |
| `fontStyle` | string | Marker font style |
| `fontSize` | number | Marker font size in points |
| `color` | [R,G,B] | Marker color |
| `lineHeight` | number | Marker line height multiplier |
| `marker` | string | The marker character (e.g., `"-"`) |

**Shape marker** (vector, no text encoding needed):

| Property | Type | Description |
|---|---|---|
| `shape` | string | Shape name from the built-in shape library (see Vector Shapes below) |
| `shapeColor` | [R,G,B] | Shape fill/stroke color (falls back to `color` if omitted) |
| `shapeSize` | number | Scale factor (default: 1) |
| `textIndentMm` | number | Gap between shape and bullet text in mm (default: 1.5, added to shape width) |

When `shape` is set, the core renders a vector shape instead of a text character. The text indent is calculated as `shapeWidth + textIndentMm`. No `fontFamily`, `fontSize`, or `marker` needed.

#### Table label properties

Used by `table` operations. The `label` controls data cell styling, `headerLabel` controls header cell styling.

| Property | Type | Description |
|---|---|---|
| `fontFamily` | string | Cell text font |
| `fontStyle` | string | Cell text font style |
| `fontSize` | number | Cell text font size in points |
| `color` | [R,G,B] | Cell text color |
| `lineHeight` | number | Cell text line height multiplier |
| `cellPaddingMm` | number | Padding inside each cell in mm |
| `backgroundColor` | [R,G,B] | Cell/header background color (even rows use this, odd rows use `altRowColor`) |
| `altRowColor` | [R,G,B] | Background color for odd data rows (alternating row shading) |
| `borderColor` | [R,G,B] | Default border color for all edges |
| `borderTopMm` | number | Top border width in mm |
| `borderBottomMm` | number | Bottom border width in mm |
| `borderLeftMm` | number | Left border width in mm |
| `borderRightMm` | number | Right border width in mm |
| `borderTopColor` | [R,G,B] | Override border color for top edge |
| `borderBottomColor` | [R,G,B] | Override border color for bottom edge |
| `borderLeftColor` | [R,G,B] | Override border color for left edge |
| `borderRightColor` | [R,G,B] | Override border color for right edge |

The header label typically sets `backgroundColor` for the header row background and `color` for white text on dark backgrounds.

#### Spacer label properties

Used by `spacer` operations that reference a label.

| Property | Type | Description |
|---|---|---|
| `spaceMm` | number | Vertical space in mm |
| `spacePx` | number | Vertical space in CSS px |

### `layout` (optional)

Shared layout defaults read by operation handlers.

```js
layout: {
  bulletIndentMm: 4.5,     // text indent after bullet marker (default: 4)
}
```

### `customFonts` (optional)

Embed TTF fonts as base64 for use in labels.

```js
customFonts: [
  {
    family: "Inter",
    faces: [
      { style: "normal", fileName: "Inter-Regular.ttf", data: "<base64 string>" },
      { style: "bold",   fileName: "Inter-Bold.ttf",    data: "<base64 string>" },
    ],
  },
],
```

After registration, use `fontFamily: "Inter"` in any label.

### Label example

```js
labels: {
  "doc.title": {
    fontFamily: "helvetica",
    fontStyle: "bold",
    fontSize: 22,
    color: [30, 30, 30],
    lineHeight: 1.2,
    align: "center",
    marginBottomPx: 8,
  },
  "doc.divider": {
    color: [200, 200, 200],
    lineWidth: 0.3,
    marginBottomPx: 6,
  },
  "doc.body": {
    fontFamily: "helvetica",
    fontStyle: "normal",
    fontSize: 10,
    color: [50, 50, 50],
    lineHeight: 1.4,
    align: "justify",
    marginBottomPx: 4,
  },
}
```

---

## Source (JSON)

The source is a JSON object that contains only content and structure. No colors, no sizes, no positions - those all come from the theme via labels.

### Root format

The source can take several forms:

```json
{ "operations": [ ... ] }
```
```json
{ "sections": [ ... ] }
```
```json
{ "content": [ ... ] }
```
```json
{ "items": [ ... ] }
```
```json
{ "children": [ ... ] }
```
```json
[ ... ]
```

All are equivalent - the engine normalizes them into a flat operation list. `sections`, `content`, `items`, and `children` are interchangeable wrapper keys.

### `pageTemplates` (optional)

Defined at the source root, alongside the operation array. Renders repeating headers/footers on every page.

```json
{
  "pageTemplates": {
    "header": [ /* operations */ ],
    "footer": [ /* operations */ ],
    "headerHeightMm": 12,
    "footerHeightMm": 10,
    "headerStartMm": 5,
    "footerStartMm": 280,
    "headerBypassMargins": true,
    "footerBypassMargins": true
  },
  "sections": [ ... ]
}
```

- `headerHeightMm` / `footerHeightMm` - reserves space in the content area so body text doesn't overlap. If omitted and operations exist, defaults to 12mm (header) or 10mm (footer).
- `headerStartMm` / `footerStartMm` - Y position where the template starts rendering. Footer defaults to `pageHeight - footerHeightMm`.
- `headerBypassMargins` / `footerBypassMargins` - if true (default), template operations can use the full page width instead of the content area.

The `{{page}}` token in any text value resolves to the current page number.

---

### Operation types

#### `text`

Renders wrapped text.

```json
{ "type": "text", "label": "doc.body", "text": "Paragraph content here." }
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | yes | string | Theme label for styling |
| `text` | yes | string or string[] | Text content. Array expands to multiple text operations sharing the same label. |
| `keepWithNext` | no | number or true | Keep this + next N operations together on the same page. `true` = 1. |
| `align` | no | string | Overrides label's `align` |
| `wrap` | no | boolean | Set `false` to disable wrapping (default true) |
| `advance` | no | boolean | Set `false` to not move cursor after drawing (default true) |

When `text` is an array:
```json
{
  "type": "text",
  "label": "doc.body",
  "text": [
    "First paragraph.",
    "Second paragraph.",
    "Third paragraph."
  ]
}
```
Each string becomes its own text operation with the same label.

#### `row`

Renders two text values on the same line - one left-aligned, one right-aligned.

```json
{
  "type": "row",
  "leftLabel": "meta.left",
  "rightLabel": "meta.right",
  "leftText": "Author Name",
  "rightText": "March 2026"
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `leftLabel` | yes | string | Theme label for left text |
| `rightLabel` | yes | string | Theme label for right text |
| `leftText` | yes | string | Left-aligned text |
| `rightText` | yes | string | Right-aligned text |

The cursor delta uses the taller of the two sides: `max(leftMarginTop, rightMarginTop) + max(leftLineHeight, rightLineHeight) + max(leftMarginBottom, rightMarginBottom)`.

#### `bullet`

Renders a marker character followed by wrapped text.

```json
{ "type": "bullet", "label": "doc.body", "text": "A bullet point." }
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | yes | string | Theme label for the bullet text |
| `text` / `items` / `bullets` | yes | string or string[] | Content. Array expands to multiple bullets. |
| `markerLabel` | no | string | Theme label for the marker (default: `"bullet.marker"`) |
| `marker` | no | string | Override marker character |
| `textIndentMm` | no | number | Override indent between marker and text |
| `keepWithNext` | no | number or true | Keep with next operations |

Array form:
```json
{
  "type": "bullet",
  "label": "doc.body",
  "markerLabel": "doc.marker",
  "bullets": [
    "First point.",
    "Second point.",
    "Third point."
  ]
}
```

#### `divider`

Renders a horizontal line.

```json
{ "type": "divider", "label": "doc.divider" }
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | yes | string | Theme label (must define `lineWidth` and `color`) |

#### `table`

Renders a data table with optional header row, per-column alignment, alternating row colors, and per-edge borders. Pure vector rendering, no images.

```json
{
  "type": "table",
  "label": "invoice.table.cell",
  "headerLabel": "invoice.table.header",
  "columns": [
    { "header": "Description",  "width": "45%", "align": "left" },
    { "header": "Qty",          "width": "10%", "align": "right" },
    { "header": "Unit Price",   "width": "20%", "align": "right" },
    { "header": "Amount",       "width": "25%", "align": "right" }
  ],
  "rows": [
    ["Automation Workflow", "1", "$3,200.00", "$3,200.00"],
    ["Monitoring Dashboard", "1", "$1,400.00", "$1,400.00"]
  ]
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | yes | string | Theme label for data cells |
| `headerLabel` | no | string | Theme label for the header row. If omitted, no header is rendered. |
| `columns` | yes | array | Column definitions (see below) |
| `rows` | yes | string[][] | Data rows, each an array of cell strings |
| `xMm` | no | number | Left edge in mm (default: content left margin) |
| `maxWidthMm` | no | number | Total table width in mm (default: content area width) |
| `altRowColor` | no | [R,G,B] | Override the label's `altRowColor` for this table |
| `cellPaddingMm` | no | number | Override the label's `cellPaddingMm` for this table |
| `borderColor` | no | [R,G,B] | Override the label's `borderColor` for this table |
| `borderTopMm` | no | number | Override the label's `borderTopMm` for this table |
| `borderBottomMm` | no | number | Override the label's `borderBottomMm` for this table |
| `borderLeftMm` | no | number | Override the label's `borderLeftMm` for this table |
| `borderRightMm` | no | number | Override the label's `borderRightMm` for this table |

**Column definition:**

| Field | Required | Type | Description |
|---|---|---|---|
| `header` | no | string | Header text for this column (used when `headerLabel` is set) |
| `width` | no | string or number | `"30%"` (percentage), `35` (fixed mm), or omitted (auto-divide remaining space) |
| `align` | no | string | `"left"`, `"right"`, or `"center"` (default: `"left"`) |

**Page breaks:** When a table spans multiple pages, the header row is automatically re-drawn at the top of each new page.

**Style cascade:** Engine defaults, then theme label, then source-level overrides. The source operation can override `altRowColor`, `cellPaddingMm`, and all border properties directly.

#### `image`

Embeds a PNG or JPEG image from a file path. The image and its caption are always kept together on the same page.

```json
{
  "type": "image",
  "src": "photos/cityscape.jpg",
  "width": "100%",
  "label": "editorial.photo",
  "caption": "Fig. 1 - Downtown skyline at dusk",
  "captionLabel": "editorial.photo.caption"
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `src` | yes | string | File path to a PNG or JPEG image (absolute, or relative to CWD) |
| `width` | no | string | Percentage of content width (e.g., `"100%"`, `"50%"`). Height derived from aspect ratio. |
| `widthMm` | no | number | Explicit width in mm. If `heightMm` is omitted, height derived from aspect ratio. |
| `heightMm` | no | number | Explicit height in mm. If both `widthMm` and `heightMm` are set, the image may distort. |
| `label` | no | string | Theme label for padding and margins around the image |
| `caption` | no | string | Caption text rendered centered below the image |
| `captionLabel` | no | string | Theme label for caption styling (default: `label + ".caption"`) |

**Size resolution priority:**

1. `widthMm` + `heightMm` both set: exact slot, may distort if aspect ratio differs
2. `width: "80%"`: percentage of content area width, height from aspect ratio
3. `widthMm` only: fixed width, height from aspect ratio
4. `heightMm` only: fixed height, width from aspect ratio
5. Nothing set: fills content width, height from aspect ratio

When the image is narrower than the content area, it is centered horizontally within the padded bounds.

**Caption behavior:** If `caption` is set, the text renders centered below the image. The caption label defaults to `label + ".caption"`. If no caption label exists in the theme, the caption uses the theme's default text style with italic and a smaller font size, center-aligned.

**Image label properties:** The `label` on an image operation controls spacing around the image block (padding and margins), not typography. Use it to set `paddingTopMm`, `paddingBottomMm`, `paddingLeftMm`, `paddingRightMm`, `marginTopMm`, `marginBottomMm`.

**Keep-together:** The image and its caption are always rendered as one unit. If the total height (margins + padding + image + caption) does not fit on the current page, the entire block moves to the next page.

#### `spacer`

Adds vertical space without drawing anything.

```json
{ "type": "spacer", "mm": 10 }
```

Three forms (use exactly one):

| Field | Type | Description |
|---|---|---|
| `mm` | number | Fixed space in mm |
| `px` | number | Fixed space in CSS px |
| `label` | string | Theme label with `spaceMm` or `spacePx` |

#### `hiddenText`

Renders text in the background color so it's invisible but present in the PDF text layer (for ATS keyword injection).

```json
{ "type": "hiddenText", "label": "doc.hidden", "text": "keywords for ATS parsing" }
```

Does **not** move the cursor.

#### `quote`

Shorthand for a blockquote - normalizes into a `block` with `keepTogether: true` containing the quote text and an optional attribution line.

```json
{
  "type": "quote",
  "label": "doc.pullquote",
  "text": "The quoted text goes here.",
  "attribution": "- Author Name"
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | yes | string | Theme label for the quote text (also used for block container) |
| `text` / `content` | yes | string | The quoted text |
| `attribution` / `author` | no | string | Attribution line |
| `attributionLabel` | no | string | Label for attribution (default: `label + ".attribution"`) |

The block container uses the quote's `label` - if that label has `backgroundColor`, the background wraps the entire quote + attribution.

#### `block`

Groups child operations. If the label has `backgroundColor` or `borderWidthMm`, a container rect is drawn behind the children.

```json
{
  "type": "block",
  "label": "doc.callout",
  "keepTogether": true,
  "children": [
    { "type": "text", "label": "doc.body", "text": "Inside the block." },
    { "type": "text", "label": "doc.body", "text": "Also inside." }
  ]
}
```

| Field | Required | Type | Description |
|---|---|---|---|
| `label` | no | string | Theme label for container styling (background, border) |
| `children` / `content` / `items` / `sections` | yes | array | Child operations |
| `keepTogether` | no | boolean | If true, all children move to next page if they don't fit (default true for blocks with containers) |
| `spaceAfterMm` | no | number | Extra space after the block |
| `spaceAfterPx` | no | number | Extra space after the block (CSS px) |
| `spaceAfterLabel` | no | string | Theme label with `spaceMm`/`spacePx` for space after |

Inside a block with a container, child label styles have their `backgroundColor`, `borderWidthMm`, `borderColor`, `borderRadiusMm`, and `leftBorder` stripped so they don't draw their own containers.

#### `section`

Identical to `block` but defaults to `keepTogether: false`. Use sections to group related content without forcing it onto one page.

```json
{
  "type": "section",
  "content": [
    { "type": "text", "label": "doc.heading", "text": "Section Title", "keepWithNext": 3 },
    { "type": "text", "label": "doc.body", "text": "Section body text." }
  ]
}
```

#### `group`

Alias for `block`.

### Inferred text operations

If a node has `label` and `text` (or `value`) but no `type`, it's treated as text:

```json
{ "label": "doc.body", "text": "This works too." }
```

Array values expand to multiple text operations:
```json
{ "label": "doc.body", "text": ["Paragraph one.", "Paragraph two."] }
```

---

## Cursor math

The engine positions content using a cursor that starts at `marginTopMm` and moves downward. Each operation advances the cursor by a deterministic amount:

| Operation | Cursor delta |
|---|---|
| `text` | marginTop + paddingTop + (lineCount × lineHeightMm) + paddingBottom + marginBottom |
| `row` | max(marginTops) + max(lineHeights) + max(marginBottoms) |
| `bullet` | marginTop + (lineCount × lineHeightMm) + marginBottom |
| `divider` | marginTop + lineWidth + marginBottom |
| `spacer` | the specified mm/px value |
| `hiddenText` | 0 |
| `table` | marginTop + headerRowHeight + sum(dataRowHeights) + marginBottom |
| `image` | marginTop + paddingTop + imageHeightMm + captionHeight + paddingBottom + marginBottom |
| `block` | sum of children deltas (+ spaceAfter if defined) |

Where:
- `lineHeightMm = (fontSize × 25.4/72) × lineHeight` (font points → mm × multiplier)
- `marginBottomPx` converts via `× 25.4/96`
- `lineCount` is determined by jsPDF's text wrapping at the available width

When `cursorY + requiredHeight > contentBottomY`, a page break occurs and the cursor resets to `contentTopY`.

---

## Minimal working example

**Theme:**
```js
module.exports = {
  name: "Minimal",
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
    "title": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 18,
      color: [0, 0, 0],
      lineHeight: 1.2,
      align: "center",
      marginBottomPx: 8,
    },
    "body": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [50, 50, 50],
      lineHeight: 1.4,
      marginBottomPx: 4,
    },
    "rule": {
      color: [200, 200, 200],
      lineWidth: 0.3,
      marginBottomPx: 6,
    },
  },
};
```

**Source:**
```json
{
  "operations": [
    { "type": "text", "label": "title", "text": "Hello World" },
    { "type": "divider", "label": "rule" },
    {
      "type": "text",
      "label": "body",
      "text": [
        "First paragraph of content.",
        "Second paragraph of content."
      ]
    }
  ]
}
```

**Render:**
```js
const { renderDocument } = require("./index");
const theme = require("./my-theme");
const source = require("./my-source.json");

renderDocument({ source, theme, outputPath: "output.pdf" });
```

---

## Tutorial: Building a layout from scratch

This walks through creating a conference talk summary - a document with a title, speaker info, a divider, body paragraphs, key takeaways as bullets, and a pullquote. Then it adds a footer on every page.

### Step 1: Decide what your document needs

Sketch the elements:

```
  TALK TITLE (big, centered)
  Speaker Name                    March 2026
  ──────────────────────────────────────────
  Body paragraph
  Body paragraph
  Body paragraph

  Key Takeaways
  - Bullet one
  - Bullet two

  ┌──────────────────────────────────────┐
  │ "A compelling quote from the talk."  │
  │                    - Speaker Name    │
  └──────────────────────────────────────┘

  ──────────────────────────────────────────
  Conference Name                    Page 1
```

Each distinct visual element needs its own label. Count them:

1. Title text → `talk.title`
2. Speaker name (left) → `talk.meta.left`
3. Date (right) → `talk.meta.right`
4. Section divider → `talk.rule`
5. Body paragraphs → `talk.body`
6. Section heading → `talk.heading`
7. Bullet text → `talk.body` (reuse - same style)
8. Bullet marker → `talk.marker`
9. Quote text → `talk.quote`
10. Quote attribution → `talk.quote.attribution`
11. Footer divider → `talk.footer.rule`
12. Footer left text → `talk.footer.left`
13. Footer right text → `talk.footer.right`

### Step 2: Build the theme - page first

Start with the page config. Pick margins, background, and defaults.

```js
module.exports = {
  name: "Conference Talk Summary",

  page: {
    format: "a4",
    orientation: "portrait",
    unit: "mm",
    marginTopMm: 22,
    marginBottomMm: 22,
    marginLeftMm: 24,
    marginRightMm: 24,
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
```

### Step 3: Build the theme - define every label

Each label is a complete style definition. The core reads exactly what you write - no fallbacks, no inheritance between labels. If a label needs `fontFamily`, you write `fontFamily`.

```js
  labels: {
    // ── Title ──
    "talk.title": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 20,
      color: [20, 20, 20],
      lineHeight: 1.2,
      align: "center",
      marginBottomPx: 6,
    },

    // ── Speaker row ──
    "talk.meta.left": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 100, 100],
      lineHeight: 1.2,
      marginBottomPx: 4,
    },
    "talk.meta.right": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 100, 100],
      lineHeight: 1.2,
      marginBottomPx: 4,
    },

    // ── Rules ──
    "talk.rule": {
      color: [180, 180, 180],
      lineWidth: 0.3,
      marginBottomPx: 8,
    },

    // ── Body + bullets share the same style ──
    "talk.body": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [40, 40, 40],
      lineHeight: 1.45,
      align: "justify",
      marginBottomPx: 5,
    },

    // ── Section heading ──
    "talk.heading": {
      fontFamily: "helvetica",
      fontStyle: "bold",
      fontSize: 12,
      color: [20, 20, 20],
      lineHeight: 1.2,
      marginTopPx: 8,
      marginBottomPx: 4,
    },

    // ── Bullet marker ──
    "talk.marker": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 10,
      color: [40, 40, 40],
      lineHeight: 1.45,
      marker: "-",
    },

    // ── Pullquote ──
    "talk.quote": {
      fontFamily: "helvetica",
      fontStyle: "italic",
      fontSize: 11,
      color: [30, 30, 30],
      lineHeight: 1.4,
      backgroundColor: [245, 245, 245],
      paddingMm: 4,
      marginTopPx: 6,
    },
    "talk.quote.attribution": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 9,
      color: [100, 100, 100],
      lineHeight: 1.2,
      align: "right",
      paddingLeftMm: 4,
      paddingRightMm: 4,
      paddingBottomMm: 4,
    },

    // ── Footer ──
    "talk.footer.rule": {
      color: [200, 200, 200],
      lineWidth: 0.2,
      marginBottomPx: 3,
    },
    "talk.footer.left": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 7.5,
      color: [140, 140, 140],
      lineHeight: 1.2,
    },
    "talk.footer.right": {
      fontFamily: "helvetica",
      fontStyle: "normal",
      fontSize: 7.5,
      color: [140, 140, 140],
      lineHeight: 1.2,
    },
  },
};
```

**Key point:** the label name is just a string. The JSON source references it by that exact string. The core looks up the label, gets the style, and does the math. If the label is missing, the core throws - no silent fallbacks.

### Step 4: Write the source JSON

The source contains only content. Every operation says _what_ to render and _which label_ controls its appearance. The source never says _how_ to render.

```json
{
  "pageTemplates": {
    "footer": [
      { "type": "divider", "label": "talk.footer.rule" },
      {
        "type": "row",
        "leftLabel": "talk.footer.left",
        "rightLabel": "talk.footer.right",
        "leftText": "DevConf 2026 - Talk Summaries",
        "rightText": "Page {{page}}"
      }
    ]
  },
  "sections": [
    {
      "type": "section",
      "content": [
        { "type": "text", "label": "talk.title", "text": "Rethinking State Management in Large Applications" },
        {
          "type": "row",
          "leftLabel": "talk.meta.left",
          "rightLabel": "talk.meta.right",
          "leftText": "By Jordan Lee",
          "rightText": "March 14, 2026"
        },
        { "type": "divider", "label": "talk.rule" }
      ]
    },
    {
      "type": "section",
      "content": [
        {
          "type": "text",
          "label": "talk.body",
          "text": [
            "The talk opened with a survey of current state management patterns and their failure modes at scale. Most frameworks solve the easy case well but introduce friction the moment the dependency graph becomes non-trivial.",
            "Lee argued that the problem is not the tools themselves but the assumption that all state belongs in the same container. The distinction between ephemeral UI state, cached server state, and derived computed state has practical consequences that most architectures ignore until it is too late.",
            "The second half of the talk demonstrated a layered approach where each state category has its own lifecycle, persistence model, and invalidation strategy."
          ]
        }
      ]
    },
    {
      "type": "section",
      "content": [
        { "type": "text", "label": "talk.heading", "text": "Key takeaways", "keepWithNext": 3 },
        {
          "type": "bullet",
          "label": "talk.body",
          "markerLabel": "talk.marker",
          "bullets": [
            "Separate ephemeral, cached, and derived state into distinct layers with independent lifecycles.",
            "Treat server cache invalidation as a first-class concern rather than an afterthought.",
            "Measure re-render cascades in production - synthetic benchmarks hide the real cost."
          ]
        }
      ]
    },
    {
      "type": "section",
      "content": [
        {
          "type": "quote",
          "label": "talk.quote",
          "text": "If your state management library needs a diagram to explain how data flows through your own application, the library has already failed.",
          "attribution": "- Jordan Lee"
        }
      ]
    }
  ]
}
```

### How the link works

Every operation in the JSON has a `label` (or `leftLabel`/`rightLabel` for rows, `markerLabel` for bullets). That string is a key into `theme.labels`. The core:

1. Looks up the label → gets the style object
2. Reads font, size, color, margins, padding from that style
3. Calculates how much space the content needs (wrapping, line height)
4. Draws the content and advances the cursor

```
Source operation:  { "type": "text", "label": "talk.body", "text": "..." }
                                        │
                                        ▼
Theme label:      "talk.body": { fontSize: 10, lineHeight: 1.45, marginBottomPx: 5, ... }
                                        │
                                        ▼
Core math:        cursor += marginTop + paddingTop + (lines × lineHeightMm) + paddingBottom + marginBottom
```

**The source decides _what_ appears. The theme decides _how_ it looks. The core does the math. Nothing else.**

### Changing the look without touching content

To make the same content look like a different document, swap the theme. As long as the new theme defines the same label names, the JSON works unchanged.

For example, to make the talk summary feel more editorial:
- Change `talk.title` to a serif font, left-aligned, 28pt
- Change `talk.body` to a serif font, 11pt, `lineHeight: 1.5`
- Change `talk.quote` to add a `leftBorder` instead of `backgroundColor`
- Change `talk.rule` to use `dashPattern: [2, 1]`

The JSON stays identical. Different theme, different PDF.

---

## Tutorial: Using custom fonts

jsPDF ships with three built-in families: `helvetica`, `courier`, and `times` (each with normal, bold, italic, bolditalic). For anything else, you embed TTF files as base64.

### Step 1: Convert TTF to base64

```bash
base64 -i Inter-Regular.ttf -o Inter-Regular.b64
base64 -i Inter-Bold.ttf -o Inter-Bold.b64
```

### Step 2: Load the base64 data in your theme

```js
const fs = require("fs");

const INTER_REGULAR = fs.readFileSync(__dirname + "/fonts/Inter-Regular.b64", "utf8");
const INTER_BOLD = fs.readFileSync(__dirname + "/fonts/Inter-Bold.b64", "utf8");

module.exports = {
  name: "Custom Font Theme",

  page: {
    // ... page config ...
    defaultText: {
      fontFamily: "Inter",       // use the custom font as default
      fontStyle: "normal",
      fontSize: 10,
      color: [0, 0, 0],
      lineHeight: 1.2,
    },
    // ... rest of page config ...
  },

  customFonts: [
    {
      family: "Inter",
      faces: [
        { style: "normal", fileName: "Inter-Regular.ttf", data: INTER_REGULAR },
        { style: "bold",   fileName: "Inter-Bold.ttf",    data: INTER_BOLD },
      ],
    },
  ],

  labels: {
    "doc.title": {
      fontFamily: "Inter",        // now usable in any label
      fontStyle: "bold",
      fontSize: 18,
      color: [0, 0, 0],
      lineHeight: 1.2,
    },
    // ...
  },
};
```

### What happens under the hood

1. `registerThemeFonts()` iterates `customFonts`
2. For each face, it calls `core.registerFont()` which does:
   - `doc.addFileToVFS(fileName, base64Data)` - loads the font data into jsPDF's virtual filesystem
   - `doc.addFont(fileName, family, style)` - registers the font under the family/style name
3. After registration, any label can use `fontFamily: "Inter"` with `fontStyle: "normal"` or `"bold"`

### Rules

- Only TTF format is supported
- The `fileName` must end in `.ttf`
- The `family` string must match exactly between `customFonts` and label `fontFamily`
- Each face needs its own file - there's no automatic bold/italic synthesis
- If you reference a font style that wasn't registered, jsPDF will throw

### Font style limitations

The built-in fonts ship with `Regular` and `Bold` faces only. There are no italic or bolditalic TTF files included. If you set `fontStyle: "italic"` with a built-in font, you will get:

```
Unable to look up font label for font 'Inter', 'italic'
```

To use italic text, you need a font that includes an italic TTF file, registered as a separate face in `customFonts`.

---

## Built-in fonts

The package ships with 20 pre-embedded Google Fonts as base64-encoded TTF files. No need to convert fonts yourself.

**Sans-serif:** Inter, Roboto, Open Sans, Montserrat, Lato, Raleway, Nunito, Work Sans, IBM Plex Sans, PT Sans, Oswald

**Serif:** Merriweather, Lora, Playfair Display, Crimson Text, Libre Baskerville, Source Serif 4

**Monospace:** Fira Code, JetBrains Mono, Source Code Pro

### Usage

```js
const INTER = require("h17-sspdf/fonts/inter.js");

module.exports = {
  name: "My Theme",

  customFonts: [
    {
      family: "Inter",
      faces: [
        { style: "normal", fileName: "Inter-Regular.ttf", data: INTER.Regular },
        { style: "bold", fileName: "Inter-Bold.ttf", data: INTER.Bold },
      ],
    },
  ],

  // now use fontFamily: "Inter" in any label
  labels: {
    "doc.body": {
      fontFamily: "Inter",
      fontStyle: "normal",
      fontSize: 10,
      color: [40, 40, 40],
      lineHeight: 1.4,
    },
  },
};
```

The exported properties are `Regular` and `Bold` (capitalized). Every built-in font file exports these two keys.

### Available font files

| Font | Require path |
|---|---|
| Inter | `h17-sspdf/fonts/inter.js` |
| Roboto | `h17-sspdf/fonts/roboto.js` |
| Open Sans | `h17-sspdf/fonts/open-sans.js` |
| Montserrat | `h17-sspdf/fonts/montserrat.js` |
| Lato | `h17-sspdf/fonts/lato.js` |
| Raleway | `h17-sspdf/fonts/raleway.js` |
| Nunito | `h17-sspdf/fonts/nunito.js` |
| Work Sans | `h17-sspdf/fonts/work-sans.js` |
| IBM Plex Sans | `h17-sspdf/fonts/ibm-plex-sans.js` |
| PT Sans | `h17-sspdf/fonts/pt-sans.js` |
| Oswald | `h17-sspdf/fonts/oswald.js` |
| Merriweather | `h17-sspdf/fonts/merriweather.js` |
| Lora | `h17-sspdf/fonts/lora.js` |
| Playfair Display | `h17-sspdf/fonts/playfair-display.js` |
| Crimson Text | `h17-sspdf/fonts/crimson-text.js` |
| Libre Baskerville | `h17-sspdf/fonts/libre-baskerville.js` |
| Source Serif 4 | `h17-sspdf/fonts/source-serif-4.js` |
| Fira Code | `h17-sspdf/fonts/fira-code.js` |
| JetBrains Mono | `h17-sspdf/fonts/jetbrains-mono.js` |
| Source Code Pro | `h17-sspdf/fonts/source-code-pro.js` |

You can also list available fonts from the CLI:

```bash
npx h17-sspdf --fonts
```

---

## Vector shapes

The engine includes 20 vector shapes rendered directly via jsPDF drawing primitives. These bypass text encoding entirely, so they work regardless of font or character support.

### Available shapes

**Bullets:** `arrow`, `circle`, `square`, `diamond`, `triangle`, `dash`, `chevron`

**Decorators:** `doubleColon`, `commentSlash`, `hashComment`, `bracketChevron`, `treeBranch`, `terminalPrompt`

**Symbols:** `checkmark`, `cross`, `star`, `plus`, `minus`, `warning`, `infoCircle`

### Using shapes as bullet markers

Shapes work through the existing `bullet` operation. The theme label decides whether the marker is text or a vector shape. The source JSON does not change.

**Theme:**

```js
labels: {
  "doc.marker.arrow": {
    shape: "arrow",
    shapeColor: [0, 128, 255],
    shapeSize: 0.8,
    textIndentMm: 2,
  },
  "doc.body": {
    fontFamily: "helvetica",
    fontStyle: "normal",
    fontSize: 10,
    color: [40, 40, 40],
    lineHeight: 1.4,
  },
}
```

**Source:**

```json
{
  "type": "bullet",
  "label": "doc.body",
  "markerLabel": "doc.marker.arrow",
  "bullets": ["First point", "Second point"]
}
```

The core calculates the text indent from the shape's known width (defined in `core/shapes.js`) plus the label's `textIndentMm`. All positioning is exact, derived from the shape width constants.

### Programmatic usage

For custom plugins or advanced rendering, shapes can be called directly:

```js
const { renderShape, getShapeWidth } = require("h17-sspdf/core/shapes");

// Draw a shape at position (x, y) aligned to text baseline
renderShape("arrow", doc, x, baseline, [0, 128, 255], 0.8, fontSize);

// Get the shape's width in mm for spacing calculations
const widthMm = getShapeWidth("arrow", 0.8);
```

Parameters: `renderShape(name, doc, x, y, color, size, fontSizePt)`

The shape centers vertically at half the font height above the baseline, so it aligns with adjacent text.

---

## Colors

All colors in the engine are RGB arrays with values 0-255:

```js
color: [255, 0, 128],              // pink
backgroundColor: [18, 18, 26],     // dark background
borderColor: [200, 200, 200],      // light gray border
```

Common values:
- White: `[255, 255, 255]`
- Black: `[0, 0, 0]`
- Gray: `[128, 128, 128]`

This applies to all color properties: `color`, `backgroundColor`, `borderColor`, `altRowColor`, `shapeColor`, and all per-edge border color overrides.

---

## Operation quick reference

| Type | Required fields | Optional fields |
|---|---|---|
| `text` | `label`, `text` | `align`, `keepWithNext`, `wrap`, `advance` |
| `row` | `leftLabel`, `rightLabel`, `leftText`, `rightText` | `xLeftMm`, `xRightMm` |
| `bullet` | `label`, `text`/`items`/`bullets` | `markerLabel`, `marker`, `textIndentMm` |
| `divider` | `label` | `x1Mm`, `x2Mm` |
| `table` | `label`, `columns`, `rows` | `headerLabel`, `xMm`, `maxWidthMm`, border/padding overrides |
| `image` | `src` | `width`, `widthMm`, `heightMm`, `label`, `caption`, `captionLabel` |
| `spacer` | `mm` or `px` or `label` | - |
| `block` | `children`/`content`/`items` | `label`, `keepTogether`, `spaceAfterMm`/`Px`/`Label` |
| `section` | `content` | `label`, `keepTogether` |
| `quote` | `label`, `text` | `attribution`, `attributionLabel` |
| `hiddenText` | `label`, `text` | - |

Every operation also accepts `xMm` and `maxWidthMm` to override the theme margins for that operation only.

---

## Table labels pattern

For tables, define two labels: one for data cells, one for headers. The shared constants file `examples/themes/table.js` provides base styles you can spread and override:

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

The spread gives you sensible defaults for `cellPaddingMm`, `borderColor`, border widths, `altRowColor`, and font settings. Override the properties you want to customize.

---

## Common patterns

### Reusing labels across operation types

A bullet's text style and a paragraph can share the same label. The label just defines how text looks - the operation type decides the layout.

```json
{ "type": "text", "label": "doc.body", "text": "A paragraph." }
{ "type": "bullet", "label": "doc.body", "markerLabel": "doc.marker", "text": "A bullet." }
```

Both render at the same font size, color, and line height. The bullet just adds a marker and indent.

### Keeping headings with content

Use `keepWithNext` to prevent a heading from being orphaned at the bottom of a page:

```json
{ "type": "text", "label": "doc.heading", "text": "Section Title", "keepWithNext": 3 }
{ "type": "text", "label": "doc.body", "text": "First paragraph." }
{ "type": "text", "label": "doc.body", "text": "Second paragraph." }
{ "type": "text", "label": "doc.body", "text": "Third paragraph." }
```

`keepWithNext: 3` means: measure me + the next 3 operations as a group. If the group doesn't fit on this page, move the whole group to the next page.

### Repeating footers with page numbers

```json
{
  "pageTemplates": {
    "footer": [
      { "type": "divider", "label": "doc.footer.rule" },
      {
        "type": "row",
        "leftLabel": "doc.footer.left",
        "rightLabel": "doc.footer.right",
        "leftText": "Document Title",
        "rightText": "Page {{page}}"
      }
    ],
    "footerHeightMm": 10
  }
}
```

The `{{page}}` token resolves to the current page number. The footer renders on every page, including page 1.

### Pullquotes with background

The `quote` type creates a block. If the quote's label has `backgroundColor`, the background wraps the entire quote + attribution:

```js
// Theme
"pullquote": {
  fontFamily: "helvetica",
  fontStyle: "italic",
  fontSize: 11,
  color: [30, 30, 30],
  lineHeight: 1.4,
  backgroundColor: [245, 245, 240],
  paddingMm: 4,
},
"pullquote.attribution": {
  fontFamily: "helvetica",
  fontStyle: "normal",
  fontSize: 9,
  color: [100, 100, 100],
  lineHeight: 1.2,
  align: "right",
  paddingLeftMm: 4,
  paddingRightMm: 4,
  paddingBottomMm: 4,
},
```

```json
{
  "type": "quote",
  "label": "pullquote",
  "text": "The quoted text.",
  "attribution": "- Author"
}
```

The attribution label defaults to `label + ".attribution"` - so `"pullquote"` automatically looks for `"pullquote.attribution"`. You can override with `attributionLabel`.

### Text array expansion

Instead of repeating the same operation for multiple paragraphs:

```json
{
  "type": "text",
  "label": "doc.body",
  "text": [
    "First paragraph.",
    "Second paragraph.",
    "Third paragraph."
  ]
}
```

Each string becomes its own text operation with the same label, including independent wrapping, margins, and page break handling. Same pattern works for `bullet` with the `bullets` array key.

### Preventing page breaks from cutting content

The engine breaks pages automatically when the cursor reaches the bottom margin. To prevent a page break from splitting related content, you must declare the parent-child relationship in the JSON using nesting.

**`keepWithNext`** - keeps a fixed number of sequential operations together:
```json
{ "type": "text", "label": "heading", "text": "Title", "keepWithNext": 2 }
{ "type": "text", "label": "body", "text": "First paragraph." }
{ "type": "text", "label": "body", "text": "Second paragraph." }
```
The heading + next 2 operations are measured as a group. If the group doesn't fit, all three move to the next page.

**`block` with `keepTogether`** - keeps an entire nested group together:
```json
{
  "type": "block",
  "keepTogether": true,
  "children": [
    { "type": "text", "label": "card.title", "text": "Card heading" },
    { "type": "text", "label": "card.body", "text": "Card content." },
    { "type": "divider", "label": "card.rule" }
  ]
}
```
The entire block is measured. If it doesn't fit on the current page, the whole block moves to the next page.

**`section`** - groups content but allows page breaks inside:
```json
{
  "type": "section",
  "content": [
    { "type": "text", "label": "heading", "text": "Section Title", "keepWithNext": 1 },
    { "type": "text", "label": "body", "text": "Long content that can break across pages." }
  ]
}
```
Sections default to `keepTogether: false`. Use them for logical grouping without forcing everything onto one page. Use `keepWithNext` on the heading to at least keep it with the first paragraph.

### Labels: theme defines, JSON selects

A theme can define any number of labels. The JSON only uses the ones it needs. **Order of labels in the theme doesn't matter.** Only the labels referenced by the JSON's operations are used - the rest are ignored.

```js
// Theme defines 10 labels
labels: {
  "news.headline": { ... },
  "news.body": { ... },
  "news.byline": { ... },
  "news.footer": { ... },
  // ... 6 more
}
```

```json
// Source only uses 3 of them - that's fine
{ "type": "text", "label": "news.headline", "text": "..." }
{ "type": "text", "label": "news.body", "text": "..." }
{ "type": "text", "label": "news.body", "text": "..." }
```

The rule: if a label is used in the JSON, it **must** exist in the theme. If a label exists in the theme but isn't used in the JSON, nothing happens - it's just available. This means you can build a single theme with labels for many document types and reuse it across different sources.

---

## CLI

Render a source JSON + theme into a PDF from the command line.

```bash
node cli.js --source <file.json> --theme <name|path> --output <file.pdf>
```

### Options

| Flag | Short | Description |
|---|---|---|
| `--source` | `-s` | Path to source JSON file (or pipe via stdin) |
| `--theme` | `-t` | Built-in theme name or path to a `.js` theme file |
| `--output` | `-o` | Output PDF path (default: `output/cli-output.pdf`) |
| `--help` | `-h` | Show help |

### Built-in themes

The CLI auto-discovers themes in `examples/themes/`. Use just the name:

```bash
node cli.js -s my-source.json -t newsprint -o output/my-newspaper.pdf
node cli.js -s my-source.json -t editorial -o output/my-magazine.pdf
node cli.js -s my-source.json -t default -o output/my-doc.pdf
```

Available: `default`, `editorial`, `newsprint`, `corporate`, `ceremony`, `program`.

### Custom theme file

Point to any `.js` file that exports a theme object:

```bash
node cli.js -s my-source.json -t ./my-custom-theme.js -o output/custom.pdf
```

### Piping JSON via stdin

```bash
cat my-source.json | node cli.js -t default -o output/piped.pdf
```

Or generate JSON dynamically:

```bash
echo '{"operations":[{"type":"text","label":"doc.title","text":"Hello"}]}' | node cli.js -t default -o output/hello.pdf
```

### Examples

Render the newspaper layout:
```bash
node cli.js -s examples/sources/source-newspaper-hugopalma-arc.json -t newsprint -o output/newspaper.pdf
```

Render the event program:
```bash
node cli.js -s examples/sources/source-event-program.json -t program -o output/program.pdf
```

Render all examples at once:
```bash
node examples/generate-all.js
```

---

## Plugins

Plugins extend the operation set with custom operation types. The engine dispatches any unrecognized `type` to the registered plugin for that type.

### Registering a plugin

```js
const { registerPlugin, plugins } = require("./index");

registerPlugin("chart", plugins.chart);
```

After registration, any source operation with `{ "type": "chart", ... }` is routed to `plugins.chart`.

### Plugin contract

A plugin is an object with:

```js
{
  // Called during rendering. Must be synchronous.
  render(ctx) {
    const { core, operation, bounds, theme, index } = ctx;
    // core     - PDFCore instance (cursor, drawImage, drawText, etc.)
    // operation - the raw operation object from the source
    // bounds   - { left, right } content area in mm
    // theme    - resolved runtime theme
    // index    - operation index string (for error messages)
  },

  // Optional. Returns estimated height in mm for keepWithNext/page break math.
  estimateHeight(ctx) {
    return 80;
  },

  // Optional. Called before rendering to validate the operation. Throw to reject.
  validate(operation) {
    if (!operation.requiredField) throw new Error("...");
  },
}
```

`render` must be synchronous. For plugins that need async work (e.g., network fetches, canvas rendering), pre-render before calling `renderDocument`, see the Chart plugin section below.

---

## Chart plugin

The built-in chart plugin renders Chart.js charts server-side via `chartjs-node-canvas` and embeds the result as a PNG image.

### Requirements

The chart plugin requires the `canvas` npm package (native C++ addon). Chart.js and chartjs-node-canvas are vendored and ship with the engine.

```bash
npm install canvas
```

### Registration

```js
const { renderDocument, registerPlugin, plugins } = require("./index");

registerPlugin("chart", plugins.chart);
```

### Pre-rendering

The chart plugin is synchronous during `renderDocument`, but Chart.js rendering is async. You must call `plugins.chart.preRender(operation)` before `renderDocument`. This renders the chart to a PNG buffer and caches it on the operation object.

```js
const theme = require("./my-theme");

const chartOp = {
  type: "chart",
  chartType: "bar",
  widthMm: 160,
  heightMm: 90,
  canvasWidth: 1600,
  canvasHeight: 900,
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [{ label: "Revenue", data: [120000, 145000, 138000, 172000] }]
  },
  options: {
    scales: { y: { beginAtZero: true } },
    layout: { padding: { bottom: 10 } }
  }
};

async function main() {
  await plugins.chart.preRender(chartOp);

  renderDocument({
    source: { sections: [{ type: "section", content: [chartOp] }] },
    theme,
    outputPath: "output/chart.pdf",
  });
}

main();
```

`preRender` mutates the operation in place, attaching `operation._buf` (a PNG Buffer). The sync `render` step reads that buffer and calls `core.drawImage`.

### Operation fields

| Field | Required | Type | Description |
|---|---|---|---|
| `chartType` | yes | string | Chart.js type: `"bar"`, `"line"`, `"doughnut"`, etc. |
| `data` | yes | object | Chart.js `data` config (`labels` + `datasets`) |
| `widthMm` | no | number | Width in the PDF in mm (default: content area width) |
| `heightMm` | no | number | Height in the PDF in mm (default: 80) |
| `canvasWidth` | no | number | Canvas render width in pixels (default: 1600) |
| `canvasHeight` | no | number | Canvas render height in pixels (default: 800) |
| `options` | no | object | Chart.js `options` object. `responsive: false` and `animation: false` are injected automatically. |
| `xMm` | no | number | Left edge in mm (default: content left margin) |

### Resolution

`canvasWidth` / `canvasHeight` control sharpness. `widthMm` / `heightMm` control the slot size in the PDF. Keep their aspect ratio consistent:

```
canvasWidth / canvasHeight  ≈  widthMm / heightMm
```

For a 160mm × 90mm slot, `canvasWidth: 1600, canvasHeight: 900` gives a clean 10px/mm density, sharp at any reasonable zoom.

### Axis label clipping

Chart.js does not automatically reserve space for tick labels outside the chart area. If x-axis labels are cut off, add bottom padding via `options.layout`:

```js
options: {
  layout: { padding: { bottom: 10 } }
}
```

### Writing a custom plugin

Any module that implements the plugin contract can be registered:

```js
const myPlugin = {
  render({ core, operation, bounds }) {
    const widthMm = operation.widthMm || (bounds.right - bounds.left);
    const heightMm = operation.heightMm || 40;
    const x = bounds.left;

    core.ensureSpace(heightMm);
    const y = core.getCursorY();
    // ... draw using core.doc (the jsPDF instance) ...
    core.setCursorY(y + heightMm);
  },

  estimateHeight({ operation }) {
    return (operation.heightMm || 40) + 4;
  },
};

registerPlugin("myType", myPlugin);
```

`core.doc` is the raw jsPDF instance. Anything jsPDF can draw, a plugin can draw.
