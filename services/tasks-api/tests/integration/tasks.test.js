'use strict';

/**
 * Integration tests: they talk to a real PostgreSQL instance.
 * Locally:  docker compose up -d postgres  (then DB_HOST=localhost)
 * In CI:    a postgres service container provided by the workflow.
 */

const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/db');

const app = createApp();

beforeAll(async () => {
  await db.waitForDatabase({ retries: 15, delayMs: 2000 });
  await db.migrate();
});

beforeEach(async () => {
  await db.getPool().query('TRUNCATE tasks RESTART IDENTITY');
});

afterAll(async () => {
  await db.close();
});

describe('GET /ready', () => {
  test('reports ready when the database is reachable', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});

describe('tasks CRUD', () => {
  test('starts from an empty collection', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('creates a task and returns it with an id', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Deploy to minikube', priority: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe('Deploy to minikube');
    expect(res.body.done).toBe(false);
    expect(res.body.priority).toBe(1);
  });

  test('lists created tasks in id order', async () => {
    await request(app).post('/api/tasks').send({ title: 'first' });
    await request(app).post('/api/tasks').send({ title: 'second' });
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['first', 'second']);
  });

  test('fetches a single task by id', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'single' });
    const res = await request(app).get(`/api/tasks/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('single');
  });

  test('returns 404 for a missing task', async () => {
    const res = await request(app).get('/api/tasks/999');
    expect(res.status).toBe(404);
  });

  test('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/tasks/abc');
    expect(res.status).toBe(400);
  });

  test('updates an existing task', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'old' });
    const res = await request(app)
      .put(`/api/tasks/${created.body.id}`)
      .send({ title: 'new', done: true, priority: 3 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('new');
    expect(res.body.done).toBe(true);
    expect(res.body.priority).toBe(3);
  });

  test('deletes a task', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'to delete' });
    const del = await request(app).delete(`/api/tasks/${created.body.id}`);
    expect(del.status).toBe(204);
    const after = await request(app).get('/api/tasks');
    expect(after.body).toEqual([]);
  });

  test('rejects an invalid payload without writing to the database', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    const after = await request(app).get('/api/tasks');
    expect(after.body).toEqual([]);
  });
});

describe('GET /api/tasks/summary', () => {
  test('aggregates the stored tasks', async () => {
    await request(app).post('/api/tasks').send({ title: 'a', priority: 1, done: true });
    await request(app).post('/api/tasks').send({ title: 'b', priority: 2 });
    await request(app).post('/api/tasks').send({ title: 'c', priority: 3 });

    const res = await request(app).get('/api/tasks/summary');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.done).toBe(1);
    expect(res.body.pending).toBe(2);
    expect(res.body.byPriority).toEqual({ 1: 1, 2: 1, 3: 1 });
  });
});
