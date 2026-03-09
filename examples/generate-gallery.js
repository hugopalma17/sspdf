const fs = require("fs");
const path = require("path");
const { renderDocument } = require("../core/render-document");
const gallery = require("./example-gallery");

const outputDir = path.join(__dirname, "..", "output");
fs.mkdirSync(outputDir, { recursive: true });

gallery.forEach((entry) => {
  const outputPath = path.join(outputDir, entry.outputName);
  const result = renderDocument({
    source: entry.source,
    theme: entry.theme,
    outputPath,
  });

  console.log(`[OK] ${entry.title}`);
  console.log(`     output: ${outputPath}`);
  console.log(`     operations: ${result.operationsCount}`);
});
