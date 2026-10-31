/**
 * Integration tests for end-to-end scraper
 * Tests the complete workflow with mock data
 */

import assert from 'assert';
import { runScraper } from '../main.js';

describe('End-to-end scraper', () => {
  it('scrapes and saves suppliers from mock Google Maps', async () => {
    const result = await runScraper('catering', 'São Paulo', { mock: true });
    assert(result.saved >= 2, 'Should save at least 2 suppliers');
    assert.strictEqual(result.errors, 0, 'Should have no errors');
    assert(result.duration < 30000, 'Should complete under 30 seconds'); // under 30s with mock
  });

  it('logs progress for each supplier', async () => {
    const logs = [];
    const result = await runScraper('catering', 'São Paulo', {
      mock: true,
      onLog: (msg) => logs.push(msg)
    });
    assert(logs.some(l => l.includes('Searching')), 'Should log searching step');
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
