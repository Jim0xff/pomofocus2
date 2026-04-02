import test from 'node:test';
import assert from 'node:assert/strict';

import { percentile, stageTargets, summarizeScenario } from '../src/load-test.js';

test('percentile returns p95 for sorted and unsorted latency inputs', () => {
  assert.equal(percentile([40, 10, 30, 20, 50], 95), 50);
  assert.equal(percentile([], 95), 0);
});

test('stageTargets expands staged concurrency profile into per-second targets', () => {
  assert.deepEqual(
    stageTargets([
      { durationSeconds: 2, targetConcurrency: 10 },
      { durationSeconds: 2, targetConcurrency: 10 },
      { durationSeconds: 2, targetConcurrency: 0 },
    ]),
    [
      { second: 1, targetConcurrency: 5 },
      { second: 2, targetConcurrency: 10 },
      { second: 3, targetConcurrency: 10 },
      { second: 4, targetConcurrency: 10 },
      { second: 5, targetConcurrency: 5 },
      { second: 6, targetConcurrency: 0 },
    ],
  );
});

test('summarizeScenario reports latency, unexpected 5xx rate, and DB insert verification', () => {
  assert.deepEqual(
    summarizeScenario({
      name: 'submit',
      targetConcurrency: 100,
      stages: [{ durationSeconds: 3, targetConcurrency: 100 }],
      startedRequests: 5,
      completedRequests: 5,
      successCount: 4,
      unexpected5xxCount: 1,
      errorCount: 0,
      latenciesMs: [10, 20, 30, 40, 50],
      statusCounts: { 201: 4, 500: 1 },
      dbRowsBefore: 7,
      dbRowsAfter: 11,
    }),
    {
      name: 'submit',
      targetConcurrency: 100,
      stages: [{ durationSeconds: 3, targetConcurrency: 100 }],
      startedRequests: 5,
      completedRequests: 5,
      successCount: 4,
      unexpected5xxCount: 1,
      unexpected5xxRate: 0.2,
      errorCount: 0,
      p95LatencyMs: 50,
      statusCounts: { 201: 4, 500: 1 },
      dbRowsBefore: 7,
      dbRowsAfter: 11,
      dbInsertedRows: 4,
      dbInsertMatchesSuccessCount: true,
    },
  );
});
