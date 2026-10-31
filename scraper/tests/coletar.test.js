/**
 * Tests for the queue of collections requested on the site
 */

import assert from 'assert';
import { processarColetas } from '../coletar.js';

/** In-memory stand-in for the coletas table */
function fakeSupabase(rows) {
  return {
    from() {
      return {
        select() {
          const query = {
            eq: () => query,
            order: () => query,
            limit: async () => ({
              data: rows.filter((row) => row.status === 'pendente').slice(0, 1),
              error: null,
            }),
          };
          return query;
        },
        update(fields) {
          return {
            eq: async (column, value) => {
              rows
                .filter((row) => row[column] === value)
                .forEach((row) => Object.assign(row, fields));
              return { error: null };
            },
          };
        },
      };
    },
  };
}

const pendente = (id) => ({ id, servico: 'som', regiao: 'Niterói', status: 'pendente' });

describe('processarColetas', () => {
  it('processes every pending collection and records what was found', async () => {
    const rows = [pendente('a'), pendente('b')];
    const seen = [];

    const result = await processarColetas(fakeSupabase(rows), async (servico, regiao, options) => {
      seen.push({ servico, regiao, status: rows.find((r) => r.status === 'rodando')?.id, options });
      return { status: 'success', saved: 7 };
    });

    assert.deepStrictEqual(result, { processed: 2, blocked: false });
    assert.deepStrictEqual(rows.map((r) => [r.status, r.encontrados]), [['concluida', 7], ['concluida', 7]]);
    assert.strictEqual(seen[0].status, 'a', 'Should mark the collection as running first');
    assert.strictEqual(seen[0].options.hideContacts, true, 'Public logs must not show contacts');
  });

  it('marks a failed collection and continues with the next one', async () => {
    const rows = [pendente('a'), pendente('b')];
    let calls = 0;

    await processarColetas(fakeSupabase(rows), async () => {
      calls++;
      return calls === 1 ? { status: 'error', saved: 0, message: 'technical detail' } : { status: 'success', saved: 3 };
    });

    assert.strictEqual(rows[0].status, 'falhou');
    assert.ok(!rows[0].erro.includes('technical detail'), 'The team sees a clear message');
    assert.strictEqual(rows[1].status, 'concluida');
  });

  it('stops when Google blocks, without insisting on the next ones', async () => {
    const rows = [pendente('a'), pendente('b')];
    let calls = 0;

    const result = await processarColetas(fakeSupabase(rows), async () => {
      calls++;
      return { status: 'blocked', saved: 0 };
    });

    assert.strictEqual(calls, 1);
    assert.strictEqual(result.blocked, true);
    assert.deepStrictEqual(rows.map((r) => r.status), ['falhou', 'falhou']);
    assert.ok(rows[1].erro.includes('bloqueou'));
  });

  it('finishes when nothing is pending', async () => {
    const result = await processarColetas(fakeSupabase([]), async () => {
      throw new Error('Should not scrape');
    });

    assert.deepStrictEqual(result, { processed: 0, blocked: false });
  });
});
