'use strict';

const express = require('express');
const { getPool } = require('../db');
const { validateTask, summarize } = require('../validation');
const config = require('../config');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await getPool().query(
      'SELECT id, title, done, priority, created_at FROM tasks ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/summary', async (_req, res, next) => {
  if (!config.featureStats) {
    return res.status(404).json({ error: 'stats feature is disabled' });
  }
  try {
    const { rows } = await getPool().query('SELECT done, priority FROM tasks');
    return res.json(summarize(rows));
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  try {
    const { rows } = await getPool().query(
      'SELECT id, title, done, priority, created_at FROM tasks WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'task not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const result = validateTask(req.body);
  if (!result.valid) {
    return res.status(400).json({ errors: result.errors });
  }
  try {
    const { rows } = await getPool().query(
      'INSERT INTO tasks (title, priority, done) VALUES ($1, $2, $3) RETURNING id, title, done, priority, created_at',
      [result.value.title, result.value.priority, result.value.done]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  const result = validateTask(req.body);
  if (!result.valid) {
    return res.status(400).json({ errors: result.errors });
  }
  try {
    const { rows } = await getPool().query(
      'UPDATE tasks SET title = $1, priority = $2, done = $3 WHERE id = $4 RETURNING id, title, done, priority, created_at',
      [result.value.title, result.value.priority, result.value.done, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'task not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  try {
    const { rowCount } = await getPool().query('DELETE FROM tasks WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'task not found' });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
