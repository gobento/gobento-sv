"""
Which customer a forwarded support message came from.

Each message a customer sends is copied to every admin; the copy's id is stored here so an admin's
reply (to that copy) can be routed back. SQLite is plenty: one small table, one process.
"""
import sqlite3
from os import makedirs, path


class Store:
    def __init__(self, data_path: str):
        makedirs(data_path, exist_ok=True)
        self._db = sqlite3.connect(path.join(data_path, "support.db"))
        self._db.execute(
            """
            CREATE TABLE IF NOT EXISTS relayed (
                admin_chat_id INTEGER NOT NULL,
                admin_message_id INTEGER NOT NULL,
                customer_chat_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (admin_chat_id, admin_message_id)
            )
            """
        )
        self._db.commit()

    def remember(self, admin_chat_id: int, admin_message_id: int, customer_chat_id: int) -> None:
        self._db.execute(
            "INSERT OR REPLACE INTO relayed (admin_chat_id, admin_message_id, customer_chat_id) VALUES (?, ?, ?)",
            (admin_chat_id, admin_message_id, customer_chat_id),
        )
        self._db.commit()

    def customer_for(self, admin_chat_id: int, admin_message_id: int) -> int | None:
        row = self._db.execute(
            "SELECT customer_chat_id FROM relayed WHERE admin_chat_id = ? AND admin_message_id = ?",
            (admin_chat_id, admin_message_id),
        ).fetchone()
        return row[0] if row else None
