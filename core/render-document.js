const { PDFCore, getStyleMarginsMm, getTextPaddingMm, applyTextTransform } = require("./pdf-core");
const { pxToMm, resolveLineHeightMm } = require("./units");
const { registerThemeFonts } = require("./font-registry");
const { getPlugin, hasPlugin } = require("./plugin-registry");
const { validateSource, validateTheme, validateSourceAgainstTheme } = require("./validate");

/**
 * Render a document by executing labeled operations.
 *
 * pageTemplates format (inside source):
 * {
 *   header: operations[],
 *   footer: operations[],
 *   headerHeightMm: number,   // reserves body space
 *   footerHeightMm: number,   // reserves body space
 *   headerBypassMargins: true // default true
 *   footerBypassMargins: true // default true
 * }
 *
 * @param {object} input
 * @param {object} input.source Source-of-truth JSON
 * @param {object} input.theme Theme with `labels` style map
 * @param {string} [input.outputPath]
 * @returns {{ buffer: Buffer, operationsCount: number, core: PDFCore }}
 */
function renderDocument(input) {
  if (!input || typeof input !== "object") {
    throw new Error("renderDocument: input is required");
  }
  if (!input.source) {
    throw new Error("renderDocument: source is required");
  }
  if (!input.theme) {
    throw new Error("renderDocument: theme is required");
  }
  if (input.validate) {
    validateSource(input.source);
    validateTheme(input.theme);
    validateSourceAgainstTheme(input.source, input.theme);
  }

  const built = normalizeSourceModel(input.source);
  const runtimeTheme = buildRuntimeTheme(input.theme, built.pageTemplates);

  const core = new PDFCore(runtimeTheme);
  registerThemeFonts(core, runtimeTheme);

  installPageTemplates(core, runtimeTheme, built.pageTemplates);

  executeOperations({
    core,
    theme: runtimeTheme,
    operations: built.operations,
    indexPrefix: "",
    templateMode: false,
    templateBypassMargins: false,
  });

  const buffer = core.toBuffer();
  if (input.outputPath) {
    core.saveToFile(input.outputPath);
  }

  return {
    buffer,
    operationsCount: countLeafOperations(built.operations),
    core,
  };
}

/**
 * Normalize direct JSON contract into operations.
 * Accepted root forms:
 * - operations[]
 * - { operations, pageTemplates? }
 * - { content|items|sections|children, pageTemplates? } wrappers
 *
 * Node wrappers can nest.
 * - `section` wrappers are normalized as parent `block` operations.
 * - other wrappers are flattened while preserving order.
 * A wrapper node is any object with content/items/sections/children array.
 *
 * "group" is accepted as alias for "block".
 *
 * @param {object|Array<object>} source
 * @returns {{ operations: Array<object>, pageTemplates: object|null }}
 */
function normalizeSourceModel(source) {
  if (Array.isArray(source)) {
    return { operations: normalizeNodes(source, "source"), pageTemplates: null };
  }

  if (!source || typeof source !== "object") {
    throw new Error("renderDocument: source must be an object or operation array");
  }

  if (Array.isArray(source.operations)) {
    return {
      operations: normalizeNodes(source.operations, "source.operations"),
      pageTemplates: source.pageTemplates || null,
    };
  }

  const rootChildren = getNodeChildren(source);
  if (rootChildren) {
    return {
      operations: normalizeNodes(rootChildren, "source"),
      pageTemplates: source.pageTemplates || null,
    };
  }

  throw new Error(
    "renderDocument: source must provide operations[] or wrapper arrays (content/items/sections/children)"
  );
}

function buildRuntimeTheme(theme, pageTemplates) {
  const page = Object.assign({}, theme.page || {});
  const hasHeader = pageTemplates && Array.isArray(pageTemplates.header) && pageTemplates.header.length > 0;
  const hasFooter = pageTemplates && Array.isArray(pageTemplates.footer) && pageTemplates.footer.length > 0;

  if (pageTemplates && pageTemplates.headerHeightMm !== undefined) {
    page.headerHeightMm = Number(pageTemplates.headerHeightMm) || 0;
  } else if (hasHeader && page.headerHeightMm === undefined) {
    page.headerHeightMm = 12;
  }

  if (pageTemplates && pageTemplates.footerHeightMm !== undefined) {
    page.footerHeightMm = Number(pageTemplates.footerHeightMm) || 0;
  } else if (hasFooter && page.footerHeightMm === undefined) {
    page.footerHeightMm = 10;
  }

  return Object.assign({}, theme, { page });
}

function installPageTemplates(core, theme, pageTemplates) {
  if (!pageTemplates || typeof pageTemplates !== "object") {
    return;
  }

  const headerOps = Array.isArray(pageTemplates.header) ? pageTemplates.header : [];
  const footerOps = Array.isArray(pageTemplates.footer) ? pageTemplates.footer : [];
  if (headerOps.length === 0 && footerOps.length === 0) {
    return;
  }

  const headerBypassMargins = pageTemplates.headerBypassMargins !== false;
  const footerBypassMargins = pageTemplates.footerBypassMargins !== false;

  const renderTemplatesForCurrentPage = () => {
    if (headerOps.length > 0) {
      const startY = pageTemplates.headerStartMm !== undefined
        ? Number(pageTemplates.headerStartMm) || 0
        : 0;
      renderTemplateRegion(core, theme, headerOps, startY, "header", headerBypassMargins);
    }
    if (footerOps.length > 0) {
      const defaultFooterStart = core.pageHeight - (core.footerHeightMm || 0);
      const startY = pageTemplates.footerStartMm !== undefined
        ? Number(pageTemplates.footerStartMm) || 0
        : defaultFooterStart;
      renderTemplateRegion(core, theme, footerOps, startY, "footer", footerBypassMargins);
    }
  };

  const originalAddPage = core.addPage.bind(core);
  core.addPage = () => {
    originalAddPage();
    renderTemplatesForCurrentPage();
  };

  renderTemplatesForCurrentPage();
}

function renderTemplateRegion(core, theme, operations, startY, regionName, bypassMargins) {
  const savedY = core.getCursorY();
  core.setCursorY(startY);

  executeOperations({
    core,
    theme,
    operations,
    indexPrefix: `template:${regionName}.`,
    templateMode: true,
    templateBypassMargins: bypassMargins,
  });

  core.setCursorY(savedY);
}

function executeOperations(ctx) {
  const { core, theme, operations, indexPrefix, templateMode, templateBypassMargins, insideContainer } = ctx;
  if (!Array.isArray(operations)) {
    throw new Error("Operations must be an array");
  }

  for (let i = 0; i < operations.length; i += 1) {
    const operation = operations[i];
    const index = `${indexPrefix}${i}`;

    if (!templateMode) {
      const keepCount = normalizeKeepWithNext(operation && operation.keepWithNext);
      if (keepCount > 0) {
        const grouped = operations.slice(i, i + 1 + keepCount);
        const groupedHeight = estimateOperationsHeight({
          core,
          theme,
          operations: grouped,
          indexPrefix: `${index}.keep.`,
        });
        core.ensureSpace(groupedHeight);
      }
    }

    core.withDocumentState(() => {
      executeOperation({
        core,
        theme,
        operation,
        index,
        templateMode,
        templateBypassMargins,
        insideContainer,
      });
    });
  }
}

function normalizeNodes(nodes, path) {
  if (!Array.isArray(nodes)) {
    throw new Error(`${path} must be an array`);
  }

  const operations = [];
  nodes.forEach((node, i) => {
    const nodePath = `${path}[${i}]`;
    operations.push(...normalizeNode(node, nodePath));
  });
  return operations;
}

function normalizeNode(node, path) {
  if (!node || typeof node !== "object") {
    throw new Error(`${path} must be an object`);
  }

  if (node.type === "quote") {
    if (!node.label) {
      throw new Error(`${path} type "quote" requires label`);
    }
    const quoteText = node.content !== undefined ? node.content : node.text;
    if (quoteText === undefined) {
      throw new Error(`${path} type "quote" requires content or text`);
    }
    const attrLabel = node.attributionLabel || (node.label + ".attribution");
    const attrText = node.author !== undefined ? node.author : node.attribution;
    const children = [
      { type: "text", label: node.label, text: quoteText, xMm: node.xMm, maxWidthMm: node.maxWidthMm },
    ];
    if (attrText) {
      children.push({ type: "text", label: attrLabel, text: attrText, xMm: node.xMm, maxWidthMm: node.maxWidthMm });
    }
    return [{
      type: "block",
      label: node.label,
      keepTogether: true,
      xMm: node.xMm,
      maxWidthMm: node.maxWidthMm,
      children,
    }];
  }

  if (isOperationType(node.type)) {
    return expandOperationNode(node, path);
  }

  const children = getNodeChildren(node);
  if (children) {
    if (isParentContainerType(node.type)) {
      const childrenOps = normalizeNodes(children, `${path}.children`);
      return [toParentBlock(node, childrenOps)];
    }
    return normalizeNodes(children, `${path}.children`);
  }

  if (node.type === "group") {
    throw new Error(`${path} type "group" requires children/content/items/sections array`);
  }

  if (node.type === "block") {
    throw new Error(`${path} type "block" requires children/content/items/sections array`);
  }
  if (node.type === "section") {
    throw new Error(`${path} type "section" requires children/content/items/sections array`);
  }

  if (node.label && (node.text !== undefined || node.value !== undefined)) {
    const raw = node.text !== undefined ? node.text : node.value;
    if (Array.isArray(raw)) {
      return raw
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((text) => ({
          type: "text",
          label: node.label,
          text,
        }));
    }
    return [
      {
        type: "text",
        label: node.label,
        text: raw,
      },
    ];
  }

  throw new Error(
    `${path} is not a valid operation node. Provide operation.type or wrapper children arrays`
  );
}

function isOperationType(type) {
  return type === "text"
    || type === "row"
    || type === "bullet"
    || type === "divider"
    || type === "spacer"
    || type === "hiddenText"
    || type === "table"
    || hasPlugin(type);
}

function expandOperationNode(node, path) {
  if (node.type === "bullet") {
    const bulletList = getBulletArray(node);
    if (bulletList) {
      return bulletList
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((text) => ({
          type: "bullet",
          label: node.label,
          markerLabel: node.markerLabel,
          marker: node.marker,
          xMm: node.xMm,
          textIndentMm: node.textIndentMm,
          maxWidthMm: node.maxWidthMm,
          keepWithNext: node.keepWithNext,
          text,
        }));
    }
    return [node];
  }

  if (node.type === "text" && Array.isArray(node.text)) {
    return node.text
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((text) => ({
        type: "text",
        label: node.label,
        xMm: node.xMm,
        maxWidthMm: node.maxWidthMm,
        align: node.align,
        wrap: node.wrap,
        advance: node.advance,
        keepWithNext: node.keepWithNext,
        text,
      }));
  }

  if ((node.type === "hiddenText") && Array.isArray(node.text)) {
    return [
      Object.assign({}, node, {
        text: node.text.map((item) => String(item || "")).join(" "),
      }),
    ];
  }

  return [node];
}

function getBulletArray(node) {
  if (Array.isArray(node.text)) {
    return node.text;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.bullets)) {
    return node.bullets;
  }
  return null;
}

function isParentContainerType(type) {
  return type === "block" || type === "group" || type === "section";
}

function toParentBlock(node, childrenOps) {
  const out = {};
  Object.keys(node).forEach((key) => {
    if (key === "children" || key === "content" || key === "items" || key === "sections") {
      return;
    }
    out[key] = node[key];
  });
  out.type = "block";
  out.children = childrenOps;

  // `section` defines a parent boundary but should not force keepTogether unless explicit.
  if (node.type === "section" && out.keepTogether === undefined) {
    out.keepTogether = false;
  }

  return out;
}

function getNodeChildren(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (Array.isArray(node.children)) {
    return node.children;
  }
  if (Array.isArray(node.content)) {
    return node.content;
  }
  if (Array.isArray(node.items)) {
    return node.items;
  }
  if (Array.isArray(node.sections)) {
    return node.sections;
  }
  return null;
}

/**
 * Execute one operation.
 * Supported types:
 * - text
 * - row
 * - bullet
 * - divider
 * - spacer
 * - hiddenText
 * - block
 *
 * block format:
 * {
 *   type: "block",
 *   keepTogether: true,
 *   children: [ ...operations ],
 *   spaceAfterMm: 2
 * }
 *
 * @param {object} ctx
 */
function executeOperation(ctx) {
  const { core, theme, operation, index, templateMode, templateBypassMargins, insideContainer } = ctx;
  if (!operation || !operation.type) {
    throw new Error(`Invalid operation at index ${index}`);
  }

  if (operation.type === "block") {
    const children = Array.isArray(operation.children) ? operation.children : null;
    if (!children) {
      throw new Error(`Block operation at index ${index} must define children[]`);
    }

    const containerStyle = operation.label
      ? resolveLabelStyle(theme, operation.label, operation, index, "label", true)
      : null;
    const hasContainer = containerStyle && (
      Array.isArray(containerStyle.backgroundColor)
      || (Number(containerStyle.borderWidthMm) > 0)
    );

    const childrenHeight = estimateOperationsHeight({
      core,
      theme,
      operations: children,
      indexPrefix: `${index}.block.`,
    });

    if (!templateMode && (hasContainer || operation.keepTogether !== false)) {
      core.ensureSpace(childrenHeight);
    }

    if (hasContainer) {
      const bounds = getHorizontalBounds(core, templateBypassMargins);
      const x = operation.xMm !== undefined ? operation.xMm : bounds.left;
      const width = operation.maxWidthMm !== undefined ? operation.maxWidthMm : (bounds.right - x);
      const containerY = core.getCursorY();

      core._drawTextContainer({ style: containerStyle, x, y: containerY, width, height: childrenHeight });
      core._drawTextLeftBorder({ style: containerStyle, x, y: containerY, lineHeightMm: 0, blockHeight: childrenHeight });
    }

    executeOperations({
      core,
      theme,
      operations: children,
      indexPrefix: `${index}.`,
      templateMode,
      templateBypassMargins,
      insideContainer: hasContainer || insideContainer,
    });

    if (operation.spaceAfterMm !== undefined) {
      core.moveDown(Number(operation.spaceAfterMm) || 0);
    } else if (operation.spaceAfterPx !== undefined) {
      core.moveDown(pxToMm(operation.spaceAfterPx));
    } else if (operation.spaceAfterLabel) {
      const style = resolveLabelStyle(theme, operation.spaceAfterLabel, operation, index, "spaceAfterLabel");
      moveFromSpacerStyle(core, style, index);
    }
    return;
  }

  if (operation.type === "text") {
    const rawStyle = resolveLabelStyle(theme, operation.label, operation, index);
    const style = insideContainer ? stripContainerProps(rawStyle) : rawStyle;
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const defaultX = bounds.left;
    const x = operation.xMm !== undefined ? operation.xMm : defaultX;
    validatePointInsideBounds("xMm", x, bounds, index, templateBypassMargins);
    const maxWidth = operation.maxWidthMm !== undefined
      ? operation.maxWidthMm
      : bounds.right - x;
    if (maxWidth <= 0) {
      throw new Error(`Operation ${index} (${operation.type}) has non-positive width`);
    }

    core.drawText({
      text: applyPageTokens(operation.text, core),
      style,
      x,
      maxWidth,
      align: operation.align,
      wrap: operation.wrap,
      advance: operation.advance,
      allowPageBreak: !templateMode,
    });
    return;
  }

  if (operation.type === "row") {
    const leftStyle = resolveLabelStyle(theme, operation.leftLabel, operation, index, "leftLabel");
    const rightStyle = resolveLabelStyle(theme, operation.rightLabel, operation, index, "rightLabel");
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const defaultLeft = bounds.left;
    const defaultRight = bounds.right;
    const leftPadding = getTextPaddingMm(leftStyle);
    const rightPadding = getTextPaddingMm(rightStyle);
    const xLeft = (operation.xLeftMm !== undefined ? operation.xLeftMm : defaultLeft) + leftPadding.left;
    const xRight = (operation.xRightMm !== undefined ? operation.xRightMm : defaultRight) - rightPadding.right;
    validatePointInsideBounds("xLeftMm", xLeft, bounds, index, templateBypassMargins);
    validatePointInsideBounds("xRightMm", xRight, bounds, index, templateBypassMargins);
    if (xRight < xLeft) {
      throw new Error(`Operation ${index} (${operation.type}) has xRightMm < xLeftMm`);
    }

    core.drawRow({
      leftText: applyPageTokens(operation.leftText, core),
      rightText: applyPageTokens(operation.rightText, core),
      leftStyle,
      rightStyle,
      xLeft,
      xRight,
      allowPageBreak: !templateMode,
    });
    return;
  }

  if (operation.type === "bullet") {
    const textStyle = resolveLabelStyle(theme, operation.label, operation, index);
    const markerStyle = resolveLabelStyle(
      theme,
      operation.markerLabel || "bullet.marker",
      operation,
      index,
      "markerLabel",
      true
    );

    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const defaultX = bounds.left;
    const x = operation.xMm !== undefined ? operation.xMm : defaultX;
    validatePointInsideBounds("xMm", x, bounds, index, templateBypassMargins);
    const textIndentMm = operation.textIndentMm !== undefined
      ? operation.textIndentMm
      : (theme.layout && Number(theme.layout.bulletIndentMm)) || 4;
    const rightBoundary = bounds.right;
    const maxWidth = operation.maxWidthMm !== undefined
      ? operation.maxWidthMm
      : rightBoundary - (x + textIndentMm);
    if (maxWidth <= 0) {
      throw new Error(`Operation ${index} (${operation.type}) has non-positive width`);
    }

    core.drawBullet({
      text: applyPageTokens(operation.text, core),
      textStyle,
      markerStyle: markerStyle || {},
      marker: operation.marker,
      x,
      textIndentMm,
      maxWidth,
      allowPageBreak: !templateMode,
    });
    return;
  }

  if (operation.type === "divider") {
    const style = resolveLabelStyle(theme, operation.label, operation, index);
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const defaultX1 = bounds.left;
    const defaultX2 = bounds.right;
    const x1 = operation.x1Mm !== undefined ? operation.x1Mm : defaultX1;
    const x2 = operation.x2Mm !== undefined ? operation.x2Mm : defaultX2;
    validatePointInsideBounds("x1Mm", x1, bounds, index, templateBypassMargins);
    validatePointInsideBounds("x2Mm", x2, bounds, index, templateBypassMargins);
    if (x2 < x1) {
      throw new Error(`Operation ${index} (${operation.type}) has x2Mm < x1Mm`);
    }

    core.drawDivider({
      style,
      x1,
      x2,
      allowPageBreak: !templateMode,
    });
    return;
  }

  if (operation.type === "spacer") {
    if (operation.mm !== undefined) {
      core.moveDown(Number(operation.mm) || 0);
      return;
    }
    if (operation.px !== undefined) {
      core.moveDown(pxToMm(operation.px));
      return;
    }
    if (operation.label) {
      const style = resolveLabelStyle(theme, operation.label, operation, index);
      moveFromSpacerStyle(core, style, index);
      return;
    }
    throw new Error(`Spacer operation at index ${index} must provide mm, px, or label with spaceMm/spacePx`);
  }

  if (operation.type === "hiddenText") {
    const style = resolveLabelStyle(theme, operation.label, operation, index);
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const x = operation.xMm !== undefined
      ? operation.xMm
      : bounds.left;
    core.drawHiddenText({
      text: applyPageTokens(operation.text, core),
      style,
      x,
    });
    return;
  }

  if (operation.type === "table") {
    const cellStyle = resolveLabelStyle(theme, operation.label, operation, index);
    const headerStyle = operation.headerLabel
      ? resolveLabelStyle(theme, operation.headerLabel, operation, index, "headerLabel")
      : null;
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    const x = operation.xMm !== undefined ? operation.xMm : bounds.left;
    const maxWidth = operation.maxWidthMm !== undefined
      ? operation.maxWidthMm
      : bounds.right - x;

    // Merge source-level style overrides onto cell style
    const mergedCellStyle = Object.assign({}, cellStyle);
    if (operation.altRowColor !== undefined) mergedCellStyle.altRowColor = operation.altRowColor;
    if (operation.cellPaddingMm !== undefined) mergedCellStyle.cellPaddingMm = operation.cellPaddingMm;
    if (operation.borderColor !== undefined) mergedCellStyle.borderColor = operation.borderColor;
    if (operation.borderTopMm !== undefined) mergedCellStyle.borderTopMm = operation.borderTopMm;
    if (operation.borderBottomMm !== undefined) mergedCellStyle.borderBottomMm = operation.borderBottomMm;
    if (operation.borderLeftMm !== undefined) mergedCellStyle.borderLeftMm = operation.borderLeftMm;
    if (operation.borderRightMm !== undefined) mergedCellStyle.borderRightMm = operation.borderRightMm;

    const columns = resolveTableColumns(operation.columns, maxWidth);
    const headers = operation.headerLabel
      ? (operation.columns || []).map(function (col) { return col.header || ""; })
      : null;

    core.drawTable({
      columns,
      headers,
      rows: operation.rows || [],
      cellStyle: mergedCellStyle,
      headerStyle,
      x,
      maxWidth,
      allowPageBreak: !templateMode,
    });
    return;
  }

  const plugin = getPlugin(operation.type);
  if (plugin) {
    const bounds = getHorizontalBounds(core, templateBypassMargins);
    if (typeof plugin.validate === "function") {
      plugin.validate(operation);
    }
    plugin.render({ core, operation, theme, bounds, index, templateMode });
    return;
  }

  throw new Error(`Unsupported operation type "${operation.type}" at index ${index}`);
}

function estimateOperationsHeight(ctx) {
  const { core, theme, operations, indexPrefix, maxTextLines } = ctx;
  let total = 0;
  operations.forEach((operation, idx) => {
    total += estimateOperationHeight({
      core,
      theme,
      operation,
      index: `${indexPrefix}${idx}`,
      maxTextLines,
    });
  });
  return total;
}

function estimateOperationHeight(ctx) {
  const { core, theme, operation, index } = ctx;
  if (!operation || !operation.type) {
    throw new Error(`Invalid operation at index ${index}`);
  }

  if (operation.type === "block") {
    const children = Array.isArray(operation.children) ? operation.children : null;
    if (!children) {
      throw new Error(`Block operation at index ${index} must define children[]`);
    }
    let total = estimateOperationsHeight({
      core,
      theme,
      operations: children,
      indexPrefix: `${index}.block.`,
    });
    if (operation.spaceAfterMm !== undefined) {
      total += Number(operation.spaceAfterMm) || 0;
    } else if (operation.spaceAfterPx !== undefined) {
      total += pxToMm(operation.spaceAfterPx);
    } else if (operation.spaceAfterLabel) {
      const style = resolveLabelStyle(theme, operation.spaceAfterLabel, operation, index, "spaceAfterLabel");
      total += estimateSpacerFromStyle(style, index);
    }
    return total;
  }

  if (operation.type === "text") {
    const style = resolveLabelStyle(theme, operation.label, operation, index);
    const lineHeightMm = style.lineHeightMm || resolveLineHeightMm(Number(style.fontSize) || 10, style.lineHeight);
    const margins = getStyleMarginsMm(style);
    const padding = getTextPaddingMm(style);

    let lineCount;
    if (ctx.maxTextLines > 0) {
      lineCount = ctx.maxTextLines;
    } else {
      const x = operation.xMm !== undefined ? operation.xMm : core.marginLeftMm;
      const maxWidth = operation.maxWidthMm !== undefined
        ? operation.maxWidthMm
        : core.pageWidth - core.marginRightMm - x;
      const innerWidth = maxWidth - padding.left - padding.right;
      if (innerWidth <= 0) {
        throw new Error(`Operation ${index} (${operation.type}) has non-positive inner width after padding`);
      }
      const text = applyTextTransform(
        String(operation.text !== undefined ? operation.text : ""),
        style.textTransform
      );
      const lines = operation.wrap === false
        ? [text]
        : core.measureWrappedLines(text, innerWidth, style);
      lineCount = Math.max(lines.length, 1);
    }

    return margins.top + padding.top + (lineCount * lineHeightMm) + padding.bottom + margins.bottom;
  }

  if (operation.type === "row") {
    const leftStyle = resolveLabelStyle(theme, operation.leftLabel, operation, index, "leftLabel");
    const rightStyle = resolveLabelStyle(theme, operation.rightLabel, operation, index, "rightLabel");
    const leftMargins = getStyleMarginsMm(leftStyle);
    const rightMargins = getStyleMarginsMm(rightStyle);
    const top = Math.max(leftMargins.top, rightMargins.top);
    const bottom = Math.max(leftMargins.bottom, rightMargins.bottom);
    const leftHeight = resolveLineHeightMm(Number(leftStyle.fontSize) || 10, leftStyle.lineHeight);
    const rightHeight = resolveLineHeightMm(Number(rightStyle.fontSize) || 10, rightStyle.lineHeight);
    return top + Math.max(leftHeight, rightHeight) + bottom;
  }

  if (operation.type === "bullet") {
    const style = resolveLabelStyle(theme, operation.label, operation, index);
    const x = operation.xMm !== undefined ? operation.xMm : core.marginLeftMm;
    const textIndentMm = operation.textIndentMm !== undefined
      ? operation.textIndentMm
      : (theme.layout && Number(theme.layout.bulletIndentMm)) || 4;
    const maxWidth = operation.maxWidthMm !== undefined
      ? operation.maxWidthMm
      : core.pageWidth - core.marginRightMm - (x + textIndentMm);
    const text = applyTextTransform(
      String(operation.text !== undefined ? operation.text : ""),
      style.textTransform
    );
    const lines = core.measureWrappedLines(text, maxWidth, style);
    const lineCount = Math.max(lines.length, 1);
    const lineHeightMm = style.lineHeightMm || resolveLineHeightMm(Number(style.fontSize) || 10, style.lineHeight);
    const margins = getStyleMarginsMm(style);
    return margins.top + (lineCount * lineHeightMm) + margins.bottom;
  }

  if (operation.type === "divider") {
    const style = resolveLabelStyle(theme, operation.label, operation, index);
    const margins = getStyleMarginsMm(style);
    return margins.top + (Number(style.lineWidth) || 0.3) + margins.bottom;
  }

  if (operation.type === "spacer") {
    if (operation.mm !== undefined) {
      return Number(operation.mm) || 0;
    }
    if (operation.px !== undefined) {
      return pxToMm(operation.px);
    }
    if (operation.label) {
      const style = resolveLabelStyle(theme, operation.label, operation, index);
      return estimateSpacerFromStyle(style, index);
    }
    throw new Error(`Spacer operation at index ${index} must provide mm, px, or label with spaceMm/spacePx`);
  }

  if (operation.type === "hiddenText") {
    return 0;
  }

  if (operation.type === "table") {
    const cellStyle = resolveLabelStyle(theme, operation.label, operation, index);
    const headerStyle = operation.headerLabel
      ? resolveLabelStyle(theme, operation.headerLabel, operation, index, "headerLabel")
      : null;
    const margins = getStyleMarginsMm(cellStyle);
    const cellPad = Number(cellStyle.cellPaddingMm) || 0;
    const headerPad = headerStyle ? (Number(headerStyle.cellPaddingMm) || 0) : cellPad;
    const x = operation.xMm !== undefined ? operation.xMm : core.marginLeftMm;
    const maxWidth = operation.maxWidthMm !== undefined
      ? operation.maxWidthMm
      : core.pageWidth - core.marginRightMm - x;
    const columns = resolveTableColumns(operation.columns, maxWidth);
    const colX = [];
    let cx = x;
    for (let c = 0; c < columns.length; c++) {
      colX.push(cx);
      cx += columns[c].widthMm;
    }

    let total = margins.top;

    // Header height
    if (headerStyle && operation.headerLabel) {
      const headers = (operation.columns || []).map(function (col) { return col.header || ""; });
      total += core._measureTableRowHeight(headers, columns, colX, headerStyle, headerPad);
    }

    // Data row heights
    const rows = operation.rows || [];
    for (let r = 0; r < rows.length; r++) {
      total += core._measureTableRowHeight(rows[r], columns, colX, cellStyle, cellPad);
    }

    total += margins.bottom;
    return total;
  }

  const plugin = getPlugin(operation.type);
  if (plugin) {
    if (typeof plugin.estimateHeight === "function") {
      return plugin.estimateHeight({ core, operation, theme, index });
    }
    return 20;
  }

  throw new Error(`Unsupported operation type "${operation.type}" at index ${index}`);
}

function moveFromSpacerStyle(core, style, index) {
  if (style.spaceMm !== undefined) {
    core.moveDown(Number(style.spaceMm) || 0);
    return;
  }
  if (style.spacePx !== undefined) {
    core.moveDown(pxToMm(style.spacePx));
    return;
  }
  throw new Error(`Spacer style at index ${index} must contain spaceMm or spacePx`);
}

function estimateSpacerFromStyle(style, index) {
  if (style.spaceMm !== undefined) {
    return Number(style.spaceMm) || 0;
  }
  if (style.spacePx !== undefined) {
    return pxToMm(style.spacePx);
  }
  throw new Error(`Spacer style at index ${index} must contain spaceMm or spacePx`);
}

function normalizeKeepWithNext(value) {
  if (value === true) {
    return 1;
  }
  const n = Number(value);
  if (Number.isInteger(n) && n > 0) {
    return n;
  }
  return 0;
}

function applyPageTokens(value, core) {
  if (value === undefined || value === null) {
    return "";
  }
  const page = core.doc.getNumberOfPages();
  return String(value).replace(/\{\{page\}\}/g, String(page));
}

function getHorizontalBounds(core, bypassMargins) {
  if (bypassMargins) {
    return { left: 0, right: core.pageWidth };
  }
  return {
    left: core.marginLeftMm,
    right: core.pageWidth - core.marginRightMm,
  };
}

function validatePointInsideBounds(fieldName, value, bounds, index, bypassMargins) {
  if (bypassMargins) {
    return;
  }
  if (value < bounds.left || value > bounds.right) {
    throw new Error(
      `Operation ${index} has ${fieldName}=${value} outside content bounds (${bounds.left}..${bounds.right})`
    );
  }
}

function countLeafOperations(operations) {
  let count = 0;
  operations.forEach((operation) => {
    if (operation && operation.type === "block" && Array.isArray(operation.children)) {
      count += countLeafOperations(operation.children);
      return;
    }
    count += 1;
  });
  return count;
}

function resolveLabelStyle(theme, label, operation, index, fieldName, optional) {
  if (!label) {
    if (optional) {
      return null;
    }
    const keyName = fieldName || "label";
    throw new Error(`Operation ${index} (${operation.type}) is missing ${keyName}`);
  }
  if (!theme.labels || !theme.labels[label]) {
    if (optional) {
      return null;
    }
    throw new Error(`No theme style found for label "${label}" (operation ${index}, type ${operation.type})`);
  }
  return theme.labels[label];
}

/**
 * Strip background/border properties from a style so drawText
 * renders text only, without drawing its own container rect.
 */
function stripContainerProps(style) {
  const s = Object.assign({}, style);
  delete s.backgroundColor;
  delete s.borderWidthMm;
  delete s.borderWidth;
  delete s.borderColor;
  delete s.borderRadiusMm;
  delete s.leftBorder;
  return s;
}

/**
 * Resolve column width definitions to absolute mm values.
 * Accepts: "30%" (percentage of available width), 35 (fixed mm), or undefined (auto-divide).
 * @param {Array<object>} columns
 * @param {number} availableWidth
 * @returns {Array<{widthMm: number, align: string}>}
 */
function resolveTableColumns(columns, availableWidth) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error("Table operation requires a non-empty columns array");
  }

  let usedWidth = 0;
  let autoCount = 0;
  const resolved = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const align = col.align || "left";

    if (col.width === undefined || col.width === null) {
      resolved.push({ widthMm: null, align });
      autoCount++;
    } else if (typeof col.width === "string" && col.width.endsWith("%")) {
      const pct = parseFloat(col.width) / 100;
      const w = pct * availableWidth;
      resolved.push({ widthMm: w, align });
      usedWidth += w;
    } else {
      const w = Number(col.width) || 0;
      resolved.push({ widthMm: w, align });
      usedWidth += w;
    }
  }

  if (autoCount > 0) {
    const autoWidth = (availableWidth - usedWidth) / autoCount;
    for (let i = 0; i < resolved.length; i++) {
      if (resolved[i].widthMm === null) {
        resolved[i].widthMm = autoWidth;
      }
    }
  }

  return resolved;
}

module.exports = {
  renderDocument,
};
