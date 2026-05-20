"""
SQLite Database module for Cyber Security Toolkit
Professional, fast, and 100% free. No external services needed!
"""

import sqlite3
import os
from datetime import datetime, timedelta
import hashlib
import secrets
import json

DB_PATH = "instance/cyber_toolkit.db"
os.makedirs("instance", exist_ok=True)

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL,
            last_login TIMESTAMP,
            last_ip TEXT,
            failed_attempts INTEGER DEFAULT 0,
            is_locked INTEGER DEFAULT 0,
            lock_until TIMESTAMP,
            total_sessions INTEGER DEFAULT 0,
            tools_used TEXT DEFAULT '{"typosquat":0,"password":0,"exif":0}',
            total_analyses INTEGER DEFAULT 0
        )
    ''')
    
    # Tool history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tool_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            input_data TEXT,
            output_summary TEXT,
            result_data TEXT,
            details TEXT,
            created_at TIMESTAMP NOT NULL
        )
    ''')
    
    # Login attempts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            ip_address TEXT,
            attempt_time TIMESTAMP NOT NULL,
            success INTEGER DEFAULT 0
        )
    ''')
    
    # User sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            ip_address TEXT,
            created_at TIMESTAMP NOT NULL,
            last_activity TIMESTAMP NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Database initialized!")
    return True

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username, email, password):
    conn = get_db()
    cursor = conn.cursor()
    
    user_id = secrets.token_hex(16)
    password_hash = hash_password(password)
    
    try:
        cursor.execute('''
            INSERT INTO users (id, username, email, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, username, email, password_hash, datetime.now()))
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        return {'error': 'Username or email already exists'}
    finally:
        conn.close()

def authenticate_user(username, password, ip_address='127.0.0.1'):
    conn = get_db()
    cursor = conn.cursor()
    password_hash = hash_password(password)
    
    # Log attempt
    cursor.execute('''
        INSERT INTO login_attempts (username, ip_address, attempt_time, success)
        VALUES (?, ?, ?, 0)
    ''', (username, ip_address, datetime.now()))
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    
    if not user:
        conn.commit()
        conn.close()
        return {'success': False, 'error': 'Invalid username'}
    
    # Check lock
    if user['is_locked'] and user['lock_until']:
        lock_until = datetime.fromisoformat(user['lock_until']) if isinstance(user['lock_until'], str) else user['lock_until']
        if lock_until > datetime.now():
            conn.close()
            return {'success': False, 'error': 'Account locked. Try again later.'}
    
    if user['password_hash'] == password_hash:
        session_token = secrets.token_hex(32)
        
        cursor.execute('''
            INSERT INTO user_sessions (user_id, session_token, ip_address, created_at, last_activity)
            VALUES (?, ?, ?, ?, ?)
        ''', (user['id'], session_token, ip_address, datetime.now(), datetime.now()))
        
        cursor.execute('''
            UPDATE users SET failed_attempts = 0, last_login = ?, last_ip = ?, 
            total_sessions = total_sessions + 1, is_locked = 0, lock_until = NULL
            WHERE id = ?
        ''', (datetime.now(), ip_address, user['id']))
        
        conn.commit()
        conn.close()
        return {'success': True, 'user_id': user['id'], 'username': user['username'], 'session_token': session_token}
    else:
        new_attempts = user['failed_attempts'] + 1
        if new_attempts >= 5:
            cursor.execute('''
                UPDATE users SET failed_attempts = ?, is_locked = 1, lock_until = ?
                WHERE id = ?
            ''', (new_attempts, datetime.now() + timedelta(minutes=15), user['id']))
            conn.commit()
            conn.close()
            return {'success': False, 'error': 'Account locked. Too many failed attempts.'}
        else:
            cursor.execute('UPDATE users SET failed_attempts = ? WHERE id = ?', (new_attempts, user['id']))
            conn.commit()
            conn.close()
            return {'success': False, 'error': f'Invalid password. {5 - new_attempts} attempts remaining.'}

def validate_session(session_token):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT s.*, u.username FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ?
    ''', (session_token,))
    session = cursor.fetchone()
    conn.close()
    
    if session:
        return {'valid': True, 'user_id': session['user_id'], 'username': session['username']}
    return {'valid': False}

def logout_user(session_token):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM user_sessions WHERE session_token = ?', (session_token,))
    conn.commit()
    conn.close()

def get_user_by_id(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def save_tool_history(user_id, tool_name, input_data, output_summary, result_data=None, details=None):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO tool_history (user_id, tool_name, input_data, output_summary, result_data, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, tool_name, input_data[:500], output_summary[:500],
          json.dumps(result_data) if result_data else None,
          json.dumps(details) if details else None, datetime.now()))
    
    cursor.execute('UPDATE users SET total_analyses = total_analyses + 1 WHERE id = ?', (user_id,))
    
    conn.commit()
    conn.close()
    print(f"📝 Saved: {tool_name}")

def get_user_history(user_id, tool_name=None, limit=50):
    conn = get_db()
    cursor = conn.cursor()
    
    cutoff = datetime.now() - timedelta(days=15)
    
    query = 'SELECT * FROM tool_history WHERE user_id = ? AND created_at > ?'
    params = [user_id, cutoff]
    
    if tool_name:
        query += ' AND tool_name = ?'
        params.append(tool_name)
    
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    
    return [dict(r) for r in results]

def get_user_stats(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT total_analyses, tools_used, last_login, created_at, total_sessions FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            'total_analyses': user['total_analyses'],
            'tools_used': json.loads(user['tools_used']) if user['tools_used'] else {'typosquat': 0, 'password': 0, 'exif': 0},
            'last_login': user['last_login'],
            'created_at': user['created_at'],
            'total_sessions': user['total_sessions']
        }
    return {
        'total_analyses': 0,
        'tools_used': {'typosquat': 0, 'password': 0, 'exif': 0},
        'last_login': None,
        'created_at': None,
        'total_sessions': 0
    }

def get_brute_force_attempts(username, hours=24):
    conn = get_db()
    cursor = conn.cursor()
    cutoff = datetime.now() - timedelta(hours=hours)
    cursor.execute('''
        SELECT COUNT(*) FROM login_attempts 
        WHERE username = ? AND attempt_time > ? AND success = 0
    ''', (username, cutoff))
    count = cursor.fetchone()[0]
    conn.close()
    return count

# Initialize
init_db()