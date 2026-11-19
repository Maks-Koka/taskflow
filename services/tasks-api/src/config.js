'use strict';

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  appVersion: process.env.APP_VERSION || '0.0.0-dev',
  // Feature flags / tunables come from ConfigMap in Kubernetes (lab 3+)
  maxTitleLength: parseInt(process.env.MAX_TITLE_LENGTH || '120', 10),
  featureStats: (process.env.FEATURE_STATS || 'true').toLowerCase() === 'true',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'taskflow',
    password: process.env.DB_PASSWORD || 'taskflow',
    database: process.env.DB_NAME || 'taskflow',
  },
};

module.exports = config;
