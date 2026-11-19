'use strict';

const config = require('./config');

/**
 * Validates an incoming task payload.
 * Pure function - covered by unit tests, no database needed.
 * @param {object} payload
 * @returns {{valid: boolean, errors: string[], value?: object}}
 */
function validateTask(payload) {
  const errors = [];

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (title.length === 0) {
    errors.push('title is required');
  } else if (title.length > config.maxTitleLength) {
    errors.push(`title must be at most ${config.maxTitleLength} characters`);
  }

  let priority = 2;
  if (payload.priority !== undefined) {
    priority = Number(payload.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 3) {
      errors.push('priority must be an integer between 1 and 3');
    }
  }

  let done = false;
  if (payload.done !== undefined) {
    if (typeof payload.done !== 'boolean') {
      errors.push('done must be a boolean');
    } else {
      done = payload.done;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, errors: [], value: { title, priority, done } };
}

/**
 * Aggregates a list of tasks into counters.
 * Pure function - covered by unit tests.
 * @param {Array<{done: boolean, priority: number}>} tasks
 */
function summarize(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const summary = {
    total: list.length,
    done: 0,
    pending: 0,
    byPriority: { 1: 0, 2: 0, 3: 0 },
  };
  for (const task of list) {
    if (task.done) {
      summary.done += 1;
    } else {
      summary.pending += 1;
    }
    const p = Number(task.priority);
    if (p >= 1 && p <= 3) {
      summary.byPriority[p] += 1;
    }
  }
  summary.completionRate = summary.total === 0
    ? 0
    : Math.round((summary.done / summary.total) * 100) / 100;
  return summary;
}

module.exports = { validateTask, summarize };
