# syntax=docker/dockerfile:1

############################
# Stage 1 - python deps    #
############################
FROM python:3.12-slim AS deps
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY requirements.txt ./
RUN pip install --prefix=/install -r requirements.txt

############################
# Stage 2 - lint and test  #
############################
FROM python:3.12-slim AS test
WORKDIR /app
ENV PIP_NO_CACHE_DIR=1 PYTHONPATH=/app
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements-dev.txt
COPY . .
RUN ruff check . && pytest -q

############################
# Stage 3 - runtime        #
############################
FROM python:3.12-slim AS runtime
ARG APP_VERSION=0.0.0-dev
ENV APP_VERSION=${APP_VERSION} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 appuser

COPY --from=deps /install /usr/local
COPY app ./app

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
