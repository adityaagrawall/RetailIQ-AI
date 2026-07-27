import sqlite3

def migrate():
    conn = sqlite3.connect('retail_iq.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE uploads ADD COLUMN is_active BOOLEAN DEFAULT 0")
        conn.commit()
        print("Added is_active column.")
    except Exception as e:
        print("Migration error (maybe already exists):", e)
    
    # Set the most recent one to active if none are active
    cursor.execute("SELECT id FROM uploads WHERE is_active = 1")
    if not cursor.fetchone():
        cursor.execute("UPDATE uploads SET is_active = 1 WHERE id = (SELECT MAX(id) FROM uploads)")
        conn.commit()
        print("Set most recent upload as active.")
        
    conn.close()

if __name__ == '__main__':
    migrate()
