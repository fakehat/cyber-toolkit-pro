"""
Password Analyzer Module
Password strength analysis, breach checking, entropy calculation
"""

import re
import math
import hashlib
import requests
import time
from dataclasses import dataclass
from typing import Optional

# Common passwords blacklist
COMMON_PASSWORDS = {
    "123456", "password", "qwerty", "admin", "12345678", "letmein",
    "welcome", "monkey", "dragon", "master", "sunshine", "princess",
    "shadow", "iloveyou", "abc123", "football", "superman", "batman",
    "trustno1", "hello", "computer", "baseball", "soccer", "admin123",
    "qwerty123", "123456789", "password123", "12345", "1234567890"
}

KEYBOARD_WALKS = [
    "qwerty", "asdf", "zxcv", "qwert", "asdfg", "zxcvb",
    "12345", "23456", "34567", "45678", "56789", "01234",
    "qazwsx", "wsxedc", "1qaz2wsx", "qwertyuiop", "asdfghjkl"
]

PASSPHRASE_WORDS = [
    "crimson", "falcon", "delta", "vector", "storm", "atlas",
    "zenith", "nexus", "cipher", "proxy", "ranger", "shield",
    "cobalt", "vortex", "matrix", "photon", "raven", "echo"
]

PASSWORD_HISTORY = []


@dataclass
class PasswordReport:
    """Password analysis report data structure"""
    password: str
    score: int
    entropy: float
    length: int
    charset_size: int
    strength_label: str
    issues: list
    patterns_found: list
    composition: dict
    crack_times: dict
    breach_count: int
    suggestions: list
    is_reused: bool
    analysis_time_ms: float


def calculate_entropy(password: str) -> tuple:
    """Calculate password entropy in bits"""
    if not password:
        return 0.0, 0
    charset = 0
    if re.search(r'[a-z]', password): charset += 26
    if re.search(r'[A-Z]', password): charset += 26
    if re.search(r'[0-9]', password): charset += 10
    if re.search(r'[^a-zA-Z0-9]', password): charset += 32
    entropy = round(len(password) * math.log2(charset), 2) if charset > 0 else 0
    return entropy, charset


def detect_patterns(password: str) -> list:
    """Detect weak patterns in password"""
    found = []
    low = password.lower()

    if low in COMMON_PASSWORDS:
        found.append("Common password (blacklisted) – easily guessable")

    for walk in KEYBOARD_WALKS:
        if walk in low:
            found.append(f"Keyboard walk detected: '{walk}'")

    if re.search(r'(.)\1{2,}', password):
        found.append("Repeated characters detected (e.g. 'aaa', '111')")

    if re.search(r'(.+)\1', password):
        found.append("Repeated sequence pattern")

    if re.search(r'(19|20)\d{2}', password):
        found.append("Year pattern detected (e.g. 1990, 2024)")

    if re.fullmatch(r'[a-zA-Z]+', password):
        found.append("Letters only — no numbers or symbols")

    if re.fullmatch(r'[0-9]+', password):
        found.append("Numbers only — no letters or symbols")

    if len(set(password)) < len(password) * 0.7:
        found.append("Low character variety – many repetitions")

    return found


def get_composition(password: str) -> dict:
    """Get character composition counts"""
    return {
        "lowercase": len(re.findall(r'[a-z]', password)),
        "uppercase": len(re.findall(r'[A-Z]', password)),
        "digits": len(re.findall(r'[0-9]', password)),
        "symbols": len(re.findall(r'[^a-zA-Z0-9]', password)),
    }


def get_crack_times(entropy: float) -> dict:
    """Estimate crack times for different scenarios"""
    def format_time(seconds: float) -> str:
        if seconds < 1:
            return "< 1 second ⚡"
        if seconds < 60:
            return f"{seconds:.0f} seconds"
        if seconds < 3600:
            return f"{seconds/60:.0f} minutes"
        if seconds < 86400:
            return f"{seconds/3600:.1f} hours"
        if seconds < 2592000:
            return f"{seconds/86400:.0f} days"
        if seconds < 31536000:
            return f"{seconds/2592000:.1f} months"
        if seconds < 3.15e10:
            return f"{seconds/31536000:.0f} years"
        return "Centuries 🏛️"

    scenarios = {
        "Online Attack (1k/s)": 1_000,
        "Offline bcrypt (1M/s)": 1_000_000,
        "GPU Cluster (100B/s)": 100_000_000_000,
        "Nation-state (1T/s)": 1_000_000_000_000,
    }

    result = {}
    for scenario, speed in scenarios.items():
        seconds = (2 ** entropy) / speed
        result[scenario] = format_time(seconds)
    
    return result


def check_breach(password: str) -> int:
    """Check if password appears in known breaches via HIBP API"""
    sha1 = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        response = requests.get(
            f"https://api.pwnedpasswords.com/range/{prefix}",
            headers={"Add-Padding": "true"},
            timeout=5
        )
        if response.status_code == 200:
            for line in response.text.splitlines():
                h, count = line.split(':')
                if h == suffix:
                    return int(count)
        return 0
    except requests.RequestException:
        return -1  # API unreachable


def is_password_reused(password: str) -> bool:
    """Check if password was used in this session"""
    h = hashlib.sha256(password.encode()).hexdigest()
    if h in PASSWORD_HISTORY:
        return True
    PASSWORD_HISTORY.append(h)
    return False


def score_password(password: str, patterns: list) -> tuple:
    """Calculate password strength score (0-10)"""
    score = 0
    feedback = []

    # Length scoring
    if len(password) >= 20:
        score += 4
        feedback.append("✅ Excellent length (20+ chars)")
    elif len(password) >= 16:
        score += 3
        feedback.append("✅ Great length (16+ chars)")
    elif len(password) >= 12:
        score += 2
        feedback.append("✅ Good length (12+ chars)")
    elif len(password) >= 8:
        score += 1
        feedback.append("⚠️ Minimum length — consider longer")
    else:
        feedback.append("❌ Too short (under 8 chars)")

    # Character variety
    if re.search(r'[A-Z]', password):
        score += 1
        feedback.append("✅ Has uppercase letters")
    else:
        feedback.append("❌ Missing uppercase letters")

    if re.search(r'[a-z]', password):
        score += 1
        feedback.append("✅ Has lowercase letters")
    else:
        feedback.append("❌ Missing lowercase letters")

    if re.search(r'[0-9]', password):
        score += 1
        feedback.append("✅ Has numbers")
    else:
        feedback.append("❌ Missing numbers")

    if re.search(r'[!@#$%^&*()\-_=+[\]{};:\'",.<>?/\\|`~]', password):
        score += 2
        feedback.append("✅ Has special characters")
    else:
        feedback.append("❌ Missing special characters")

    # Penalty for patterns
    score = max(0, score - len(patterns))
    for p in patterns[:4]:
        feedback.append(f"⚠️ {p}")

    # Strength label
    if score >= 8:
        label = "VERY STRONG 🛡️"
    elif score >= 6:
        label = "STRONG 💪"
    elif score >= 4:
        label = "MODERATE ⚠️"
    elif score >= 2:
        label = "WEAK ❌"
    else:
        label = "CRITICAL 🚨"

    return score, feedback, label


def generate_suggestions(password: str) -> list:
    """Generate stronger password suggestions"""
    import random
    suggestions = []
    
    # Suggestion 1: Add length and variety
    if len(password) < 12:
        suggestions.append(f"{password}Secure@2024!")
    
    # Suggestion 2: Transform with substitutions
    transformed = password
    substitutions = {'a': '@', 'e': '3', 'i': '!', 'o': '0', 's': '$'}
    for old, new in substitutions.items():
        transformed = transformed.replace(old, new)
    if transformed != password:
        suggestions.append(f"{transformed.capitalize()}!9#")
    
    # Suggestion 3: Passphrase style
    words = random.sample(PASSPHRASE_WORDS, 3)
    num = random.randint(10, 99)
    suggestions.append(f"{words[0]}-{words[1]}-{words[2]}{num}!")
    
    # Suggestion 4: Add random suffix
    if len(password) >= 8:
        suggestions.append(f"{password[:8]}Xy9#@2024")
    
    return suggestions[:4]


def analyze_password(password: str, check_breach_enabled: bool = True) -> PasswordReport:
    """Main function to analyze password strength"""
    start_time = time.time()

    entropy, charset = calculate_entropy(password)
    patterns = detect_patterns(password)
    score, feedback, strength = score_password(password, patterns)
    composition = get_composition(password)
    crack_times = get_crack_times(entropy)
    breach_count = check_breach(password) if check_breach_enabled else 0
    reused = is_password_reused(password)
    suggestions = generate_suggestions(password)
    elapsed_ms = round((time.time() - start_time) * 1000, 1)

    return PasswordReport(
        password=password,
        score=score,
        entropy=entropy,
        length=len(password),
        charset_size=charset,
        strength_label=strength,
        issues=feedback,
        patterns_found=patterns,
        composition=composition,
        crack_times=crack_times,
        breach_count=breach_count,
        suggestions=suggestions,
        is_reused=reused,
        analysis_time_ms=elapsed_ms
    )