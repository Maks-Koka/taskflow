'use strict';

const { createApp } = require('./app');
const config = require('./config');
const db = require('./db');

async function main() {
  await db.waitForDatabase();
  await db.migrate();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[tasks-api] version=${config.appVersion} listening on :${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`[tasks-api] received ${signal}, shutting down`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[tasks-api] fatal:', err.message);
  process.exit(1);
});
