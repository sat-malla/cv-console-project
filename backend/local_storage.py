import duckdb
import time
from pathlib import Path
from typing import Optional, Any

DB_PATH = Path(__file__).resolve().parent / "cv_console.duckdb"

conn = duckdb.connect(str(DB_PATH))

conn.execute("""
    CREATE TABLE IF NOT EXISTS agent_logs (
        id BIGINT PRIMARY KEY,
        session_id VARCHAR,
        type VARCHAR,
        message VARCHAR,
        flagged BOOLEAN,
        created_at DOUBLE
    )
""")
conn.execute("CREATE SEQUENCE IF NOT EXISTS agent_logs_seq START 1")

conn.execute("""
    CREATE TABLE IF NOT EXISTS telemetry (
        session_id VARCHAR,
        view_type VARCHAR,
        key VARCHAR,
        value DOUBLE,
        timestamp DOUBLE
    )
""")

def log_event(session_id: str, event_type: str, message: str, flagged: bool = False):
    conn.execute(
        "INSERT INTO agent_logs VALUES (nextval('agent_logs_seq'), ?, ?, ?, ?, ?)",
        [session_id, event_type, message, flagged, time.time()]
    )

def write_telemetry(session_id: str, view_type: str, data: dict):
    now = time.time()
    for key, value in data.items():
        if isinstance(value, (int, float)):
            conn.execute(
                "INSERT INTO telemetry VALUES (?, ?, ?, ?, ?)",
                [session_id, view_type, key, float(value), now]
            )

def get_logs_by_range(session_id: str, start: Optional[float] = None, end: Optional[float] = None, limit: int = 200):
    query = "SELECT * FROM agent_logs WHERE session_id = ?"
    params: list[Any] = [session_id]
    if start:
        query += " AND created_at >= ?"
        params.append(start)
    if end:
        query += " AND created_at <= ?"
        params.append(end)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    return conn.execute(query, params).fetchdf().to_dict("records")