/**
 * Test runner for all scraper tests
 * Runs test-validator.js and integration.test.js
 */

import assert from 'assert';

let testsPassed = 0;
let testsFailed = 0;
const pendingTests = [];

// Mock describe and it functions for compatibility
global.describe = (name, fn) => {
  console.log(`\n${name}`);
  fn();
};

global.it = (name, fn) => {
  // Check if it's an async function
  if (fn.constructor.name === 'AsyncFunction') {
    const testPromise = fn().then(
      () => {
        console.log(`  ✓ ${name}`);
        testsPassed++;
      },
      (err) => {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        testsFailed++;
      }
    );
    pendingTests.push(testPromise);
  } else {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      testsFailed++;
    }
  }
};

// Import and run tests
async function runTests() {
  try {
    console.log('========================================');
    console.log('Running Scraper Tests');
    console.log('========================================');

    // Run validator tests
    console.log('\n--- Running Validator Tests ---');
    await import('./tests/test-validator.js');

    // Run integration tests
    console.log('\n--- Running Integration Tests ---');
    await import('./tests/integration.test.js');

    // Wait for all pending async tests
    await Promise.all(pendingTests);

    // Print summary
    console.log('\n\n========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Total:  ${testsPassed + testsFailed}`);
    console.log('========================================\n');

    process.exitCode = testsFailed > 0 ? 1 : 0;
  } catch (err) {
    console.error('Failed to run tests:', err.message);
    process.exit(1);
  }
}

runTests();
