/**
 * shapes.js
 * ATS-safe visual decorators rendered as vector shapes.
 *
 * All functions draw shapes that are INVISIBLE to text extraction.
 * ATS sees nothing. Humans see the decoration.
 *
 * Standard signature: (doc, x, y, color, size, pt) => void
 *   - doc: jsPDF instance
 *   - x, y: position (y is baseline of adjacent text)
 *   - color: [r, g, b] array
 *   - size: scale factor (default 1.0)
 *   - pt: font size in points — shape centers at half text height above baseline
 */

'use strict';

const PT_TO_MM = 0.3528;

// Vertical center: when pt is given, use half the font height; otherwise fall back to 1*s
function mid(y, s, pt) {
  return pt ? y - (pt * PT_TO_MM) / 2 : y - 1 * s;
}

// ============================================
// BULLET SHAPES
// ============================================

function arrow(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setFillColor(...color);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3 * s);
  doc.line(x, cy, x + 2.5 * s, cy);
  doc.triangle(
    x + 2.2 * s, cy - 0.8 * s,
    x + 2.2 * s, cy + 0.8 * s,
    x + 3.5 * s, cy,
    'F'
  );
}

function circle(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const radius = 0.6 * s;
  doc.setFillColor(...color);
  doc.circle(x + radius, cy, radius, 'F');
}

function square(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const side = 1.2 * s;
  doc.setFillColor(...color);
  doc.rect(x, cy - side / 2, side, side, 'F');
}

function diamond(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cx = x + 1.5 * s;
  const cy = mid(y, s, pt);
  const r = 0.9 * s;
  doc.setFillColor(...color);

  const topPoints = [
    [cx, cy - r], [cx - r * 0.3, cy - r * 0.3],
    [cx, cy], [cx + r * 0.3, cy - r * 0.3],
  ];
  const rightPoints = [
    [cx + r, cy], [cx + r * 0.3, cy - r * 0.3],
    [cx, cy], [cx + r * 0.3, cy + r * 0.3],
  ];
  const bottomPoints = [
    [cx, cy + r], [cx + r * 0.3, cy + r * 0.3],
    [cx, cy], [cx - r * 0.3, cy + r * 0.3],
  ];
  const leftPoints = [
    [cx - r, cy], [cx - r * 0.3, cy + r * 0.3],
    [cx, cy], [cx - r * 0.3, cy - r * 0.3],
  ];

  [topPoints, rightPoints, bottomPoints, leftPoints].forEach(petal => {
    doc.triangle(petal[0][0], petal[0][1], petal[1][0], petal[1][1], petal[2][0], petal[2][1], 'F');
    doc.triangle(petal[0][0], petal[0][1], petal[3][0], petal[3][1], petal[2][0], petal[2][1], 'F');
  });
}

function triangle(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setFillColor(...color);
  doc.triangle(
    x, cy - 0.8 * s,
    x, cy + 0.8 * s,
    x + 1.5 * s, cy,
    'F'
  );
}

function dash(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5 * s);
  doc.line(x, cy, x + 2.5 * s, cy);
}

function chevron(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.4 * s);
  doc.setLineCap('round');
  doc.line(x, cy - 0.8 * s, x + 1.2 * s, cy);
  doc.line(x + 1.2 * s, cy, x, cy + 0.8 * s);
  doc.setLineCap('butt');
}

// ============================================
// PREFIX DECORATORS
// ============================================

function doubleColon(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const dotR = 0.35 * s;
  const gap = 1.2 * s;
  const spread = 0.75 * s;
  doc.setFillColor(...color);
  doc.circle(x + dotR, cy - spread, dotR, 'F');
  doc.circle(x + dotR, cy + spread, dotR, 'F');
  doc.circle(x + dotR + gap, cy - spread, dotR, 'F');
  doc.circle(x + dotR + gap, cy + spread, dotR, 'F');
}

function commentSlash(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const h = 1.1 * s;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35 * s);
  doc.line(x + 1 * s, cy - h, x, cy + h);
  doc.line(x + 2.2 * s, cy - h, x + 1.2 * s, cy + h);
}

function hashComment(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const h = 1.1 * s;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35 * s);
  doc.line(x, cy - 0.45 * s, x + 2 * s, cy - 0.45 * s);
  doc.line(x, cy + 0.45 * s, x + 2 * s, cy + 0.45 * s);
  doc.line(x + 0.5 * s, cy - h, x + 0.3 * s, cy + h);
  doc.line(x + 1.5 * s, cy - h, x + 1.3 * s, cy + h);
}

function bracketChevron(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  const h = 1.1 * s;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35 * s);
  doc.line(x + 0.3 * s, cy - h, x, cy - h);
  doc.line(x, cy - h, x, cy + h);
  doc.line(x, cy + h, x + 0.3 * s, cy + h);
  doc.line(x + 1 * s, cy - 0.9 * s, x + 2 * s, cy);
  doc.line(x + 2 * s, cy, x + 1 * s, cy + 0.9 * s);
  doc.line(x + 2.7 * s, cy - h, x + 3 * s, cy - h);
  doc.line(x + 3 * s, cy - h, x + 3 * s, cy + h);
  doc.line(x + 3 * s, cy + h, x + 2.7 * s, cy + h);
}

function treeBranch(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.35 * s);
  doc.line(x + 0.3 * s, cy - 1.5 * s, x + 0.3 * s, cy + 1.5 * s);
  doc.line(x + 0.3 * s, cy, x + 2.5 * s, cy);
}

function terminalPrompt(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cx = x + 0.8 * s;
  const cy = mid(y, s, pt);
  const w = 0.5 * s;
  const h = 0.55 * s;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.25 * s);
  doc.setLineCap('round');

  // $ vertical stroke
  doc.line(cx, cy - 1.1 * s, cx, cy + 1.1 * s);

  // Angular S: top-right → left → down → right → down → left
  doc.line(cx + w, cy - h, cx - w, cy - h);
  doc.line(cx - w, cy - h, cx - w, cy);
  doc.line(cx - w, cy, cx + w, cy);
  doc.line(cx + w, cy, cx + w, cy + h);
  doc.line(cx + w, cy + h, cx - w, cy + h);

  doc.setLineCap('butt');

  // Chevron >
  const ax = x + 2.5 * s;
  doc.setLineWidth(0.4 * s);
  doc.line(ax, cy - 0.8 * s, ax + 1 * s, cy);
  doc.line(ax + 1 * s, cy, ax, cy + 0.8 * s);
}

// ============================================
// SYMBOL SHAPES
// ============================================

function checkmark(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45 * s);
  doc.setLineCap('round');
  doc.line(x, cy + 0.2 * s, x + 0.7 * s, cy + 1 * s);
  doc.line(x + 0.7 * s, cy + 1 * s, x + 2 * s, cy - 1 * s);
  doc.setLineCap('butt');
}

function cross(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45 * s);
  doc.setLineCap('round');
  doc.line(x, cy - 1 * s, x + 1.8 * s, cy + 1 * s);
  doc.line(x + 1.8 * s, cy - 1 * s, x, cy + 1 * s);
  doc.setLineCap('butt');
}

function star(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cx = x + 1.2 * s;
  const cy = mid(y, s, pt);
  const outer = 1.2 * s;
  const inner = 0.5 * s;
  doc.setFillColor(...color);

  const points = [];
  for (let i = 0; i < 5; i++) {
    const aOuter = (i * 72 - 90) * Math.PI / 180;
    const aInner = ((i * 72) + 36 - 90) * Math.PI / 180;
    points.push([cx + Math.cos(aOuter) * outer, cy + Math.sin(aOuter) * outer]);
    points.push([cx + Math.cos(aInner) * inner, cy + Math.sin(aInner) * inner]);
  }

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    doc.triangle(cx, cy, a[0], a[1], b[0], b[1], 'F');
  }
}

function plus(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45 * s);
  doc.line(x + 0.9 * s, cy - 1 * s, x + 0.9 * s, cy + 1 * s);
  doc.line(x, cy, x + 1.8 * s, cy);
}

function minus(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.45 * s);
  doc.line(x, cy, x + 1.8 * s, cy);
}

function warning(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cy = mid(y, s, pt);
  doc.setFillColor(...color);
  doc.triangle(
    x + 1.2 * s, cy - 1.15 * s,
    x, cy + 1.15 * s,
    x + 2.4 * s, cy + 1.15 * s,
    'F'
  );
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 1 * s, cy - 0.45 * s, 0.4 * s, 0.8 * s, 'F');
  doc.circle(x + 1.2 * s, cy + 0.75 * s, 0.2 * s, 'F');
}

function infoCircle(doc, x, y, color, size = 1, pt = 0) {
  const s = size;
  const cx = x + 1.1 * s;
  const cy = mid(y, s, pt);
  doc.setFillColor(...color);
  doc.circle(cx, cy, 1.1 * s, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy - 0.55 * s, 0.18 * s, 'F');
  doc.rect(cx - 0.12 * s, cy - 0.25 * s, 0.24 * s, 0.7 * s, 'F');
}

// ============================================
// SHAPE WIDTHS (mm) for text offset
// ============================================

const shapeWidths = {
  arrow: 4,
  circle: 2,
  square: 2,
  diamond: 3.5,
  triangle: 2.5,
  dash: 3.5,
  chevron: 2,
  doubleColon: 3.5,
  commentSlash: 3,
  hashComment: 2.5,
  bracketChevron: 4.5,
  treeBranch: 3.5,
  terminalPrompt: 5,
  checkmark: 2.5,
  cross: 2.5,
  star: 3,
  plus: 2.5,
  minus: 2.5,
  warning: 3,
  infoCircle: 2.8,
};

function getShapeWidth(shapeName, size = 1) {
  return (shapeWidths[shapeName] || 3) * size;
}

// ============================================
// REGISTRY
// ============================================

const shapes = {
  arrow, circle, square, diamond, triangle, dash, chevron,
  doubleColon, commentSlash, hashComment, bracketChevron, treeBranch, terminalPrompt,
  checkmark, cross, star, plus, minus, warning, infoCircle,
};

function renderShape(name, doc, x, y, color, size = 1, pt = 0) {
  const shapeFn = shapes[name];
  if (shapeFn) {
    shapeFn(doc, x, y, color, size, pt);
  }
}

module.exports = { shapes, shapeWidths, getShapeWidth, renderShape, PT_TO_MM };
