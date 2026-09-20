"""
CivicFix - Non-Destructive Database Migration for Google OAuth
Adds columns to the existing 'users' table without modifying, deleting,
or resetting any existing user records, complaints, or foreign keys.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "civicfix.db")

def migrate():
    print(f"[*] Checking SQLite database at: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print(f"[!] Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Inspect existing columns
    cursor.execute("PRAGMA table_info(users)")
    existing_cols = {row[1]: row for row in cursor.fetchall()}
    print(f"[*] Existing users columns ({len(existing_cols)}): {list(existing_cols.keys())}")

    # 2. Count existing records to guarantee zero data loss
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count_before = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM complaints")
    complaint_count_before = cursor.fetchone()[0]
    print(f"[*] Users before migration: {user_count_before}")
    print(f"[*] Complaints before migration: {complaint_count_before}")

    # 3. Add Google OAuth columns if missing
    new_columns = [
        ("google_id", "VARCHAR"),
        ("auth_provider", "VARCHAR DEFAULT 'local'"),
        ("profile_picture", "VARCHAR"),
        ("email_verified", "BOOLEAN DEFAULT 0"),
        ("is_profile_complete", "BOOLEAN DEFAULT 1"),
    ]

    added = []
    for col_name, col_def in new_columns:
        if col_name not in existing_cols:
            alter_stmt = f"ALTER TABLE users ADD COLUMN {col_name} {col_def};"
            print(f"[+] Executing: {alter_stmt}")
            cursor.execute(alter_stmt)
            added.append(col_name)
        else:
            print(f"[=] Column '{col_name}' already exists.")

    # Create index on google_id if not exists
    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;")

    conn.commit()

    # 4. Verify post-migration integrity
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count_after = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM complaints")
    complaint_count_after = cursor.fetchone()[0]

    assert user_count_before == user_count_after, f"User count mismatch! Before: {user_count_before}, After: {user_count_after}"
    assert complaint_count_before == complaint_count_after, f"Complaint count mismatch! Before: {complaint_count_before}, After: {complaint_count_after}"

    print(f"[OK] Migration complete! Added columns: {added}")
    print(f"[OK] Data integrity verified: {user_count_after} users and {complaint_count_after} complaints preserved 100%.")

    conn.close()

if __name__ == "__main__":
    migrate()
