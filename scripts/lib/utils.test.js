import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dedup } from './utils.js';

describe('dedup', () => {
  it('removes duplicate job_ids', () => {
    const jobs = [
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'b-2', title: 'RN', hospital: 'Y', link: 'http://y' },
    ];
    const result = dedup(jobs);
    assert.equal(result.length, 2);
    assert.equal(result[0].job_id, 'a-1');
    assert.equal(result[1].job_id, 'b-2');
  });

  it('returns all jobs when no duplicates', () => {
    const jobs = [
      { job_id: 'a-1', title: 'RN', hospital: 'X', link: 'http://x' },
      { job_id: 'b-2', title: 'RN', hospital: 'Y', link: 'http://y' },
    ];
    assert.equal(dedup(jobs).length, 2);
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(dedup([]), []);
  });
});
