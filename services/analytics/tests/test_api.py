"""Integration-style tests for the HTTP layer.

The upstream tasks-api is replaced with a mock transport (respx), so these run
without any other service being up.
"""

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)
BASE = settings.tasks_api_url.rstrip("/")
TASKS_URL = BASE + "/api/tasks"
HEALTH_URL = BASE + "/health"


def test_health_does_not_need_upstream() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "analytics"


def test_version_endpoint_reports_version() -> None:
    response = client.get("/version")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "analytics"
    assert "version" in body


@respx.mock
def test_ready_returns_200_when_upstream_is_healthy() -> None:
    respx.get(HEALTH_URL).mock(return_value=httpx.Response(200, json={"status": "ok"}))
    response = client.get("/ready")
    assert response.status_code == 200


@respx.mock
def test_ready_returns_503_when_upstream_is_down() -> None:
    respx.get(HEALTH_URL).mock(side_effect=httpx.ConnectError("refused"))
    response = client.get("/ready")
    assert response.status_code == 503


@respx.mock
def test_analytics_aggregates_upstream_tasks() -> None:
    respx.get(TASKS_URL).mock(
        return_value=httpx.Response(
            200,
            json=[
                {"id": 1, "done": True, "priority": 1},
                {"id": 2, "done": False, "priority": 3},
            ],
        )
    )
    response = client.get("/api/analytics")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["done"] == 1
    assert body["completion_rate"] == 0.5
    assert body["busiest_priority"] == "low"


@respx.mock
def test_analytics_returns_502_when_upstream_fails() -> None:
    respx.get(TASKS_URL).mock(return_value=httpx.Response(500))
    response = client.get("/api/analytics")
    assert response.status_code == 502


@respx.mock
def test_analytics_returns_502_on_unexpected_payload() -> None:
    respx.get(TASKS_URL).mock(return_value=httpx.Response(200, json={"oops": True}))
    response = client.get("/api/analytics")
    assert response.status_code == 502


@pytest.mark.parametrize("path", ["/health", "/version"])
def test_endpoints_return_json(path: str) -> None:
    response = client.get(path)
    assert response.headers["content-type"].startswith("application/json")
