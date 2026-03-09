const fs = require("fs");
const path = require("path");
const { renderDocument, registerPlugin, plugins } = require("../index");
const theme = require("./themes/theme-newsprint");

registerPlugin("chart", plugins.chart);

const outputDir = path.join(__dirname, "..", "output");
fs.mkdirSync(outputDir, { recursive: true });

const chartOp = {
  type: "chart",
  chartType: "bar",
  widthMm: 160,
  heightMm: 90,
  canvasWidth: 1600,
  canvasHeight: 900,
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [
      {
        label: "Revenue",
        data: [120000, 145000, 138000, 172000],
        backgroundColor: "rgba(110, 158, 210, 0.80)"
      }
    ]
  },
  options: {
    scales: { y: { beginAtZero: true } },
    layout: { padding: { bottom: 10 } }
  }
};

async function main() {
  await plugins.chart.preRender(chartOp);

  const result = renderDocument({
    source: {
      sections: [
        {
          type: "section",
          content: [
            { type: "text", label: "news.headline", text: "Chart Plugin Test" },
            { type: "divider", label: "news.rule.light" },
            chartOp,
            { type: "text", label: "news.body", text: "Chart rendered via Chart.js + chartjs-node-canvas and embedded as PNG." }
          ]
        }
      ]
    },
    theme,
    outputPath: path.join(outputDir, "chart-test.pdf"),
  });

  console.log(`[OK] PDF generated at: output/chart-test.pdf`);
  console.log(`[INFO] Operations executed: ${result.operationsCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });
