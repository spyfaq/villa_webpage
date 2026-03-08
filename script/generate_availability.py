#!/usr/bin/env python3
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


OUTPUT_FILE = Path("availability.json")


def fetch_text(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; VillaAvailabilityBot/1.0)"
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def unfold_ics_lines(text: str) -> list[str]:
    # RFC-style line unfolding: lines starting with space/tab continue previous line
    raw_lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines: list[str] = []
    for line in raw_lines:
        if not line:
            lines.append("")
            continue
        if line.startswith((" ", "\t")) and lines:
            lines[-1] += line[1:]
        else:
            lines.append(line)
    return lines


def parse_ics_datetime(value: str, is_date_only: bool):
    value = value.strip()

    if is_date_only:
        # Example: 20260312
        dt = datetime.strptime(value, "%Y%m%d").date()
        return dt, True

    # Remove TZID wrapper formats if any weirdness leaks into value
    value = value.replace("Z", "")

    # Support:
    # 20260312T150000
    # 20260312T150000Z
    # 20260312T1500
    fmts = ["%Y%m%dT%H%M%S", "%Y%m%dT%H%M"]
    for fmt in fmts:
        try:
            dt = datetime.strptime(value, fmt)
            return dt, False
        except ValueError:
            pass

    raise ValueError(f"Unsupported ICS datetime format: {value}")


def extract_param_flags(key_part: str):
    # Example:
    # DTSTART;VALUE=DATE
    # DTSTART;TZID=Europe/Athens
    parts = key_part.split(";")
    field = parts[0].upper()
    params = {}
    for p in parts[1:]:
        if "=" in p:
            k, v = p.split("=", 1)
            params[k.upper()] = v
    return field, params


def parse_ics_events(text: str) -> list[dict]:
    lines = unfold_ics_lines(text)
    events = []
    current = None

    for line in lines:
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current:
                events.append(current)
            current = None
            continue
        if current is None or ":" not in line:
            continue

        key_part, value = line.split(":", 1)
        field, params = extract_param_flags(key_part)

        if field in {"DTSTART", "DTEND", "SUMMARY", "UID", "STATUS"}:
            current[field] = {
                "value": value.strip(),
                "params": params
            }

    return events


def normalize_event(evt: dict):
    if "DTSTART" not in evt:
        return None

    dtstart_meta = evt["DTSTART"]
    dtend_meta = evt.get("DTEND")

    start_is_date = dtstart_meta["params"].get("VALUE", "").upper() == "DATE"
    start_raw = dtstart_meta["value"]
    start_value, _ = parse_ics_datetime(start_raw, start_is_date)

    # If DTEND missing, infer 1 day for all-day or same-day for timed
    if dtend_meta:
        end_is_date = dtend_meta["params"].get("VALUE", "").upper() == "DATE"
        end_raw = dtend_meta["value"]
        end_value, _ = parse_ics_datetime(end_raw, end_is_date)
    else:
        if start_is_date:
            end_value = start_value + timedelta(days=1)
            end_is_date = True
        else:
            end_value = start_value
            end_is_date = False

    # Output as FullCalendar background events.
    # For all-day events, ICS DTEND is exclusive already.
    if start_is_date:
        start_str = start_value.isoformat()
        end_str = end_value.isoformat()
    else:
        # Convert timed events to date spans for blocking days on dayGrid
        start_date = start_value.date()
        end_date = end_value.date()
        if end_value.time() != datetime.min.time():
            end_date = end_date + timedelta(days=1)
        elif end_date <= start_date:
            end_date = start_date + timedelta(days=1)

        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

    if end_str <= start_str:
        return None

    return {
        "start": start_str,
        "end": end_str,
        "display": "background",
        "color": "#c0392b"
    }


def load_all_urls() -> list[str]:
    urls = []

    airbnb = os.getenv("AIRBNB_ICS_URL", "").strip()
    booking = os.getenv("BOOKING_ICS_URL", "").strip()
    extra = os.getenv("EXTRA_ICS_URLS", "").strip()

    if airbnb:
        urls.append(airbnb)
    if booking:
        urls.append(booking)
    if extra:
        urls.extend([u.strip() for u in extra.split(",") if u.strip()])

    return urls


def dedupe_events(events: list[dict]) -> list[dict]:
    seen = set()
    out = []
    for e in sorted(events, key=lambda x: (x["start"], x["end"])):
        key = (e["start"], e["end"])
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def main():
    urls = load_all_urls()
    if not urls:
        print("No ICS URLs found. Set AIRBNB_ICS_URL and/or BOOKING_ICS_URL.")
        sys.exit(1)

    normalized_events = []

    for url in urls:
        print(f"Fetching: {url[:80]}...")
        try:
            ics_text = fetch_text(url)
            parsed = parse_ics_events(ics_text)
            for evt in parsed:
                norm = normalize_event(evt)
                if norm:
                    normalized_events.append(norm)
        except Exception as exc:
            print(f"Failed to process {url}: {exc}")
            sys.exit(1)

    final_events = dedupe_events(normalized_events)

    OUTPUT_FILE.write_text(
        json.dumps(final_events, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print(f"Wrote {len(final_events)} blocked periods to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()