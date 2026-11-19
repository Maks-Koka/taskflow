"""Unit tests for the pure aggregation helpers."""

from app.analytics import (
    build_report,
    busiest_priority,
    completion_rate,
    priority_breakdown,
)

SAMPLE = [
    {"id": 1, "title": "a", "done": True, "priority": 1},
    {"id": 2, "title": "b", "done": False, "priority": 1},
    {"id": 3, "title": "c", "done": False, "priority": 2},
    {"id": 4, "title": "d", "done": False, "priority": 3},
]


def test_completion_rate_empty_list() -> None:
    assert completion_rate([]) == 0.0


def test_completion_rate_rounds_to_two_decimals() -> None:
    assert completion_rate(SAMPLE) == 0.25


def test_completion_rate_all_done() -> None:
    assert completion_rate([{"done": True}, {"done": True}]) == 1.0


def test_priority_breakdown_counts_buckets() -> None:
    assert priority_breakdown(SAMPLE) == {"high": 2, "medium": 1, "low": 1}


def test_priority_breakdown_ignores_unknown_priorities() -> None:
    assert priority_breakdown([{"priority": 42}]) == {"high": 0, "medium": 0, "low": 0}


def test_busiest_priority_uses_pending_tasks_only() -> None:
    assert busiest_priority(SAMPLE) == "high"


def test_busiest_priority_is_none_when_everything_is_done() -> None:
    assert busiest_priority([{"done": True, "priority": 1}]) is None


def test_build_report_structure() -> None:
    report = build_report(SAMPLE)
    assert report["total"] == 4
    assert report["done"] == 1
    assert report["pending"] == 3
    assert report["completion_rate"] == 0.25
    assert report["busiest_priority"] == "high"
    assert report["priority_breakdown"] == {"high": 2, "medium": 1, "low": 1}


def test_build_report_can_hide_priority_breakdown() -> None:
    report = build_report(SAMPLE, include_priorities=False)
    assert "priority_breakdown" not in report


def test_build_report_on_empty_input() -> None:
    report = build_report([])
    assert report["total"] == 0
    assert report["completion_rate"] == 0.0
    assert report["busiest_priority"] is None
