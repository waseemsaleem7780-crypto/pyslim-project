import sqlite3
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
DB_PATH = "pyslim.db"

password_hash = PasswordHash.recommended()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        email TEXT UNIQUE, 
        password_hash TEXT
    )''')
    conn.commit()
    conn.close()

def hash_password(pwd: str) -> str:
    return password_hash.hash(pwd)

def verify_password(pwd: str, hashed: str) -> bool:
    return password_hash.verify(pwd, hashed)

def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except:
        return None

init_db()
