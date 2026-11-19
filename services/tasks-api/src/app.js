'use strict';

const express = require('express');
const config = require('./config');
const { getPool } = require('./db');
const tasksRouter = require('./routes/tasks');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    return next();
  });

  // Liveness probe - process is up, no external dependency touched.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tasks-api', version: config.appVersion });
  });

  // Readiness probe - the service can actually serve traffic (DB reachable).
  app.get('/ready', async (_req, res) => {
    try {
      await getPool().query('SELECT 1');
      res.json({ status: 'ready', service: 'tasks-api', version: config.appVersion });
    } catch (err) {
      res.status(503).json({ status: 'not-ready', error: err.message });
    }
  });

  // Version endpoint - required by lab 5 to prove a GitOps rollout happened.
  app.get('/version', (_req, res) => {
    res.json({
      service: 'tasks-api',
      version: config.appVersion,
      featureStats: config.featureStats,
      maxTitleLength: config.maxTitleLength,
    });
  });

  app.use('/api/tasks', tasksRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use((err, _req, res, _next) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
