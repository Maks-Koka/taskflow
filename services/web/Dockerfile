# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=${APP_VERSION} \
    TASKS_API_UPSTREAM=tasks-api:3000 \
    ANALYTICS_UPSTREAM=analytics:8000

# The official image runs envsubst over /etc/nginx/templates/*.template
# at start-up and writes the result to /etc/nginx/conf.d/.
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY html/ /usr/share/nginx/html/

RUN rm -f /etc/nginx/conf.d/default.conf.orig

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1
