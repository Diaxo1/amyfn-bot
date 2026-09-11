import sqlite3

db = sqlite3.connect("/data/accounts.db")

print("Integrity:", db.execute("PRAGMA integrity_check").fetchone()[0])

print(
    "Accounts:",
    db.execute(
        "SELECT username, active FROM accounts"
    ).fetchall()
)

db.close()