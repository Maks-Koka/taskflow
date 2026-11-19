"""Pure aggregation helpers.

Kept free of I/O so they can be unit tested without a running tasks-api.
"""

from __future__ import annotations

from typing import Any


def completion_rate(tasks: list[dict[str, Any]]) -> float:
    """Share of finished tasks, rounded to two decimals."""
    if not tasks:
        return 0.0
    done = sum(1 for task in tasks if task.get("done"))
    return round(done / len(tasks), 2)


def priority_breakdown(tasks: list[dict[str, Any]]) -> dict[str, int]:
    """Number of tasks per priority bucket (1 = high, 3 = low)."""
    buckets = {"high": 0, "medium": 0, "low": 0}
    names = {1: "high", 2: "medium", 3: "low"}
    for task in tasks:
        name = names.get(task.get("priority"))
        if name is not None:
            buckets[name] += 1
    return buckets


def busiest_priority(tasks: list[dict[str, Any]]) -> str | None:
    """Priority bucket with the most pending tasks, or None when nothing is pending."""
    pending = [task for task in tasks if not task.get("done")]
    if not pending:
        return None
    buckets = priority_breakdown(pending)
    best = max(buckets.items(), key=lambda item: item[1])
    return best[0] if best[1] > 0 else None


def build_report(tasks: list[dict[str, Any]], *, include_priorities: bool = True) -> dict[str, Any]:
    """Assemble the payload returned by GET /api/analytics."""
    done = sum(1 for task in tasks if task.get("done"))
    report: dict[str, Any] = {
        "total": len(tasks),
        "done": done,
        "pending": len(tasks) - done,
        "completion_rate": completion_rate(tasks),
        "busiest_priority": busiest_priority(tasks),
    }
    if include_priorities:
        report["priority_breakdown"] = priority_breakdown(tasks)
    return report
