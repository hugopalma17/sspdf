#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { renderDocument } = require("../core/render-document");
const themeDefault = require("../examples/themes/theme-default");
const themeEditorial = require("../examples/themes/theme-editorial");

const THEMES = {
  default: themeDefault,
  editorial: themeEditorial,
};

function parseArgs(argv) {
  const out = {
    theme: "default",
    input: null,
    output: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--theme") {
      out.theme = argv[++i];
    } else if (arg === "--input") {
      out.input = argv[++i];
    } else if (arg === "--output") {
      out.output = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      out.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return out;
}

function resolveTheme(name) {
  if (THEMES[name]) {
    return THEMES[name];
  }
  throw new Error(`Unknown theme "${name}". Use: ${Object.keys(THEMES).join("|")}`);
}

function readSourceJson(inputPath) {
  let raw = "";

  if (inputPath) {
    raw = fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf8");
  } else {
    raw = fs.readFileSync(0, "utf8");
  }

  if (!raw || !raw.trim()) {
    throw new Error("No JSON input found. Use --input <file> or pipe JSON via stdin.");
  }

  return JSON.parse(raw);
}

function printHelp() {
  console.log("Usage:");
  console.log("  node render-cli.js --output <file.pdf> [--input file.json] [--theme default|editorial]");
  console.log("");
  console.log("Examples:");
  console.log("  cat source.json | node render-cli.js --output out.pdf");
  console.log("  node render-cli.js --input source.json --theme editorial --output out.pdf");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const source = readSourceJson(args.input);
  const theme = resolveTheme(args.theme);
  const outputPath = path.resolve(
    process.cwd(),
    args.output || path.join("output", "cli-output.pdf")
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const result = renderDocument({
    source,
    theme,
    outputPath,
  });

  console.log(`[OK] Rendered ${result.operationsCount} operations`);
  console.log(`[OK] Output: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
}
