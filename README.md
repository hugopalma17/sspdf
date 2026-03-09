# SuperSimplePDF

[![npm](https://img.shields.io/npm/v/h17-sspdf)](https://www.npmjs.com/package/h17-sspdf)
[![Socket Badge](https://socket.dev/api/badge/npm/package/h17-sspdf)](https://socket.dev/npm/package/h17-sspdf)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Node](https://img.shields.io/node/v/h17-sspdf)](https://www.npmjs.com/package/h17-sspdf)
[![Publish](https://github.com/hugopalma17/sspdf/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/hugopalma17/sspdf/actions/workflows/npm-publish.yml)

Define the layout once. Feed it JSON. The core is blind to both and does all the math.

The theme does not know what the content says. The JSON does not know how it looks. The core does not know it is rendering a newspaper, an invoice, or a certificate. Three blind components, one coherent output.

```
Source JSON  +  Theme  =  PDF
```

## Install

```bash
npm install h17-sspdf
```

## The problem it solves

Generating PDFs imperatively means tracking the cursor yourself. Every element you place shifts everything below it. Line wrapping, page breaks, font resets — all manual.

This engine inverts that. You describe *what* to render and *how it looks*. The cursor, the math, the page breaks happen automatically.

## How it works

Every operation has a `type` and a `label`. The label maps to a style in the theme. The engine looks up the style, lays out the content, advances the cursor by an exact calculated amount, and moves to the next operation.

```
operation → label → theme style → layout → cursor advance → next operation
```

Page breaks happen automatically when content reaches the bottom margin. Style resets after every operation — nothing leaks.

## Quick start

```js
const { renderDocument } = require('h17-sspdf');

renderDocument({
  source: {
    operations: [
      { type: 'text', label: 'doc.title', text: 'My Document' },
      { type: 'divider', label: 'doc.rule' },
      { type: 'text', label: 'doc.body', text: 'First paragraph.' }
    ]
  },
  theme: {
    name: 'My Theme',
    page: {
      format: 'a4',
      orientation: 'portrait',
      unit: 'mm',
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 20,
      marginRightMm: 20,
      backgroundColor: [255, 255, 255],
      defaultText:      { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 10, color: [0,0,0], lineHeight: 1.4 },
      defaultStroke:    { color: [200,200,200], lineWidth: 0.3, lineCap: 'butt', lineJoin: 'miter' },
      defaultFillColor: [255, 255, 255],
    },
    labels: {
      'doc.title': { fontFamily: 'helvetica', fontStyle: 'bold', fontSize: 22, color: [0,0,0], lineHeight: 1.2, marginBottomMm: 4 },
      'doc.rule':  { color: [200,200,200], lineWidth: 0.3, marginBottomMm: 4 },
      'doc.body':  { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 10, color: [40,40,40], lineHeight: 1.5 },
    }
  },
  outputPath: 'output/doc.pdf'
});
```

## Building a layout

### The newspaper front page

The most complex built-in layout is a newspaper front page. It has a masthead, edition line, heavy rule, headline hierarchy, byline, multi-paragraph body, pull quote, stat scoreboard, and a footer that repeats on every page. Here is how it is built.

#### Page template (repeating footer)

Declare it once. The engine stamps it on every page at the specified Y position.

```json
{
  "pageTemplates": {
    "footer": [
      { "type": "divider", "label": "news.footer.rule", "x1Mm": 18, "x2Mm": 192 },
      {
        "type": "row",
        "leftLabel":  "news.footer.left",
        "rightLabel": "news.footer.right",
        "leftText":   "The Meridian Times | Civic Desk",
        "rightText":  "Page {{page}}",
        "xLeftMm": 18,
        "xRightMm": 192
      }
    ],
    "footerHeightMm": 8,
    "footerStartMm": 284
  }
}
```

`{{page}}` is replaced with the current page number at render time.

#### Masthead block

The masthead, edition row, heavy rule, kicker, headline, deck, and byline are all inside a `section`. A section allows page breaks inside it but groups the content logically.

```json
{
  "type": "section",
  "content": [
    { "type": "text",  "label": "news.masthead", "text": "The Meridian Times", "xMm": 18, "maxWidthMm": 174 },
    {
      "type": "row",
      "leftLabel":  "news.edition.left",
      "rightLabel": "news.edition.right",
      "leftText":   "Saturday, March 7, 2026",
      "rightText":  "Late City Edition",
      "xLeftMm": 18,
      "xRightMm": 192
    },
    { "type": "divider", "label": "news.rule.heavy", "x1Mm": 18, "x2Mm": 192 },
    { "type": "text", "label": "news.kicker",   "text": "Infrastructure & Society", "xMm": 18, "maxWidthMm": 174 },
    { "type": "text", "label": "news.headline", "text": "Local Governments Are Finally Rewriting How They Publish Public Records", "xMm": 18, "maxWidthMm": 174 },
    { "type": "text", "label": "news.deck",     "text": "A quiet wave of procurement reform...", "xMm": 18, "maxWidthMm": 174 },
    {
      "type": "row",
      "leftLabel":  "news.byline",
      "rightLabel": "news.timestamp",
      "leftText":   "By Marta Ruiz",
      "rightText":  "Updated 6:40 PM",
      "xLeftMm": 18,
      "xRightMm": 192
    },
    { "type": "divider", "label": "news.rule.light", "x1Mm": 18, "x2Mm": 192 }
  ]
}
```

`xMm` and `maxWidthMm` override the page margins for this operation. This is how you position content independently of the theme margins.

#### Multi-paragraph body text

Pass `text` as an array. Each string becomes a paragraph with the label's spacing applied between them.

```json
{
  "type": "text",
  "label": "news.body",
  "text": [
    "First paragraph.",
    "Second paragraph.",
    "Third paragraph."
  ],
  "xMm": 18,
  "maxWidthMm": 174
}
```

#### Keeping a heading with its content

`keepWithNext: N` tells the engine this operation must stay on the same page as the next N operations. Use it on section headings so they never strand at the bottom of a page.

```json
{ "type": "text", "label": "news.section.title", "text": "Inside the shift", "keepWithNext": 3 }
```

#### Stat scoreboard

A repeating pattern of `row` + `text` pairs. The row carries the label/value, the text below carries the annotation.

```json
{
  "type": "row",
  "leftLabel":  "news.stat.label",
  "rightLabel": "news.stat.value",
  "leftText":   "Harbor City planning notices",
  "rightText":  "42% faster"
},
{
  "type": "text",
  "label": "news.stat.note",
  "text": "Review time fell after zoning notices moved to a single contract."
}
```

#### Pull quote

```json
{
  "type": "quote",
  "label": "news.pullquote",
  "text": "When the format becomes a system instead of a template, agencies stop re-solving the same layout problem every week.",
  "attribution": "— Elena Ward, public records modernization lead",
  "xMm": 22,
  "maxWidthMm": 166
}
```

`xMm` and `maxWidthMm` indent it from the body column — the indentation is in the source, not the theme.

#### Hidden text (ATS / search metadata)

Invisible in the rendered PDF, present in text extraction.

```json
{
  "type": "hiddenText",
  "label": "news.hidden.tags",
  "text": "public records procurement modernization searchable notices"
}
```

---

### The theme labels for this layout

Each label the source uses must exist in the theme. These are the ones the newspaper source uses:

```js
labels: {
  'news.masthead':     { fontFamily: 'custom', fontStyle: 'bold', fontSize: 36, color: [0,0,0], lineHeight: 1.1, marginBottomMm: 2 },
  'news.edition.left': { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 8, color: [80,80,80], lineHeight: 1 },
  'news.edition.right':{ fontFamily: 'helvetica', fontStyle: 'italic', fontSize: 8, color: [80,80,80], lineHeight: 1, marginBottomMm: 1 },
  'news.rule.heavy':   { color: [0,0,0], lineWidth: 1.2, marginBottomMm: 2 },
  'news.rule.light':   { color: [160,160,160], lineWidth: 0.3, marginBottomMm: 3 },
  'news.kicker':       { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 9, color: [100,100,100], lineHeight: 1, textTransform: 'uppercase', marginBottomMm: 1 },
  'news.headline':     { fontFamily: 'custom', fontStyle: 'bold', fontSize: 28, color: [0,0,0], lineHeight: 1.15, marginBottomMm: 3 },
  'news.deck':         { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 11, color: [40,40,40], lineHeight: 1.4, marginBottomMm: 2 },
  'news.byline':       { fontFamily: 'helvetica', fontStyle: 'bold', fontSize: 8, color: [0,0,0], lineHeight: 1 },
  'news.timestamp':    { fontFamily: 'helvetica', fontStyle: 'italic', fontSize: 8, color: [80,80,80], lineHeight: 1, marginBottomMm: 2 },
  'news.body':         { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 10, color: [20,20,20], lineHeight: 1.55, marginBottomMm: 3 },
  'news.section.title':{ fontFamily: 'helvetica', fontStyle: 'bold', fontSize: 11, color: [0,0,0], lineHeight: 1.2, marginTopMm: 3, marginBottomMm: 1 },
  'news.pullquote':    { fontFamily: 'custom', fontStyle: 'italic', fontSize: 13, color: [30,30,30], lineHeight: 1.5,
                         leftBorder: { widthMm: 1.5, color: [0,0,0], paddingMm: 4 }, marginTopMm: 4, marginBottomMm: 4 },
  'news.stat.label':   { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 9, color: [40,40,40], lineHeight: 1 },
  'news.stat.value':   { fontFamily: 'helvetica', fontStyle: 'bold', fontSize: 9, color: [0,0,0], lineHeight: 1 },
  'news.stat.note':    { fontFamily: 'helvetica', fontStyle: 'italic', fontSize: 8, color: [100,100,100], lineHeight: 1.3, marginBottomMm: 3 },
  'news.brief.text':   { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 10, color: [20,20,20], lineHeight: 1.5 },
  'news.brief.marker': { color: [0,0,0] },
  'news.footer.rule':  { color: [160,160,160], lineWidth: 0.3, marginBottomMm: 1 },
  'news.footer.left':  { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 7, color: [120,120,120], lineHeight: 1 },
  'news.footer.right': { fontFamily: 'helvetica', fontStyle: 'normal', fontSize: 7, color: [120,120,120], lineHeight: 1 },
  'news.hidden.tags':  { fontSize: 0.1, color: [255,255,255] },
}
```

---

## Operation types

| Type | Purpose | Key fields |
|------|---------|------------|
| `text` | Wrapped text block | `label`, `text` (string or array of strings) |
| `row` | Left/right pair on one line | `leftLabel`, `rightLabel`, `leftText`, `rightText` |
| `bullet` | Marker + wrapped text | `label`, `markerLabel`, `bullets` (array) |
| `divider` | Horizontal rule | `label`, `x1Mm`, `x2Mm` |
| `spacer` | Vertical gap | `mm`, `px`, or `label` |
| `hiddenText` | Invisible text | `label`, `text` |
| `quote` | Blockquote with attribution | `label`, `text`, `attribution` |
| `block` | Group children, optional background + border | `children`, `keepTogether` |
| `section` | Logical group, allows breaks inside | `content` |

### Position overrides

Any operation accepts `xMm` and `maxWidthMm` to override the theme margins for that operation only.

### Page break control

- `keepWithNext: N` — keep this operation on the same page as the next N operations
- `block` with `keepTogether: true` — all children stay on the same page

---

## Label style properties

```js
{
  // Typography
  fontFamily: 'helvetica',       // or any registered custom font family
  fontStyle: 'normal',           // 'normal' | 'bold' | 'italic' | 'bolditalic'
  fontSize: 10,                  // pt
  color: [0, 0, 0],              // RGB
  lineHeight: 1.4,               // multiplier
  textTransform: 'uppercase',    // 'uppercase' | 'lowercase' | undefined

  // Spacing
  marginTopMm: 0,
  marginBottomMm: 0,
  marginTopPx: 0,
  marginBottomPx: 0,
  paddingTopMm: 0,
  paddingBottomMm: 0,
  paddingTopPx: 0,
  paddingBottomPx: 0,

  // Dividers
  lineWidth: 0.3,

  // Container (block/section)
  backgroundColor: [245, 245, 245],
  borderColor: [200, 200, 200],
  borderWidthMm: 0.3,
  paddingMm: 4,

  // Left border accent (quote, callout)
  leftBorder: {
    widthMm: 1.5,
    color: [0, 0, 0],
    paddingMm: 4,
  },
}
```

---

## Custom fonts

Embed TTF as base64 and register in the theme:

```js
customFonts: [
  {
    family: 'Inter',
    faces: [
      { style: 'normal', fileName: 'Inter-Regular.ttf', data: '<base64>' },
      { style: 'bold',   fileName: 'Inter-Bold.ttf',    data: '<base64>' },
    ],
  },
],
```

Then use `fontFamily: 'Inter'` in any label.

---

## Chart plugin

Renders any Chart.js configuration to a PNG and embeds it in the PDF.

### Install peer dependencies

```bash
npm install chart.js chartjs-node-canvas
```

### Register

```js
const { registerPlugin, plugins } = require('h17-sspdf');
registerPlugin('chart', plugins.chart);
```

### Operation format

```json
{
  "type": "chart",
  "chartType": "bar",
  "widthMm": 160,
  "heightMm": 80,
  "canvasWidth": 1600,
  "canvasHeight": 800,
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [
      {
        "label": "Revenue",
        "data": [120000, 145000, 138000, 172000],
        "backgroundColor": "rgba(110, 158, 210, 0.80)"
      }
    ]
  },
  "options": {
    "scales": {
      "y": { "beginAtZero": true }
    }
  }
}
```

`data` and `options` are passed directly to Chart.js — the plugin does not abstract the Chart.js API. `canvasWidth`/`canvasHeight` control render resolution (default 1600×800). `widthMm`/`heightMm` control the slot size in the PDF.

---

## CLI

```bash
npx sspdf -s source.json -t theme.js -o output.pdf
```

| Flag | Short | Description |
|------|-------|-------------|
| `--source` | `-s` | Path to source JSON (or pipe via stdin) |
| `--theme` | `-t` | Path to theme `.js` file |
| `--output` | `-o` | Output PDF path |

---

## Constraints

- A4 only
- Single-line `row` cells — no multi-line column pairs
- No `{{pages}}` total page count token
- The `chart` plugin requires Node.js (`chartjs-node-canvas` is server-side only) — the core engine works in the browser if you use the jsPDF UMD build

---

Hugo Palma, 2026

Built on [jsPDF](https://github.com/parallax/jsPDF).
