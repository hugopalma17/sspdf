const { hasPlugin } = require("./plugin-registry");

const OPERATION_TYPES = new Set([
  "text", "row", "bullet", "divider", "spacer", "hiddenText",
  "block", "group", "section", "quote", "table", "image", "columns",
]);

function validateSource(source) {
  if (Array.isArray(source)) {
    source.forEach((op, i) => validateOperation(op, `source[${i}]`));
    return;
  }
  if (!source || typeof source !== "object") {
    throw new Error("Source must be an object or array");
  }
  const ops = source.operations || source.content || source.items || source.sections || source.children;
  if (Array.isArray(ops)) {
    ops.forEach((op, i) => validateOperation(op, `source[${i}]`));
    return;
  }
  throw new Error("Source must contain operations, content, items, sections, or children array");
}

function validateOperation(op, path) {
  if (!op || typeof op !== "object") {
    throw new Error(`${path}: operation must be an object`);
  }

  // Sugar: { label, text/value }
  if (!op.type && op.label && (op.text !== undefined || op.value !== undefined)) {
    return;
  }

  if (!op.type) {
    throw new Error(`${path}: missing type`);
  }

  const type = op.type;

  if (type === "text") {
    if (!op.label) throw new Error(`${path}: text requires label`);
    if (op.text === undefined) throw new Error(`${path}: text requires text`);
    return;
  }

  if (type === "row") {
    if (!op.leftLabel) throw new Error(`${path}: row requires leftLabel`);
    if (!op.rightLabel) throw new Error(`${path}: row requires rightLabel`);
    if (op.leftText === undefined) throw new Error(`${path}: row requires leftText`);
    if (op.rightText === undefined) throw new Error(`${path}: row requires rightText`);
    return;
  }

  if (type === "bullet") {
    if (!op.label) throw new Error(`${path}: bullet requires label`);
    if (op.text === undefined && !op.items && !op.bullets) {
      throw new Error(`${path}: bullet requires text, items, or bullets`);
    }
    return;
  }

  if (type === "divider") {
    if (!op.label) throw new Error(`${path}: divider requires label`);
    return;
  }

  if (type === "spacer") {
    if (op.mm === undefined && op.px === undefined && !op.label) {
      throw new Error(`${path}: spacer requires mm, px, or label`);
    }
    return;
  }

  if (type === "hiddenText") {
    if (!op.label) throw new Error(`${path}: hiddenText requires label`);
    if (op.text === undefined) throw new Error(`${path}: hiddenText requires text`);
    return;
  }

  if (type === "quote") {
    if (!op.label) throw new Error(`${path}: quote requires label`);
    if (op.text === undefined) throw new Error(`${path}: quote requires text`);
    return;
  }

  if (type === "table") {
    if (!op.label) throw new Error(`${path}: table requires label`);
    if (!Array.isArray(op.columns) || op.columns.length === 0) {
      throw new Error(`${path}: table requires non-empty columns array`);
    }
    if (!Array.isArray(op.rows)) {
      throw new Error(`${path}: table requires rows array`);
    }
    return;
  }

  if (type === "image") {
    if (!op.src) throw new Error(`${path}: image requires src`);
    return;
  }

  if (type === "block" || type === "group" || type === "section") {
    const children = op.children || op.content || op.items || op.sections;
    if (!Array.isArray(children)) {
      throw new Error(`${path}: ${type} requires children array`);
    }
    children.forEach((child, i) => validateOperation(child, `${path}.children[${i}]`));
    return;
  }

  if (type === "columns") {
    if (!Array.isArray(op.column1)) {
      throw new Error(`${path}: columns requires column1 array`);
    }
    if (!Array.isArray(op.column2)) {
      throw new Error(`${path}: columns requires column2 array`);
    }
    op.column1.forEach((child, i) => validateOperation(child, `${path}.column1[${i}]`));
    op.column2.forEach((child, i) => validateOperation(child, `${path}.column2[${i}]`));
    return;
  }

  if (hasPlugin(type)) {
    return;
  }

  if (!OPERATION_TYPES.has(type)) {
    throw new Error(`${path}: unknown operation type "${type}"`);
  }
}

function validateTheme(theme) {
  if (!theme || typeof theme !== "object") {
    throw new Error("Theme must be an object");
  }
  if (!theme.labels || typeof theme.labels !== "object") {
    throw new Error("Theme must have a labels object");
  }
}

function validateSourceAgainstTheme(source, theme) {
  validateTheme(theme);
  const labels = new Set(Object.keys(theme.labels));
  const missing = [];
  collectLabels(source, missing, labels);
  if (missing.length > 0) {
    throw new Error(`Missing theme labels: ${[...new Set(missing)].join(", ")}`);
  }
}

function collectLabels(node, missing, themeLabels) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectLabels(n, missing, themeLabels));
    return;
  }
  if (!node || typeof node !== "object") return;

  const ops = node.operations || node.content || node.items || node.sections || node.children;
  if (Array.isArray(ops)) {
    ops.forEach((n) => collectLabels(n, missing, themeLabels));
  }

  if (node.label && !themeLabels.has(node.label)) missing.push(node.label);
  if (node.leftLabel && !themeLabels.has(node.leftLabel)) missing.push(node.leftLabel);
  if (node.rightLabel && !themeLabels.has(node.rightLabel)) missing.push(node.rightLabel);
  if (node.markerLabel && !themeLabels.has(node.markerLabel)) missing.push(node.markerLabel);
  if (node.headerLabel && !themeLabels.has(node.headerLabel)) missing.push(node.headerLabel);
  if (node.spaceAfterLabel && !themeLabels.has(node.spaceAfterLabel)) missing.push(node.spaceAfterLabel);

  if (node.captionLabel && !themeLabels.has(node.captionLabel)) missing.push(node.captionLabel);

  if (node.type === "quote" && node.attribution) {
    const attrLabel = node.attributionLabel || (node.label + ".attribution");
    if (!themeLabels.has(attrLabel)) missing.push(attrLabel);
  }

  if (node.type === "image" && node.caption && !node.captionLabel && node.label) {
    const capLabel = node.label + ".caption";
    if (!themeLabels.has(capLabel)) missing.push(capLabel);
  }
}

module.exports = {
  validateSource,
  validateTheme,
  validateSourceAgainstTheme,
};
