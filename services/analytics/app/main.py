"""TaskFlow analytics service.

Reads tasks from the tasks-api microservice and returns aggregated statistics.
"""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.analytics import build_report
from app.config import settings

app = FastAPI(
    title="TaskFlow analytics",
    version=settings.app_version,
    description="Aggregates task statistics for the TaskFlow project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _base_url() -> str:
    return settings.tasks_api_url.rstrip("/")


async def fetch_tasks() -> list[dict[str, Any]]:
    """Pull the task list from the tasks-api service."""
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        response = await client.get(_base_url() + "/api/tasks")
        response.raise_for_status()
        payload = response.json()
    if not isinstance(payload, list):
        raise ValueError("tasks-api returned an unexpected payload")
    return payload


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe - does not depend on tasks-api."""
    return {"status": "ok", "service": "analytics", "version": settings.app_version}


@app.get("/ready")
async def ready() -> dict[str, str]:
    """Readiness probe - the upstream tasks-api must answer."""
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.get(_base_url() + "/health")
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="tasks-api unavailable") from exc
    return {"status": "ready", "service": "analytics", "version": settings.app_version}


@app.get("/version")
async def version() -> dict[str, Any]:
    """Version endpoint - used in lab 5 to prove a GitOps rollout happened."""
    return {
        "service": "analytics",
        "version": settings.app_version,
        "tasks_api_url": settings.tasks_api_url,
        "show_priority_breakdown": settings.show_priority_breakdown,
        "internal_token_configured": bool(settings.internal_token),
    }


@app.get("/api/analytics")
async def analytics() -> dict[str, Any]:
    """Aggregated statistics over all tasks."""
    try:
        tasks = await fetch_tasks()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="tasks-api error") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return build_report(tasks, include_priorities=settings.show_priority_breakdown)
