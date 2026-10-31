/**
 * Integration test runner
 * Runs tests with mock data
 */

import assert from 'assert';
import { runScraper } from './main.js';

const tests = [];
let passed = 0;
let failed = 0;

/**
 * Test runner helper
 */
function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Describe helper (simplified)
 */
function describe(name, callback) {
  console.log(`\n${name}`);
  callback();
}

/**
 * It helper (simplified)
 */
function it(name, fn) {
  test(name, fn);
}

// Define tests
describe('End-to-end scraper', () => {
  it('scrapes and saves suppliers from mock Google Maps', async () => {
    const result = await runScraper('catering', 'São Paulo', { mock: true });
    assert(result.saved >= 2, `Expected saved >= 2, got ${result.saved}`);
    assert.strictEqual(result.errors, 0, `Expected errors = 0, got ${result.errors}`);
    assert(result.duration < 30000, `Expected duration < 30000, got ${result.duration}`);
  });

  it('logs progress for each supplier', async () => {
    const logs = [];
    const result = await runScraper('catering', 'São Paulo', {
      mock: true,
      onLog: (msg) => logs.push(msg)
    });
    assert(logs.some(l => l.includes('Searching') || l.includes('Found')), 'Should log searching step');
    assert(logs.some(l => l.includes('Extracting')), 'Should log extraction step');
    assert(logs.some(l => l.includes('Saved')), 'Should log save confirmation');
  });

  it('handles IP block gracefully', async () => {
    const result = await runScraper('catering', 'São Paulo', { mock: 'blocked' });
    assert.strictEqual(result.status, 'blocked', 'Should return blocked status');
    assert(result.message.includes('wait'), 'Message should suggest waiting');
  });

  it('handles missing service/region arguments', async () => {
    const result = await runScraper(null, null, { mock: true });
    assert.strictEqual(result.status, 'error', 'Should return error status');
    assert(result.message.includes('required'), 'Message should mention required fields');
  });

  it('returns proper structure with all fields', async () => {
    const result = await runScraper('catering', 'São Paulo', { mock: true });
    assert(result.status, 'Should have status field');
    assert(typeof result.saved === 'number', 'Should have saved count');
    assert(typeof result.errors === 'number', 'Should have errors count');
    assert(typeof result.duration === 'number', 'Should have duration');
  });

  it('stops gracefully on Supabase connection error', async () => {
    const result = await runScraper('catering', 'São Paulo', { mock: 'supabase-error' });
    assert.strictEqual(result.status, 'error', 'Should return error status');
    assert(result.message.includes('Supabase'), 'Message should mention Supabase');
  });
});

/**
 * Run all tests
 */
async function runTests() {
  console.log('========================================');
  console.log('Running Integration Tests');
  console.log('========================================');

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
