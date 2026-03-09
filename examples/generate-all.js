const fs = require("fs");
const path = require("path");
const { renderDocument } = require("../core/render-document");

const pairs = [
  { source: "source-generic.json", theme: "theme-default", output: "generic-document.pdf" },
  { source: "source-article.json", theme: "theme-default", output: "article.pdf" },
  { source: "source-invoice.json", theme: "theme-default", output: "invoice.pdf" },
  { source: "source-linked-sections.json", theme: "theme-default", output: "linked-sections.pdf" },
  { source: "source-magazine.json", theme: "theme-editorial", output: "magazine.pdf" },
  { source: "source-styled-invoice.json", theme: "theme-editorial", output: "styled-invoice.pdf" },
  { source: "source-newspaper-frontpage.json", theme: "theme-newsprint", output: "newspaper-frontpage.pdf" },
  { source: "source-board-brief.json", theme: "theme-corporate", output: "board-brief.pdf" },
  { source: "source-event-program.json", theme: "theme-program", output: "event-program.pdf" },
  { source: "source-certificate.json", theme: "theme-ceremony", output: "certificate.pdf" },
];

const outputDir = path.join(__dirname, "..", "output");
fs.mkdirSync(outputDir, { recursive: true });

let ok = 0;
let fail = 0;

pairs.forEach(({ source, theme, output }) => {
  try {
    const src = require(`./sources/${source}`);
    const thm = require(`./themes/${theme}`);
    const outputPath = path.join(outputDir, output);

    const result = renderDocument({ source: src, theme: thm, outputPath });
    console.log(`[OK] ${output} (${result.operationsCount} ops, ${result.pagesUsed} pages)`);
    ok++;
  } catch (err) {
    console.error(`[FAIL] ${output}: ${err.message}`);
    fail++;
  }
});

console.log(`\nDone: ${ok} generated, ${fail} failed.`);
if (fail > 0) process.exit(1);
