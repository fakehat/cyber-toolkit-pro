"""
Main Flask Application
All tools are imported from /tools folder - keeping app.py clean
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
import secrets
from datetime import datetime
import os

# Fix for Windows socket error
#os.environ['WERKZEUG_RUN_MAIN'] = 'true'

from tools import typosquat, password_analyzer, exif_analyzer
from database import (
    authenticate_user, create_user, save_tool_history, get_user_history, 
    get_brute_force_attempts, get_user_stats, validate_session, logout_user
)

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# ==================== AUTH DECORATOR ====================

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('signup_page'))
        return f(*args, **kwargs)
    return decorated_function

# ==================== AUTH ROUTES ====================

@app.route('/')
def index():
    """Default page - Redirect to signup"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('signup_page'))

@app.route('/signup')
def signup_page():
    """Signup page (default)"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('signup.html')

@app.route('/login')
def login_page():
    """Login page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard after login"""
    stats = get_user_stats(session['user_id'])
    return render_template('index.html', 
                         username=session.get('username'),
                         stats=stats)

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    return redirect(url_for('signup_page'))

@app.route('/api/signup', methods=['POST'])
def api_signup():
    """API endpoint for signup - auto login after signup"""
    data = request.json
    username = data.get('username', '')
    email = data.get('email', '')
    password = data.get('password', '')
    
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"})
    
    result = create_user(username, email, password)
    
    if isinstance(result, dict) and 'error' in result:
        return jsonify({"success": False, "error": result['error']})
    
    # Auto login after successful signup
    auth_result = authenticate_user(username, password, request.remote_addr)
    if auth_result['success']:
        session['user_id'] = auth_result['user_id']
        session['username'] = auth_result['username']
        return jsonify({"success": True, "redirect": "/dashboard"})
    
    return jsonify({"success": True, "redirect": "/login"})

@app.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for login"""
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')
    ip_address = request.remote_addr
    
    result = authenticate_user(username, password, ip_address)
    
    if result['success']:
        session['user_id'] = result['user_id']
        session['username'] = result['username']
        return jsonify({"success": True, "redirect": "/dashboard"})
    else:
        attempts = get_brute_force_attempts(username)
        return jsonify({"success": False, "error": result['error'], "attempts_left": max(0, 5 - attempts)})

@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    """Get user's tool history"""
    tool_name = request.args.get('tool')
    limit = request.args.get('limit', 50, type=int)
    
    history = get_user_history(session['user_id'], tool_name, limit)
    return jsonify({
        "success": True,
        "history": history
    })

@app.route('/api/current-user', methods=['GET'])
def current_user():
    """Get current logged in user with stats"""
    if 'user_id' in session:
        stats = get_user_stats(session['user_id'])
        return jsonify({
            "authenticated": True,
            "username": session.get('username'),
            "stats": stats
        })
    return jsonify({"authenticated": False})

@app.route('/api/user-stats', methods=['GET'])
@login_required
def user_stats():
    """Get user statistics"""
    stats = get_user_stats(session['user_id'])
    return jsonify({
        "success": True,
        "stats": {
            "total_analyses": stats.get('total_analyses', 0),
            "tools_used": stats.get('tools_used', {}),
            "last_login": stats.get('last_login').strftime('%Y-%m-%d %H:%M:%S') if stats.get('last_login') else None,
            "member_since": stats.get('created_at').strftime('%Y-%m-%d') if stats.get('created_at') else None,
            "total_sessions": stats.get('total_sessions', 0)
        }
    })

@app.route('/api/brute-force-status', methods=['GET'])
@login_required
def brute_force_status():
    """Get brute force attempt status"""
    username = session.get('username')
    attempts = get_brute_force_attempts(username, hours=24)
    return jsonify({
        "attempts": attempts,
        "remaining": max(0, 5 - attempts),
        "warning": attempts >= 3
    })

# ==================== TYPOSQUAT API ====================

@app.route('/analyze-typosquat', methods=['POST'])
@login_required
def analyze_typosquat():
    """API endpoint for typosquat analysis"""
    data = request.json
    urls = data.get('urls', [])
    
    if not urls:
        return jsonify({"error": "No URLs provided"}), 400
    
    results = []
    for url in urls:
        # Clean and validate URL
        url = url.strip()
        
        # Check for empty domain
        if not url:
            results.append({
                "success": False,
                "url": url,
                "domain": "",
                "error": "EMPTY DOMAIN",
                "error_reason": "No domain name was provided",
                "error_suggestion": "Please enter a valid domain name like 'google.com'",
                "error_icon": "📝",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": []},
                    "ssl": {"valid": False},
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            })
            continue
        
        # Basic validation - clean URL
        clean_url = url.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0]
        
        # Check domain length
        if len(clean_url) < 3:
            results.append({
                "success": False,
                "url": url,
                "domain": clean_url,
                "error": "DOMAIN TOO SHORT",
                "error_reason": f"'{clean_url}' is too short (minimum 3 characters required)",
                "error_suggestion": "Enter a valid domain name like 'google.com'",
                "error_icon": "📏",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Domain too short"]},
                    "ssl": {"valid": False},
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            })
            continue
        
        # Check for domain extension
        if '.' not in clean_url:
            results.append({
                "success": False,
                "url": url,
                "domain": clean_url,
                "error": "MISSING DOMAIN EXTENSION",
                "error_reason": f"'{clean_url}' is missing a domain extension like .com, .pk, or .org",
                "error_suggestion": f"Try '{clean_url}.com' or add a valid extension",
                "error_icon": "🔗",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Missing domain extension"]},
                    "ssl": {"valid": False},
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            })
            continue
        
        # Check for invalid characters
        invalid_chars = [' ', '$', '%', '^', '&', '*', '(', ')', '+', '=', '{', '}', '[', ']', '|', '\\', ';', ':', '"', "'", '<', '>', ',', '`', '~', '#', '?', '/']
        invalid_found = None
        for char in invalid_chars:
            if char in clean_url:
                invalid_found = char
                break
        
        if invalid_found:
            results.append({
                "success": False,
                "url": url,
                "domain": clean_url,
                "error": "INVALID CHARACTER",
                "error_reason": f"Domain contains an invalid character: '{invalid_found}'",
                "error_suggestion": "Domain names can only contain letters, numbers, dots, and hyphens",
                "error_icon": "🚫",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": [f"Invalid character: {invalid_found}"]},
                    "ssl": {"valid": False},
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            })
            continue
        
        # Check domain format (should start with alphanumeric)
        if not clean_url[0].isalnum():
            results.append({
                "success": False,
                "url": url,
                "domain": clean_url,
                "error": "INVALID DOMAIN FORMAT",
                "error_reason": "Domain name must start with a letter or number",
                "error_suggestion": "Example: 'google.com' (starts with letter 'g')",
                "error_icon": "📝",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Invalid domain format"]},
                    "ssl": {"valid": False},
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            })
            continue
        
        # Proceed with actual analysis for valid domains
        result = typosquat.capture_and_analyze(url)
        results.append(result)
    
    # Calculate high risk count
    high_risk_count = sum(1 for r in results if r.get('success') and r.get('analysis', {}).get('risk_level') == 'HIGH')
    
    # Save to history with detailed info
    save_tool_history(
        session['user_id'], 
        'typosquat', 
        ', '.join(urls[:3]), 
        f"Analyzed {len(urls)} domains, {high_risk_count} high risk found",
        {
            "urls": urls[:5],
            "total_urls": len(urls),
            "high_risk_count": high_risk_count,
            "successful_count": sum(1 for r in results if r['success'])
        }
    )
    
    return jsonify({
        "success": True,
        "results": results,
        "total": len(results),
        "analyzed": sum(1 for r in results if r['success'])
    })

# ==================== PASSWORD API ====================

@app.route('/analyze-password', methods=['POST'])
@login_required
def analyze_password():
    """API endpoint for password analysis"""
    data = request.json
    password = data.get('password', '')
    
    if not password:
        return jsonify({"error": "No password provided"}), 400
    
    report = password_analyzer.analyze_password(password)
    
    # Save to history with detailed info
    save_tool_history(
        session['user_id'],
        'password',
        f"Password (length: {len(password)})",
        f"Strength: {report.strength_label}, Score: {report.score}/10, Breach: {'Yes' if report.breach_count > 0 else 'No'}",
        {
            "strength": report.strength_label,
            "score": report.score,
            "entropy": report.entropy,
            "length": len(password),
            "breach_count": report.breach_count,
            "has_uppercase": report.composition.get('uppercase', 0) > 0,
            "has_lowercase": report.composition.get('lowercase', 0) > 0,
            "has_digits": report.composition.get('digits', 0) > 0,
            "has_symbols": report.composition.get('symbols', 0) > 0
        }
    )
    
    return jsonify({
        "success": True,
        "report": {
            "score": report.score,
            "entropy": report.entropy,
            "length": report.length,
            "charset_size": report.charset_size,
            "strength_label": report.strength_label,
            "issues": report.issues,
            "patterns_found": report.patterns_found,
            "composition": report.composition,
            "crack_times": report.crack_times,
            "breach_count": report.breach_count,
            "suggestions": report.suggestions,
            "is_reused": report.is_reused,
            "analysis_time_ms": report.analysis_time_ms
        }
    })

# ==================== EXIF API ====================

@app.route('/analyze-exif', methods=['POST'])
@login_required
def analyze_exif():
    """API endpoint for EXIF/GPS analysis"""
    data = request.json
    image_base64 = data.get('image', '')
    filename = data.get('filename', 'image.jpg')
    
    if not image_base64:
        return jsonify({"error": "No image provided"}), 400
    
    result = exif_analyzer.analyze_image_from_base64(image_base64, filename)
    
    # Save to history with detailed info
    if result.get('success', True) and 'error' not in result:
        has_gps = result.get('gps_info', {}).get('lat') is not None
        is_ai = result.get('ai_generation_detection', {}).get('is_ai_generated', False)
        
        save_tool_history(
            session['user_id'],
            'exif',
            filename,
            f"File: {filename}, GPS: {'Yes' if has_gps else 'No'}, AI: {'Yes' if is_ai else 'No'}, Camera: {result.get('camera_info', {}).get('make', 'Unknown')}",
            {
                "filename": filename,
                "has_gps": has_gps,
                "is_ai_generated": is_ai,
                "camera_make": result.get('camera_info', {}).get('make'),
                "camera_model": result.get('camera_info', {}).get('model'),
                "file_size_kb": result.get('basic_info', {}).get('size_kb'),
                "image_size": f"{result.get('basic_info', {}).get('width')}x{result.get('basic_info', {}).get('height')}"
            }
        )
    
    return jsonify({
        "success": result.get("success", True) if "error" not in result else False,
        "result": result
    })

# ==================== STATIC FILES ====================

@app.route('/screenshots/<path:filename>')
def serve_screenshot(filename):
    """Serve screenshot files"""
    from flask import send_file
    return send_file(f"screenshots/{filename}")


if __name__ == '__main__':
    # Use debug=False to avoid socket error on Windows
    app.run(debug=False, port=5000, threaded=True)