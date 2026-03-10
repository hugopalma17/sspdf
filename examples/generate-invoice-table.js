const { renderDocument } = require("../index");
const theme = require("./themes/theme-default");
const source = require("./sources/source-invoice-table.json");

const { buffer, operationsCount } = renderDocument({
  source,
  theme,
  outputPath: "output/invoice-table.pdf",
});

console.log(`Generated invoice-table.pdf (${operationsCount} operations, ${buffer.length} bytes)`);
