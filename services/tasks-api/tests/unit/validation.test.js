'use strict';

const { validateTask, summarize } = require('../../src/validation');

describe('validateTask', () => {
  test('accepts a minimal valid payload and applies defaults', () => {
    const result = validateTask({ title: 'Write the report' });
    expect(result.valid).toBe(true);
    expect(result.value).toEqual({ title: 'Write the report', priority: 2, done: false });
  });

  test('trims the title', () => {
    const result = validateTask({ title: '   spaced   ' });
    expect(result.valid).toBe(true);
    expect(result.value.title).toBe('spaced');
  });

  test('rejects an empty title', () => {
    const result = validateTask({ title: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('title is required');
  });

  test('rejects a missing payload', () => {
    expect(validateTask(null).valid).toBe(false);
    expect(validateTask(undefined).valid).toBe(false);
    expect(validateTask([]).valid).toBe(false);
  });

  test('rejects a title longer than the configured limit', () => {
    const result = validateTask({ title: 'x'.repeat(500) });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/at most/);
  });

  test('rejects an out-of-range priority', () => {
    expect(validateTask({ title: 'a', priority: 0 }).valid).toBe(false);
    expect(validateTask({ title: 'a', priority: 4 }).valid).toBe(false);
    expect(validateTask({ title: 'a', priority: 1.5 }).valid).toBe(false);
  });

  test('accepts priorities 1..3', () => {
    for (const priority of [1, 2, 3]) {
      expect(validateTask({ title: 'a', priority }).valid).toBe(true);
    }
  });

  test('rejects a non-boolean done flag', () => {
    const result = validateTask({ title: 'a', done: 'yes' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('done must be a boolean');
  });

  test('collects several errors at once', () => {
    const result = validateTask({ title: '', priority: 9, done: 'nope' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});

describe('summarize', () => {
  test('returns zeros for an empty list', () => {
    expect(summarize([])).toEqual({
      total: 0,
      done: 0,
      pending: 0,
      byPriority: { 1: 0, 2: 0, 3: 0 },
      completionRate: 0,
    });
  });

  test('handles a non-array input defensively', () => {
    expect(summarize(null).total).toBe(0);
  });

  test('counts done and pending tasks', () => {
    const summary = summarize([
      { done: true, priority: 1 },
      { done: false, priority: 2 },
      { done: true, priority: 3 },
      { done: false, priority: 3 },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.done).toBe(2);
    expect(summary.pending).toBe(2);
    expect(summary.byPriority).toEqual({ 1: 1, 2: 1, 3: 2 });
    expect(summary.completionRate).toBe(0.5);
  });

  test('ignores priorities outside 1..3', () => {
    const summary = summarize([{ done: false, priority: 42 }]);
    expect(summary.byPriority).toEqual({ 1: 0, 2: 0, 3: 0 });
    expect(summary.total).toBe(1);
  });
});
