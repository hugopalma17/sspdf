#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { renderDocument, registerPlugin, plugins } = require("./index");

const EXAMPLES_THEMES_DIR = path.join(__dirname, "examples", "themes");

function parseArgs(argv) {
  const out = { source: null, theme: null, output: null, help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--source" || arg === "-s") {
      out.source = argv[++i];
    } else if (arg === "--theme" || arg === "-t") {
      out.theme = argv[++i];
    } else if (arg === "--output" || arg === "-o") {
      out.output = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return out;
}

function resolveTheme(themePath) {
  if (!themePath) {
    throw new Error("Missing --theme. Provide a path to a theme .js file or a built-in name.");
  }

  // Try as a built-in name first (e.g., "newsprint" → examples/themes/theme-newsprint.js)
  const builtIn = path.join(EXAMPLES_THEMES_DIR, `theme-${themePath}.js`);
  if (fs.existsSync(builtIn)) {
    return require(builtIn);
  }

  // Try as a direct path
  const resolved = path.resolve(process.cwd(), themePath);
  if (fs.existsSync(resolved)) {
    return require(resolved);
  }

  // List available built-ins
  const available = listBuiltInThemes();
  throw new Error(
    `Theme not found: "${themePath}"\n` +
    `  Built-in themes: ${available.join(", ")}\n` +
    `  Or provide a path to a .js theme file.`
  );
}

function listBuiltInThemes() {
  try {
    return fs.readdirSync(EXAMPLES_THEMES_DIR)
      .filter((f) => f.startsWith("theme-") && f.endsWith(".js"))
      .map((f) => f.replace("theme-", "").replace(".js", ""));
  } catch (e) {
    return [];
  }
}

function readSource(sourcePath) {
  let raw = "";

  if (sourcePath) {
    raw = fs.readFileSync(path.resolve(process.cwd(), sourcePath), "utf8");
  } else if (!process.stdin.isTTY) {
    raw = fs.readFileSync(0, "utf8");
  } else {
    throw new Error("Missing --source. Provide a path to a .json file or pipe JSON via stdin.");
  }

  if (!raw || !raw.trim()) {
    throw new Error("Empty source input.");
  }

  return JSON.parse(raw);
}

function printHelp() {
  const themes = listBuiltInThemes();
  console.log(`
sspdf CLI - Render a source JSON + theme into a PDF.

Usage:
  node cli.js --source <file.json> --theme <theme> --output <file.pdf>
  cat source.json | node cli.js --theme <theme> --output out.pdf

Options:
  -s, --source <path>   Path to source JSON file (or pipe via stdin)
  -t, --theme <name|path>  Built-in theme name or path to a .js theme file
  -o, --output <path>   Output PDF path (default: output/cli-output.pdf)
  -h, --help            Show this help

Built-in themes: ${themes.join(", ")}

Examples:
  node cli.js -s examples/sources/source-article.json -t default -o output/article.pdf
  node cli.js -s my-source.json -t ./my-theme.js -o my-doc.pdf
  cat data.json | node cli.js -t newsprint -o output/newspaper.pdf
`.trim());
}

function collectChartOps(obj) {
  const charts = [];
  if (!obj || typeof obj !== "object") return charts;
  if (Array.isArray(obj)) {
    obj.forEach((item) => charts.push(...collectChartOps(item)));
  } else {
    if (obj.type === "chart") charts.push(obj);
    for (const key of ["operations", "sections", "content", "items", "children"]) {
      if (Array.isArray(obj[key])) charts.push(...collectChartOps(obj[key]));
    }
    if (obj.pageTemplates) {
      if (Array.isArray(obj.pageTemplates.header)) charts.push(...collectChartOps(obj.pageTemplates.header));
      if (Array.isArray(obj.pageTemplates.footer)) charts.push(...collectChartOps(obj.pageTemplates.footer));
    }
  }
  return charts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const source = readSource(args.source);
  const theme = resolveTheme(args.theme);
  const outputPath = path.resolve(
    process.cwd(),
    args.output || path.join("output", "cli-output.pdf")
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const chartOps = collectChartOps(source);
  if (chartOps.length > 0) {
    registerPlugin("chart", plugins.chart);
    for (const op of chartOps) {
      await plugins.chart.preRender(op);
    }
  }

  const result = renderDocument({ source, theme, outputPath });

  console.log(`[OK] ${result.operationsCount} operations rendered`);
  console.log(`[OK] ${outputPath}`);
}

main().catch((err) => {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
});
