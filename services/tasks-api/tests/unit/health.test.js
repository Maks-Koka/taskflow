'use strict';

process.env.APP_VERSION = '9.9.9-test';

const request = require('supertest');
const { createApp } = require('../../src/app');

const app = createApp();

describe('service endpoints that do not touch the database', () => {
  test('GET /health reports the service as ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('tasks-api');
  });

  test('GET /version exposes the build version', async () => {
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body.service).toBe('tasks-api');
  });

  test('unknown routes return 404 as JSON', async () => {
    const res = await request(app).get('/definitely-not-here');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not found');
  });

  test('POST /api/tasks rejects an invalid body before reaching the database', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('title is required');
  });
});
