import assert from 'node:assert/strict';
import test from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import { creationTime } from '../lib/utils/creation-time.ts';

test('sorts Firestore, JSON and Date records by the same timestamp', () => {
  const old = Date.UTC(2025, 0, 1);
  const recent = Date.UTC(2026, 8, 22);
  const records = [
    { id: 'old', created_at: Timestamp.fromMillis(old) },
    { id: 'json', created_at: new Date(recent).toISOString() },
    { id: 'date', created_at: new Date(recent + 1) },
    { id: 'unknown' },
  ];
  records.sort((a, b) => creationTime(b.created_at) - creationTime(a.created_at));
  assert.deepEqual(records.map(record => record.id), ['date', 'json', 'old', 'unknown']);
  assert.equal(creationTime(recent), recent);
});

test('missing or malformed dates do not create an invalid sort order', () => {
  for (const value of [null, undefined, 'bad-date', {}, NaN, new Date(NaN)]) {
    assert.equal(creationTime(value), 0);
  }
});
