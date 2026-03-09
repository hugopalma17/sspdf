const fs = require("fs");
const { jsPDF } = require("jspdf");
const { pxToMm, ptToMm, resolveLineHeightMm } = require("./units");

// Style math helpers — shared between core rendering and height estimation.

function getMarginTopMm(style) {
  if (style.marginTopMm !== undefined) {
    return Number(style.marginTopMm) || 0;
  }
  if (style.marginTopPx !== undefined) {
    return pxToMm(style.marginTopPx);
  }
  return 0;
}

function getMarginBottomMm(style) {
  if (style.marginBottomMm !== undefined) {
    return Number(style.marginBottomMm) || 0;
  }
  if (style.marginBottomPx !== undefined) {
    return pxToMm(style.marginBottomPx);
  }
  return 0;
}

function getStyleMarginsMm(style) {
  return {
    top: getMarginTopMm(style),
    bottom: getMarginBottomMm(style),
  };
}

function resolvePaddingValue(mm, px, fallback) {
  if (mm !== undefined) {
    return Number(mm) || 0;
  }
  if (px !== undefined) {
    return pxToMm(px);
  }
  return fallback;
}

function getTextPaddingMm(style) {
  const allMm = style.paddingMm !== undefined ? (Number(style.paddingMm) || 0) : null;
  const allPx = style.paddingPx !== undefined ? pxToMm(style.paddingPx) : null;
  const fallback = allMm !== null ? allMm : (allPx !== null ? allPx : 0);
  return {
    top: resolvePaddingValue(style.paddingTopMm, style.paddingTopPx, fallback),
    right: resolvePaddingValue(style.paddingRightMm, style.paddingRightPx, fallback),
    bottom: resolvePaddingValue(style.paddingBottomMm, style.paddingBottomPx, fallback),
    left: resolvePaddingValue(style.paddingLeftMm, style.paddingLeftPx, fallback),
  };
}

function applyTextTransform(text, transform) {
  if (transform === "upper") {
    return text.toUpperCase();
  }
  if (transform === "lower") {
    return text.toLowerCase();
  }
  return text;
}

/**
 * jsPDF abstraction layer:
 * - page/background lifecycle
 * - cursor and pagination
 * - style application
 * - text, row, bullet, divider primitives
 */
class PDFCore {
  /**
   * @param {object} theme
   * @param {object} [theme.page]
   * @param {number} [theme.page.margin]
   * @param {string} [theme.page.format]
   * @param {string} [theme.page.orientation]
   * @param {string} [theme.page.unit]
   * @param {boolean} [theme.page.compress]
   * @param {number[]} [theme.page.backgroundColor]
   */
  constructor(theme = {}) {
    this.theme = theme;
    this.page = theme.page || {};
    this.layout = theme.layout || {};
    const baseMargin = Number(this.page.margin) || 15;
    this.marginLeftMm = this.page.marginLeftMm !== undefined
      ? (Number(this.page.marginLeftMm) || 0)
      : baseMargin;
    this.marginRightMm = this.page.marginRightMm !== undefined
      ? (Number(this.page.marginRightMm) || 0)
      : baseMargin;
    this.marginTopMm = this.page.marginTopMm !== undefined
      ? (Number(this.page.marginTopMm) || 0)
      : baseMargin;
    this.marginBottomMm = this.page.marginBottomMm !== undefined
      ? (Number(this.page.marginBottomMm) || 0)
      : baseMargin;

    this.margin = this.marginLeftMm;
    this.headerHeightMm = Number(this.page.headerHeightMm) || 0;
    this.footerHeightMm = Number(this.page.footerHeightMm) || 0;
    this.format = String(this.page.format || "a4").toLowerCase();

    if (this.format !== "a4") {
      throw new Error(`Unsupported page format "${this.page.format}". Only A4 is supported.`);
    }

    this.doc = new jsPDF({
      orientation: this.page.orientation || "portrait",
      unit: this.page.unit || "mm",
      format: this.format,
      compress: this.page.compress !== false,
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.backgroundColor = this._resolveColor(this.page.backgroundColor);
    this.lastDrawnBounds = null;
    this.defaultRenderState = this._buildDefaultRenderState(this.page);
    this.contentTopY = this.marginTopMm + this.headerHeightMm;
    this.contentBottomY = this.pageHeight - this.marginBottomMm - this.footerHeightMm;
    this.cursorY = this.contentTopY;

    const meta = this.page.metadata || {};
    this.doc.setProperties({
      title: meta.title || theme.name || "",
      subject: meta.subject || "",
      author: meta.author || "Hugo Palma",
      keywords: meta.keywords || "",
      creator: "jsPDF++ by Hugo Palma (github.com/hugopalma)",
    });

    this.paintBackground();
    this.applyDefaultRenderState();
  }

  /**
   * Register a single font face into jsPDF VFS.
   * @param {object} fontFace
   * @param {string} fontFace.family
   * @param {string} fontFace.style
   * @param {string} fontFace.fileName
   * @param {string} fontFace.data Base64 TTF content
   */
  registerFont(fontFace) {
    if (!fontFace || !fontFace.family || !fontFace.fileName || !fontFace.data) {
      throw new Error("Invalid font face registration payload");
    }
    const style = fontFace.style || "normal";
    this.doc.addFileToVFS(fontFace.fileName, fontFace.data);
    this.doc.addFont(fontFace.fileName, fontFace.family, style);
  }

  /**
   * Register multiple font faces.
   * @param {Array<object>} fontFaces
   */
  registerFonts(fontFaces = []) {
    fontFaces.forEach((face) => this.registerFont(face));
  }

  /**
   * Draw current page background.
   */
  paintBackground() {
    this.doc.setFillColor(...this.backgroundColor);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, "F");
  }

  /**
   * Force a new page and reset cursor to top margin.
   */
  addPage() {
    this.doc.addPage();
    this.paintBackground();
    this.applyDefaultRenderState();
    this.cursorY = this.contentTopY;
  }

  /**
   * Run a renderer operation in an isolated jsPDF state.
   * This prevents style leakage between labels/operations.
   * @param {Function} fn
   */
  withDocumentState(fn) {
    if (typeof fn !== "function") {
      throw new Error("withDocumentState requires a callback");
    }

    const canSaveGraphicsState = typeof this.doc.saveGraphicsState === "function"
      && typeof this.doc.restoreGraphicsState === "function";
    if (canSaveGraphicsState) {
      this.doc.saveGraphicsState();
    }

    try {
      fn();
    } finally {
      if (canSaveGraphicsState) {
        this.doc.restoreGraphicsState();
      }
      this.applyDefaultRenderState();
    }
  }

  /**
   * Reapply baseline rendering defaults so the next operation starts clean.
   */
  applyDefaultRenderState() {
    const state = this.defaultRenderState;
    this.doc.setFont(state.text.fontFamily, state.text.fontStyle);
    this.doc.setFontSize(state.text.fontSize);
    this.doc.setTextColor(...state.text.color);
    this.doc.setLineHeightFactor(state.text.lineHeight);
    this.doc.setDrawColor(...state.stroke.color);
    this.doc.setFillColor(...state.fillColor);
    this.doc.setLineWidth(state.stroke.lineWidth);
    this.doc.setLineDashPattern([], 0);

    if (typeof this.doc.setLineCap === "function") {
      this.doc.setLineCap(state.stroke.lineCap);
    }
    if (typeof this.doc.setLineJoin === "function") {
      this.doc.setLineJoin(state.stroke.lineJoin);
    }
  }

  /**
   * Ensure there is enough vertical space, otherwise create a new page.
   * @param {number} requiredHeightMm
   */
  ensureSpace(requiredHeightMm) {
    const required = Number(requiredHeightMm) || 0;
    if (this.cursorY + required > this.contentBottomY) {
      this.addPage();
    }
  }

  /**
   * Move cursor down by fixed millimeters.
   * @param {number} mm
   */
  moveDown(mm) {
    this.cursorY += Number(mm) || 0;
  }

  /**
   * Get current vertical cursor.
   * @returns {number}
   */
  getCursorY() {
    return this.cursorY;
  }

  /**
   * Set current vertical cursor.
   * @param {number} y
   */
  setCursorY(y) {
    this.cursorY = Number(y) || this.cursorY;
  }

  /**
   * Apply a text style to jsPDF.
   * @param {object} style
   * @param {string} [style.fontFamily]
   * @param {string} [style.fontStyle]
   * @param {number} [style.fontSize]
   * @param {number[]} [style.color]
   */
  applyTextStyle(style = {}) {
    const fontFamily = style.fontFamily;
    const fontStyle = style.fontStyle;
    const fontSize = Number(style.fontSize);
    const color = this._resolveColor(style.color);

    this.doc.setFont(fontFamily, fontStyle);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(...color);
  }

  /**
   * Draw wrapped text with style/pagination/cursor handling.
   * @param {object} payload
   * @param {string} payload.text
   * @param {object} payload.style
   * @param {number} [payload.x]
   * @param {number} [payload.y]
   * @param {number} [payload.maxWidth]
   * @param {string} [payload.align]
   * @param {boolean} [payload.wrap]
   * @param {boolean} [payload.advance]
   * @param {boolean} [payload.allowPageBreak]
   * @returns {{ y: number, endY: number, lineCount: number, lineHeightMm: number }}
   */
  drawText(payload) {
    const text = payload && payload.text !== undefined ? String(payload.text) : "";
    const style = (payload && payload.style) || {};
    const x = payload && payload.x !== undefined ? payload.x : this.marginLeftMm;
    const maxWidth = payload && payload.maxWidth !== undefined
      ? payload.maxWidth
      : this.pageWidth - this.marginRightMm - x;
    const align = (payload && payload.align) || style.align || "left";
    const wrap = payload && payload.wrap === false ? false : true;
    const advance = payload && payload.advance === false ? false : true;
    const allowPageBreak = payload && payload.allowPageBreak === false ? false : true;

    const marginTopMm = getMarginTopMm(style);
    const marginBottomMm = getMarginBottomMm(style);
    const transformedText = applyTextTransform(text, style.textTransform);
    const fontSize = Number(style.fontSize);
    const lineHeightMm = style.lineHeightMm || resolveLineHeightMm(fontSize, style.lineHeight);
    const padding = getTextPaddingMm(style);
    const innerWidth = maxWidth - padding.left - padding.right;
    if (innerWidth <= 0) {
      throw new Error("Text operation has non-positive inner width after padding");
    }
    const lines = wrap
      ? this.measureWrappedLines(transformedText, innerWidth, style)
      : [transformedText];
    const lineCount = Math.max(lines.length, 1);
    const textHeight = lineCount * lineHeightMm;
    const blockHeight = padding.top + textHeight + padding.bottom;

    let drawY;
    if (payload && payload.y !== undefined) {
      drawY = Number(payload.y) + marginTopMm + padding.top;
    } else {
      if (allowPageBreak) {
        this.ensureSpace(marginTopMm + blockHeight + marginBottomMm);
      }
      drawY = this.cursorY + marginTopMm + padding.top;
    }

    this._drawTextContainer({
      style,
      x,
      y: drawY - padding.top,
      width: maxWidth,
      height: blockHeight,
    });
    this._drawTextLeftBorder({
      style,
      x,
      y: drawY,
      lineHeightMm,
      blockHeight: textHeight,
    });
    this.applyTextStyle(style);
    const baselineOffsetMm = this._getBaselineOffsetMm(fontSize);
    this.doc.setLineHeightFactor(Number(style.lineHeight));
    this._drawTextLines(lines, {
      x: x + padding.left,
      y: drawY + baselineOffsetMm,
      maxWidth: innerWidth,
      align,
      lineHeightMm,
    });

    this.applyDefaultRenderState();

    const endY = drawY + textHeight + padding.bottom;
    this.lastDrawnBounds = {
      topY: drawY - padding.top,
      bottomY: endY,
      leftX: x,
      rightX: x + maxWidth,
    };
    if (advance) {
      this.cursorY = endY + marginBottomMm;
    }

    return {
      y: drawY,
      endY,
      lineCount,
      lineHeightMm,
    };
  }

  /**
   * Draw a single-line left/right row (e.g., role title + period).
   * @param {object} payload
   * @param {string} payload.leftText
   * @param {string} payload.rightText
   * @param {object} payload.leftStyle
   * @param {object} payload.rightStyle
   * @param {number} [payload.xLeft]
   * @param {number} [payload.xRight]
   * @param {boolean} [payload.allowPageBreak]
   * @returns {{ y: number, endY: number }}
   */
  drawRow(payload) {
    const leftStyle = payload.leftStyle || {};
    const rightStyle = payload.rightStyle || {};
    const xLeft = payload.xLeft !== undefined ? payload.xLeft : this.marginLeftMm;
    const xRight = payload.xRight !== undefined ? payload.xRight : this.pageWidth - this.marginRightMm;
    const allowPageBreak = payload.allowPageBreak === false ? false : true;

    const topMm = Math.max(getMarginTopMm(leftStyle), getMarginTopMm(rightStyle));
    const bottomMm = Math.max(getMarginBottomMm(leftStyle), getMarginBottomMm(rightStyle));

    const leftLineHeight = resolveLineHeightMm(Number(leftStyle.fontSize), leftStyle.lineHeight);
    const rightLineHeight = resolveLineHeightMm(Number(rightStyle.fontSize), rightStyle.lineHeight);
    const rowHeight = Math.max(leftLineHeight, rightLineHeight);

    if (allowPageBreak) {
      this.ensureSpace(topMm + rowHeight + bottomMm);
    }
    const y = this.cursorY + topMm;
    const leftFontSize = Number(leftStyle.fontSize);
    const rightFontSize = Number(rightStyle.fontSize);
    const baselineOffsetMm = Math.max(
      this._getBaselineOffsetMm(leftFontSize),
      this._getBaselineOffsetMm(rightFontSize)
    );
    const baseline = y + baselineOffsetMm;

    if (payload.leftText) {
      this.applyTextStyle(leftStyle);
      this.doc.text(applyTextTransform(String(payload.leftText), leftStyle.textTransform), xLeft, baseline);
    }

    if (payload.rightText) {
      this.applyTextStyle(rightStyle);
      this.doc.text(applyTextTransform(String(payload.rightText), rightStyle.textTransform), xRight, baseline, { align: "right" });
    }

    this.applyDefaultRenderState();

    const endY = y + rowHeight;
    this.lastDrawnBounds = {
      topY: y,
      bottomY: endY,
      leftX: xLeft,
      rightX: xRight,
    };
    this.cursorY = endY + bottomMm;

    return { y, endY };
  }

  /**
   * Draw bullet marker + wrapped bullet text.
   * @param {object} payload
   * @param {string} payload.text
   * @param {object} payload.textStyle
   * @param {object} payload.markerStyle
   * @param {string} [payload.marker]
   * @param {number} [payload.x]
   * @param {number} [payload.textIndentMm]
   * @param {number} [payload.maxWidth]
   * @param {boolean} [payload.allowPageBreak]
   * @returns {{ y: number, endY: number, lineCount: number }}
   */
  drawBullet(payload) {
    const textStyle = payload.textStyle || {};
    const markerStyle = payload.markerStyle || {};
    const marker = payload.marker || markerStyle.marker;
    const x = payload.x !== undefined ? payload.x : this.marginLeftMm;
    const textIndentMm = payload.textIndentMm !== undefined ? payload.textIndentMm : 4;
    const textX = x + textIndentMm;
    const maxWidth = payload.maxWidth !== undefined
      ? payload.maxWidth
      : this.pageWidth - this.marginRightMm - textX;
    const text = payload.text !== undefined ? String(payload.text) : "";
    const allowPageBreak = payload.allowPageBreak === false ? false : true;

    const topMm = getMarginTopMm(textStyle);
    const bottomMm = getMarginBottomMm(textStyle);
    const lineHeightMm = resolveLineHeightMm(Number(textStyle.fontSize), textStyle.lineHeight);

    const lines = this.measureWrappedLines(
      applyTextTransform(text, textStyle.textTransform),
      maxWidth,
      textStyle
    );
    const lineCount = Math.max(lines.length, 1);
    const blockHeight = lineCount * lineHeightMm;

    if (allowPageBreak) {
      this.ensureSpace(topMm + blockHeight + bottomMm);
    }
    const y = this.cursorY + topMm;
    const textFontSize = Number(textStyle.fontSize);
    const markerFontSize = Number(markerStyle.fontSize);
    const baselineOffsetMm = Math.max(
      this._getBaselineOffsetMm(textFontSize),
      this._getBaselineOffsetMm(markerFontSize)
    );
    const baseline = y + baselineOffsetMm;

    this.applyTextStyle(markerStyle);
    this.doc.text(String(marker), x, baseline);

    this.applyTextStyle(textStyle);
    this.doc.setLineHeightFactor(Number(textStyle.lineHeight));
    this.doc.text(lines, textX, baseline);

    this.applyDefaultRenderState();

    const endY = y + blockHeight;
    this.lastDrawnBounds = {
      topY: y,
      bottomY: endY,
      leftX: x,
      rightX: textX + maxWidth,
    };
    this.cursorY = endY + bottomMm;

    return { y, endY, lineCount };
  }

  /**
   * Draw horizontal divider line.
   * @param {object} payload
   * @param {object} payload.style
   * @param {number} [payload.x1]
   * @param {number} [payload.x2]
   * @param {boolean} [payload.allowPageBreak]
   * @returns {{ y: number }}
   */
  drawDivider(payload) {
    const style = payload.style || {};
    const x1 = payload.x1 !== undefined ? payload.x1 : this.marginLeftMm;
    const x2 = payload.x2 !== undefined ? payload.x2 : this.pageWidth - this.marginRightMm;

    const topMm = getMarginTopMm(style);
    const bottomMm = getMarginBottomMm(style);
    const lineWidth = Number(style.lineWidth);
    const allowPageBreak = payload.allowPageBreak === false ? false : true;

    if (allowPageBreak) {
      this.ensureSpace(topMm + lineWidth + bottomMm);
    }
    const y = this.cursorY + topMm;

    if (style.opacity && style.opacity < 1 && this.doc.GState) {
      this.doc.saveGraphicsState();
      this.doc.setGState(this.doc.GState({ "stroke-opacity": style.opacity }));
    }

    this.doc.setDrawColor(...this._resolveColor(style.color));
    this.doc.setLineWidth(lineWidth);

    if (Array.isArray(style.dashPattern) && style.dashPattern.length > 0) {
      this.doc.setLineDashPattern(style.dashPattern, 0);
    } else {
      this.doc.setLineDashPattern([], 0);
    }

    this.doc.line(x1, y, x2, y);
    this.doc.setLineDashPattern([], 0);

    if (style.opacity && style.opacity < 1 && this.doc.GState) {
      this.doc.restoreGraphicsState();
    }

    this.applyDefaultRenderState();

    this.lastDrawnBounds = {
      topY: y,
      bottomY: y + lineWidth,
      leftX: x1,
      rightX: x2,
    };
    this.cursorY = y + lineWidth + bottomMm;
    return { y };
  }

  /**
   * Draw an image (PNG, JPEG) at the current cursor or specified position.
   * @param {object} payload
   * @param {string|ArrayBuffer|Uint8Array} payload.data  Image data (base64 string, ArrayBuffer, or data URL)
   * @param {string} [payload.format]  "PNG", "JPEG", etc.
   * @param {number} [payload.x]  X position in mm
   * @param {number} [payload.y]  Y position in mm (defaults to cursorY)
   * @param {number} payload.widthMm  Display width in mm
   * @param {number} payload.heightMm  Display height in mm
   * @param {object} [payload.style]  Style with margins
   * @param {boolean} [payload.advance]  Whether to advance cursor (default true)
   * @param {boolean} [payload.allowPageBreak]  Whether to break page (default true)
   * @returns {{ y: number, endY: number }}
   */
  drawImage(payload) {
    const style = (payload && payload.style) || {};
    const x = payload.x !== undefined ? payload.x : this.marginLeftMm;
    const widthMm = Number(payload.widthMm);
    const heightMm = Number(payload.heightMm);
    const advance = payload.advance !== false;
    const allowPageBreak = payload.allowPageBreak !== false;

    const marginTopMm = getMarginTopMm(style);
    const marginBottomMm = getMarginBottomMm(style);

    if (allowPageBreak) {
      this.ensureSpace(marginTopMm + heightMm + marginBottomMm);
    }

    const drawY = payload.y !== undefined
      ? Number(payload.y) + marginTopMm
      : this.cursorY + marginTopMm;

    this.doc.addImage(
      payload.data,
      payload.format || "PNG",
      x,
      drawY,
      widthMm,
      heightMm
    );

    const endY = drawY + heightMm;
    this.lastDrawnBounds = {
      topY: drawY,
      bottomY: endY,
      leftX: x,
      rightX: x + widthMm,
    };

    if (advance) {
      this.cursorY = endY + marginBottomMm;
    }

    return { y: drawY, endY };
  }

  /**
   * Draw visually hidden text (ATS tags, keywords) without moving cursor.
   * @param {object} payload
   * @param {string} payload.text
   * @param {object} payload.style
   * @param {number} [payload.x]
   */
  drawHiddenText(payload) {
    const style = Object.assign({}, payload.style || {}, {
      color: payload.style && payload.style.color
        ? payload.style.color
        : this.backgroundColor,
    });
    this.drawText({
      text: payload.text,
      style,
      x: payload.x !== undefined ? payload.x : this.marginLeftMm,
      y: this.cursorY,
      wrap: true,
      advance: false,
    });
  }

  /**
   * Split text to size using the provided style for accurate width measurement.
   * This avoids wrap drift when previous operations changed font/size.
   * @param {string} text
   * @param {number} maxWidth
   * @param {object} style
   * @returns {string[]}
   */
  measureWrappedLines(text, maxWidth, style = {}) {
    const previousFont = this.doc.getFont();
    const previousFontSize = this.doc.getFontSize();

    this.doc.setFont(style.fontFamily, style.fontStyle);
    this.doc.setFontSize(Number(style.fontSize));
    const lines = this.doc.splitTextToSize(String(text), maxWidth);

    this.doc.setFont(previousFont.fontName, previousFont.fontStyle);
    this.doc.setFontSize(previousFontSize);
    return lines;
  }

  /**
   * Return document as Buffer.
   * @returns {Buffer}
   */
  toBuffer() {
    return Buffer.from(this.doc.output("arraybuffer"));
  }

  /**
   * Save rendered PDF to disk.
   * @param {string} outputPath
   */
  saveToFile(outputPath) {
    fs.writeFileSync(outputPath, this.toBuffer());
  }

  _resolveColor(color, fallback) {
    if (Array.isArray(color) && color.length === 3) {
      return color;
    }
    return fallback;
  }

  _resolveTextAnchorX(x, maxWidth, align) {
    if (align === "center") {
      return x + (maxWidth / 2);
    }
    if (align === "right") {
      return x + maxWidth;
    }
    return x;
  }

  _drawTextLeftBorder(input) {
    const style = input.style || {};
    const border = style.leftBorder;
    if (!border || typeof border !== "object") {
      return;
    }

    const widthMm = border.widthMm !== undefined ? Number(border.widthMm) || 0 : 0;
    if (widthMm <= 0) {
      return;
    }

    const gapMm = border.gapMm !== undefined ? Number(border.gapMm) || 0 : 0;
    const heightMm = border.heightMm !== undefined
      ? Number(border.heightMm) || 0
      : input.blockHeight;
    if (heightMm <= 0) {
      return;
    }

    const topOffsetMm = border.topOffsetMm !== undefined
      ? Number(border.topOffsetMm) || 0
      : 0;
    const color = this._resolveColor(border.color);

    this.doc.setFillColor(...color);
    this.doc.rect(
      input.x - gapMm - widthMm,
      input.y + topOffsetMm,
      widthMm,
      heightMm,
      "F"
    );
  }

  _drawTextContainer(input) {
    const style = input.style || {};
    const hasBackground = Array.isArray(style.backgroundColor) && style.backgroundColor.length === 3;
    const borderWidth = style.borderWidthMm !== undefined
      ? (Number(style.borderWidthMm) || 0)
      : (style.borderWidth !== undefined ? (Number(style.borderWidth) || 0) : 0);
    const hasBorder = borderWidth > 0;

    if (!hasBackground && !hasBorder) {
      return;
    }

    const x = input.x;
    const y = input.y;
    const width = input.width;
    const height = input.height;
    if (width <= 0 || height <= 0) {
      return;
    }

    const radiusMm = style.borderRadiusMm !== undefined
      ? (Number(style.borderRadiusMm) || 0)
      : 0;
    const fillColor = this._resolveColor(style.backgroundColor);
    const borderColor = this._resolveColor(style.borderColor);
    let mode = "S";
    if (hasBackground && hasBorder) {
      mode = "FD";
    } else if (hasBackground) {
      mode = "F";
    }

    if (hasBackground) {
      this.doc.setFillColor(...fillColor);
    }
    if (hasBorder) {
      this.doc.setDrawColor(...borderColor);
      this.doc.setLineWidth(borderWidth);
    }

    if (radiusMm > 0 && typeof this.doc.roundedRect === "function") {
      this.doc.roundedRect(x, y, width, height, radiusMm, radiusMm, mode);
      return;
    }
    this.doc.rect(x, y, width, height, mode);
  }

  _drawTextLines(linesInput, options) {
    const lines = Array.isArray(linesInput) ? linesInput : [String(linesInput)];
    const x = options.x;
    const y = options.y;
    const maxWidth = options.maxWidth;
    const align = options.align || "left";
    const lineHeightMm = options.lineHeightMm || 0;

    // jsPDF justify stretches all lines in array mode (including paragraph-last lines).
    // Draw line-by-line so only non-final lines are justified and width is explicit.
    if (align === "justify") {
      if (lines.length === 1) {
        this.doc.text(lines[0], x, y, { align: "left" });
        return;
      }
      lines.forEach((line, i) => {
        const lineY = y + (i * lineHeightMm);
        const isLast = i === lines.length - 1;
        if (isLast) {
          this.doc.text(line, x, lineY, { align: "left" });
          return;
        }
        this.doc.text(line, x, lineY, { align: "justify", maxWidth });
      });
      return;
    }

    this.doc.text(lines, this._resolveTextAnchorX(x, maxWidth, align), y, { align });
  }

  _getBaselineOffsetMm(fontSizePt) {
    return ptToMm(Number(fontSizePt) * 0.75);
  }

  _buildDefaultRenderState(page = {}) {
    const text = page.defaultText || {};
    const stroke = page.defaultStroke || {};
    return {
      text: {
        fontFamily: text.fontFamily,
        fontStyle: text.fontStyle,
        fontSize: Number(text.fontSize),
        color: this._resolveColor(text.color),
        lineHeight: Number(text.lineHeight),
      },
      stroke: {
        color: this._resolveColor(stroke.color),
        lineWidth: Number(stroke.lineWidth),
        lineCap: stroke.lineCap,
        lineJoin: stroke.lineJoin,
      },
      fillColor: this._resolveColor(page.defaultFillColor),
    };
  }
}

module.exports = {
  PDFCore,
  getMarginTopMm,
  getMarginBottomMm,
  getStyleMarginsMm,
  getTextPaddingMm,
  applyTextTransform,
};
