#!/usr/bin/env python3
"""Create a repeatable TSCP benchmark request package.

The script deliberately prepares a request instead of scraping websites. The
benchmark agent (or a future connector) can consume the generated JSON and
prompt while keeping every run reproducible and dependency-free.
"""

from __future__ import annotations

import argparse
import json
import sys
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
    except FileNotFoundError as exc:
        raise SystemExit(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise SystemExit(f"Expected a JSON object in {path}")
    return value


def parse_iso_date(value: str, option: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"{option} must use YYYY-MM-DD format"
        ) from exc


def next_month(today: date) -> tuple[int, int]:
    return (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)


def month_period(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a standardized TSCP benchmark request and prompt."
    )
    parser.add_argument(
        "--month",
        metavar="YYYY-MM",
        help="Planning month. Defaults to the next calendar month.",
    )
    parser.add_argument("--from", dest="period_start", metavar="YYYY-MM-DD")
    parser.add_argument("--to", dest="period_end", metavar="YYYY-MM-DD")
    parser.add_argument(
        "--trigger",
        choices=("scheduled", "on_demand"),
        default="on_demand",
        help="Why the request was created (default: on_demand).",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=ROOT / "config/tscp.json",
        help="Path to TSCP configuration JSON.",
    )
    parser.add_argument(
        "--sources",
        type=Path,
        default=ROOT / "config/benchmark-sources.json",
        help="Path to benchmark sources JSON.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "data/benchmark/requests",
        help="Directory where request files are written.",
    )
    return parser


def resolve_period(args: argparse.Namespace) -> tuple[date, date]:
    if args.month and (args.period_start or args.period_end):
        raise SystemExit("Use --month or --from/--to, not both.")
    if bool(args.period_start) != bool(args.period_end):
        raise SystemExit("--from and --to must be provided together.")
    if args.month:
        try:
            year_text, month_text = args.month.split("-", 1)
            year, month = int(year_text), int(month_text)
            if len(year_text) != 4 or len(month_text) != 2 or not 1 <= month <= 12:
                raise ValueError
        except ValueError as exc:
            raise SystemExit("--month must use YYYY-MM format.") from exc
        return month_period(year, month)
    if args.period_start and args.period_end:
        start = parse_iso_date(args.period_start, "--from")
        end = parse_iso_date(args.period_end, "--to")
        if end < start:
            raise SystemExit("--to cannot be earlier than --from.")
        return start, end
    year, month = next_month(date.today())
    return month_period(year, month)


def enabled_sources(source_config: dict[str, Any]) -> list[dict[str, Any]]:
    sources = source_config.get("sources", [])
    if not isinstance(sources, list):
        raise SystemExit("The sources config must contain a 'sources' array.")
    result = []
    for source in sources:
        if not isinstance(source, dict):
            raise SystemExit("Each benchmark source must be a JSON object.")
        if source.get("enabled", True):
            result.append(source)
    if not result:
        raise SystemExit("No enabled benchmark sources were found.")
    return result


def build_request(
    config: dict[str, Any], source_config: dict[str, Any], start: date, end: date, trigger: str
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    request_id = f"{start:%Y-%m}-{now:%Y%m%dT%H%M%SZ}"
    defaults = config.get("defaults", {})
    enabled_campaigns = [c for c in config.get("campaigns", []) if c.get("enabled", True)]
    enabled_platforms = [p for p in config.get("platforms", []) if p.get("enabled", True)]
    return {
        "request_contract_version": "1.0",
        "request": {
            "id": request_id,
            "created_at": now.isoformat().replace("+00:00", "Z"),
            "trigger": trigger,
            "planning_period": {"start": start.isoformat(), "end": end.isoformat()},
            "lookback": {
                "days": defaults.get("benchmark_lookback_days", 90),
                "end": (start - timedelta(days=1)).isoformat(),
            },
            "language": defaults.get("language", "en"),
        },
        "organization": config.get("organization", {}),
        "configuration": {
            "source_of_truth": config.get("notion", {}).get(
                "source_of_truth", "local_json"
            ),
            "notion_admin_page_url": config.get("notion", {}).get("admin_page_url"),
            "local_fallback_files": config.get("notion", {}).get(
                "fallback_files", ["config/tscp.json", "config/benchmark-sources.json"]
            ),
        },
        "active_campaigns": enabled_campaigns,
        "active_platforms": enabled_platforms,
        "benchmark_sources": enabled_sources(source_config),
        "deliverable": {
            "benchmark_snapshot_path": f"data/benchmark/{start:%Y-%m}.json",
            "request_contract": "contracts/benchmark-request.schema.json",
            "required_contract": "contracts/benchmark-input.schema.json",
            "required_fields": [
                "source_url", "published_at", "platform", "content_type", "theme",
                "summary", "signals", "relevance_to_tscp", "adaptation_notes",
            ],
        },
    }


def prompt_for(request_path: Path, request: dict[str, Any]) -> str:
    period = request["request"]["planning_period"]
    return f"""# TSCP Benchmark Request

Read `{request_path}` and follow the `benchmark` agent instructions.

Planning period: {period['start']} to {period['end']}
Lookback end date: {request['request']['lookback']['end']}
Trigger: {request['request']['trigger']}

Collect recent, public, verifiable examples from the enabled sources in the request. Return English JSON that conforms to `contracts/benchmark-input.schema.json`. Save the normalized snapshot to `{request['deliverable']['benchmark_snapshot_path']}`. Do not create a calendar or final post copy.
"""


def main() -> int:
    args = build_parser().parse_args()
    config = load_json(args.config)
    source_config = load_json(args.sources)
    start, end = resolve_period(args)
    request = build_request(config, source_config, start, end, args.trigger)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{start:%Y-%m}-request"
    request_path = args.output_dir / f"{stem}.json"
    prompt_path = args.output_dir / f"{stem}.prompt.md"
    request_path.write_text(json.dumps(request, indent=2) + "\n", encoding="utf-8")
    try:
        request_reference = request_path.relative_to(ROOT)
    except ValueError:
        request_reference = request_path
    prompt_path.write_text(
        prompt_for(request_reference, request), encoding="utf-8"
    )
    print(f"Created: {request_path}")
    print(f"Created: {prompt_path}")
    print(f"Sources included: {len(request['benchmark_sources'])}")
    print(f"Planning period: {start} to {end}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        sys.exit(0)
