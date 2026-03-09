const fs = require("fs");
const path = require("path");
const { renderDocument } = require("../core/render-document");
const theme = require("./themes/theme-default");
const source = require("./sources/source-generic.json");

const outputDir = path.join(__dirname, "..", "output");
const outputPath = path.join(outputDir, "generic-document.pdf");

fs.mkdirSync(outputDir, { recursive: true });

const result = renderDocument({
  source,
  theme,
  outputPath,
});

console.log(`[OK] PDF generated at: ${outputPath}`);
console.log(`[INFO] Operations executed: ${result.operationsCount}`);
