const assert = require("assert");

const registry = [];

/**
 * Register a test case.
 * @param {string} name
 * @param {Function} fn
 */
function test(name, fn) {
  registry.push({ name, fn });
}

/**
 * Run all registered tests.
 * Supports sync and async test functions.
 */
async function run() {
  let passed = 0;
  let failed = 0;

  for (const item of registry) {
    try {
      await item.fn();
      passed += 1;
      console.log(`[PASS] ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`[FAIL] ${item.name}`);
      console.error(error && error.stack ? error.stack : error);
    }
  }

  console.log(`\n[RESULT] Passed: ${passed} | Failed: ${failed} | Total: ${registry.length}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  test,
  run,
  assert,
};
