import re
import time
import json
from vlm_providers import query_text_model
from local_storage import conn

TELEMETRY_KEYS = {
    "canny": ["edge_density"],
    "motion": ["motion_pixel_ratio"],
    "yolo": ["object_count"],
    "sfm": ["tracked_point_count", "avg_motion_magnitude"],
    "stvis": ["depth_min", "depth_max", "depth_mean"],
}
ALL_TELEMETRY_KEYS = [k for keys in TELEMETRY_KEYS.values() for k in keys]

def extract_time_window(question: str) -> tuple[float | None, float | None]:
    now = time.time()
    q = question.lower()

    if "last hour" in q:
        return now - 3600, now
    if "today" in q:
        return now - 86400, now
    if "last 5 minutes" in q or "last five minutes" in q:
        return now - 300, now
    if "last 10 minutes" in q:
        return now - 600, now

    match = re.search(r'(\d{1,2}):(\d{2})\s*(am|pm)?', q)
    if match:
        hour, minute = int(match.group(1)), int(match.group(2))
        if match.group(3) == "pm" and hour != 12:
            hour += 12
        target = time.mktime(time.localtime(now)[:3] + (hour, minute, 0, 0, 0, -1))
        return target - 300, target + 300

    return None, None

INTENT_PROMPT_TEMPLATE = """Convert this question into a JSON object for a computer vision monitoring database.

RULES:
- Set "table" to the word agent_logs if the question is about events, descriptions, or safety flags.
- Set "table" to the word telemetry if the question is about numeric metrics.
- Set "flagged_only" to true ONLY if the question explicitly uses the words "safety", "hazard", "flag", or "flagged". For any other question — including general questions about detection, activity, or status — set it to false.
- Set "metric_key" to one of: {telemetry_keys}. Only set this if table is telemetry. Otherwise set it to null.
- Set "metric_operator" to one of: >, <, =. Only set this if comparing a number. Otherwise null.
- Set "metric_value" to a plain number using the data's real scale (ratios are between 0.0 and 1.0, never percentages like 80). Otherwise null.

Question: "{question}"

Output ONLY a single valid JSON object. Do not explain your answer. Every value must be a plain string, number, boolean, or null — never an expression or comparison.

Examples of correct output:
{{"table": "telemetry", "flagged_only": false, "metric_key": "motion_pixel_ratio", "metric_operator": ">", "metric_value": 0.8}}
{{"table": "telemetry", "flagged_only": false, "metric_key": "edge_density", "metric_operator": null, "metric_value": null}}
{{"table": "agent_logs", "flagged_only": true, "metric_key": null, "metric_operator": null, "metric_value": null}}
{{"table": "agent_logs", "flagged_only": false, "metric_key": null, "metric_operator": null, "metric_value": null}}
{{"table": "agent_logs", "flagged_only": false, "metric_key": null, "metric_operator": null, "metric_value": null}}"""


async def parse_intent(question: str) -> dict:
    prompt = INTENT_PROMPT_TEMPLATE.format(
        telemetry_keys=", ".join(ALL_TELEMETRY_KEYS),
        question=question
    )
    raw = await query_text_model(prompt)
    start_time, end_time = extract_time_window(question)
    keyword_flagged = any(word in question.lower() for word in ["safety", "hazard", "flag", "flagged"])

    try:
        json_start = raw.index("{")
        json_end = raw.rindex("}") + 1
        parsed = json.loads(raw[json_start:json_end])
        parsed["start_time"] = start_time
        parsed["end_time"] = end_time
        parsed["flagged_only"] = keyword_flagged
        return parsed
    except (ValueError, json.JSONDecodeError):
        print(f"parse_intent: failed to parse JSON, raw output was: {raw!r}")
        return {
            "table": "agent_logs", "start_time": start_time, "end_time": end_time,
            "flagged_only": keyword_flagged, "metric_key": None, 
            "metric_operator": None, "metric_value": None,
        }

def execute_intent(session_id: str, intent: dict) -> list[dict]:
    from typing import Any
    table = intent.get("table", "agent_logs")

    if table == "telemetry" and intent.get("metric_key"):
        query = "SELECT * FROM telemetry WHERE session_id = ? AND key = ?"
        params: list[Any] = [session_id, intent["metric_key"]]

        op = intent.get("metric_operator")
        val = intent.get("metric_value")
        if op and val is not None:
            query += f" AND value {op} ?"
            params.append(val)

        if intent.get("start_time"):
            query += " AND timestamp >= ?"
            params.append(intent["start_time"])
        if intent.get("end_time"):
            query += " AND timestamp <= ?"
            params.append(intent["end_time"])

        query += " ORDER BY timestamp DESC LIMIT 50"
        return conn.execute(query, params).fetchdf().to_dict("records")

    query = "SELECT * FROM agent_logs WHERE session_id = ?"
    params: list[Any] = [session_id]

    if intent.get("flagged_only"):
        query += " AND flagged = true"
    if intent.get("start_time"):
        query += " AND created_at >= ?"
        params.append(intent["start_time"])
    if intent.get("end_time"):
        query += " AND created_at <= ?"
        params.append(intent["end_time"])

    query += " ORDER BY created_at DESC LIMIT 50"
    return conn.execute(query, params).fetchdf().to_dict("records")