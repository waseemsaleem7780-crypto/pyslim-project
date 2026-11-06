import sqlite3
import json
from datetime import datetime

DB_PATH = "feedback.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            mode TEXT NOT NULL,
            feedback TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def save_feedback(prompt: str, response: str, mode: str, feedback: str):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO feedback (prompt, response, mode, feedback, timestamp) VALUES (?, ?, ?, ?, ?)",
        (prompt, response, mode, feedback, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return True

def get_stats():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT feedback, COUNT(*) FROM feedback GROUP BY feedback")
    stats = dict(c.fetchall())
    conn.close()
    return {"positive": stats.get("positive", 0), "negative": stats.get("negative", 0)}

def get_good_examples(limit: int = 100):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT prompt, response, mode FROM feedback WHERE feedback='positive' ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = c.fetchall()
    conn.close()
    return [{"prompt": r[0], "response": r[1], "mode": r[2]} for r in rows]

init_db()