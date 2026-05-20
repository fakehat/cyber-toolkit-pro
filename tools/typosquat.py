"""
Typosquat Detector Module
All typosquat detection logic is here - completely separate from main app
"""

import ssl
import socket
import re
from urllib.parse import urlparse
from difflib import SequenceMatcher
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import os
import time
import base64

# Chrome Driver Path (configure once)
DRIVER_PATH = r"C:\chromedriver-win64\chromedriver.exe"
SCREENSHOT_FOLDER = "screenshots"
os.makedirs(SCREENSHOT_FOLDER, exist_ok=True)

# Known legitimate domains for comparison
LEGITIMATE_DOMAINS = {
    "google.com": "Google",
    "facebook.com": "Facebook",
    "amazon.com": "Amazon",
    "paypal.com": "PayPal",
    "microsoft.com": "Microsoft",
    "apple.com": "Apple",
    "netflix.com": "Netflix",
    "bankofamerica.com": "Bank of America",
    "chase.com": "Chase Bank",
    "wellsfargo.com": "Wells Fargo",
    "hbl.com": "HBL Bank",
    "mcb.com.pk": "MCB Bank",
    "ubl.com.pk": "UBL Bank",
    "nbp.com.pk": "NBP Bank",
    "github.com": "GitHub",
    "stackoverflow.com": "StackOverflow",
    "python.org": "Python",
    "musely.ai": "Musely"
}

def analyze_typosquatting(url):
    """Check if domain is typosquatting attempt"""
    parsed = urlparse(url if '://' in url else f'http://{url}')
    domain = parsed.netloc or parsed.path.split('/')[0]
    domain = domain.replace('www.', '')
    
    results = {
        "is_typosquat": False,
        "matched_legitimate": None,
        "similarity_score": 0,
        "issues": [],
        "domain": domain
    }
    
    # Check against legitimate domains
    for legit_domain, brand in LEGITIMATE_DOMAINS.items():
        if domain == legit_domain:
            results["is_typosquat"] = False
            results["matched_legitimate"] = brand
            results["similarity_score"] = 100
            return results
        
        # Calculate similarity
        similarity = SequenceMatcher(None, domain, legit_domain).ratio()
        
        if similarity > 0.8 and domain != legit_domain:
            results["is_typosquat"] = True
            results["matched_legitimate"] = brand
            results["similarity_score"] = int(similarity * 100)
            results["issues"].append(f"Domain appears similar to {brand} (similarity: {int(similarity*100)}%)")
    
    # Check for suspicious patterns
    if '0' in domain or '1' in domain:
        results["issues"].append("Contains number substitution (common in typosquatting)")
        results["is_typosquat"] = True
    
    if 'rn' in domain or 'vv' in domain:
        results["issues"].append("Contains character substitution (rn→m, vv→w)")
        results["is_typosquat"] = True
    
    if domain.count('-') > 1:
        results["issues"].append("Multiple hyphens detected")
        results["is_typosquat"] = True
    
    return results

def check_ssl_certificate(domain):
    """Check if SSL certificate is valid"""
    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                return {
                    "valid": True,
                    "issuer": dict(x[0] for x in cert['issuer']).get('organizationName', 'Unknown'),
                    "expiry": cert['notAfter']
                }
    except:
        return {"valid": False, "issuer": None, "expiry": None}

def detect_suspicious_elements(driver, url):
    """Detect suspicious UI elements"""
    suspicious = []
    
    try:
        page_source = driver.page_source.lower()
        
        # Check for fake login indicators
        if 'login' in page_source or 'sign in' in page_source:
            suspicious.append("⚠️ Login form detected on suspicious domain")
        
        # Check for urgency/pressure tactics
        urgency_keywords = ['urgent', 'verify now', 'account suspended', 'immediately', 'click here']
        for keyword in urgency_keywords:
            if keyword in page_source:
                suspicious.append(f"⚠️ Urgency tactic detected: '{keyword}'")
        
        # Check for iframe injection
        iframes = driver.find_elements("tag name", "iframe")
        if len(iframes) > 3:
            suspicious.append(f"⚠️ Multiple iframes detected ({len(iframes)}) - potential injection")
        
        # Check for hidden elements
        hidden_elements = driver.find_elements("css selector", "[hidden], [type='hidden']")
        if len(hidden_elements) > 5:
            suspicious.append(f"⚠️ Hidden form fields detected ({len(hidden_elements)})")
        
    except:
        pass
    
    return suspicious

def capture_and_analyze(url):
    """Main function to capture and analyze website"""
    try:
        original_url = url
        clean_domain = url.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0]
        
        # ========== INVALID DOMAIN VALIDATION WITH REASONS ==========
        
        # Check for empty or too short domain
        if not clean_domain or len(clean_domain) < 3:
            return {
                "success": False,
                "url": original_url,
                "domain": clean_domain,
                "error": "DOMAIN NAME TOO SHORT",
                "error_reason": "Domain name must be at least 3 characters long",
                "error_suggestion": "Please enter a valid domain name like 'google.com'",
                "error_icon": "📏",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Domain too short"]},
                    "ssl": {"valid": False, "issuer": None},
                    "suspicious_elements": [],
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            }
        
        # Check if domain has extension
        if '.' not in clean_domain:
            return {
                "success": False,
                "url": original_url,
                "domain": clean_domain,
                "error": "MISSING DOMAIN EXTENSION",
                "error_reason": "Domain name must include an extension like .com, .pk, .org, etc.",
                "error_suggestion": f"Try '{clean_domain}.com' or add a valid extension",
                "error_icon": "🔗",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Missing domain extension"]},
                    "ssl": {"valid": False, "issuer": None},
                    "suspicious_elements": [],
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            }
        
        # Check for invalid characters in domain
        invalid_chars = [' ', '$', '%', '^', '&', '*', '(', ')', '+', '=', '{', '}', '[', ']', '|', '\\', ';', ':', '"', "'", '<', '>', ',', '`', '~', '#', '?', '/']
        for char in invalid_chars:
            if char in clean_domain:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "INVALID CHARACTER DETECTED",
                    "error_reason": f"Domain name contains an invalid character: '{char}'",
                    "error_suggestion": "Domain names can only contain letters, numbers, dots, and hyphens",
                    "error_icon": "🚫",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": [f"Invalid character: {char}"]},
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 0,
                        "risk_level": "LOW"
                    }
                }
        
        # Check domain format
        if not clean_domain[0].isalnum():
            return {
                "success": False,
                "url": original_url,
                "domain": clean_domain,
                "error": "INVALID DOMAIN FORMAT",
                "error_reason": "Domain name must start with a letter or number",
                "error_suggestion": "Example: 'google.com' (starts with letter)",
                "error_icon": "📝",
                "screenshot": "",
                "analysis": {
                    "typosquatting": {"is_typosquat": False, "similarity_score": 0, "issues": ["Invalid domain format"]},
                    "ssl": {"valid": False, "issuer": None},
                    "suspicious_elements": [],
                    "risk_score": 0,
                    "risk_level": "LOW"
                }
            }
        
        # ========== NORMAL ANALYSIS FOR VALID DOMAINS ==========
        
        if not url.startswith('http'):
            url = 'https://' + url
        
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        service = Service(DRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=options)
        driver.set_page_load_timeout(15)
        
        try:
            driver.get(url)
        except Exception as e:
            driver.quit()
            error_msg = str(e)
            typosquat_analysis = analyze_typosquatting(original_url)
            
            if "ERR_NAME_NOT_RESOLVED" in error_msg:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "DOMAIN DOES NOT EXIST",
                    "error_reason": f"'{clean_domain}' is not registered or does not exist",
                    "error_suggestion": "Check the spelling or try a different domain name",
                    "error_icon": "🌐",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": typosquat_analysis,
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 40 if typosquat_analysis.get("is_typosquat") else 0,
                        "risk_level": "MEDIUM" if typosquat_analysis.get("is_typosquat") else "LOW"
                    }
                }
            elif "ERR_CONNECTION_REFUSED" in error_msg:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "CONNECTION REFUSED",
                    "error_reason": f"The server for '{clean_domain}' refused the connection",
                    "error_suggestion": "The website may be down or blocking access",
                    "error_icon": "🔌",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": typosquat_analysis,
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 40 if typosquat_analysis.get("is_typosquat") else 0,
                        "risk_level": "MEDIUM" if typosquat_analysis.get("is_typosquat") else "LOW"
                    }
                }
            elif "ERR_TIMED_OUT" in error_msg:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "CONNECTION TIMEOUT",
                    "error_reason": f"'{clean_domain}' is taking too long to respond",
                    "error_suggestion": "The server might be slow or overloaded. Try again later.",
                    "error_icon": "⏰",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": typosquat_analysis,
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 40 if typosquat_analysis.get("is_typosquat") else 0,
                        "risk_level": "MEDIUM" if typosquat_analysis.get("is_typosquat") else "LOW"
                    }
                }
            elif "net::ERR_CERT" in error_msg:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "SSL CERTIFICATE ERROR",
                    "error_reason": f"'{clean_domain}' has an invalid security certificate",
                    "error_suggestion": "The website exists but has security issues. Be careful!",
                    "error_icon": "🔒",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": typosquat_analysis,
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 40 if typosquat_analysis.get("is_typosquat") else 0,
                        "risk_level": "MEDIUM" if typosquat_analysis.get("is_typosquat") else "LOW"
                    }
                }
            else:
                return {
                    "success": False,
                    "url": original_url,
                    "domain": clean_domain,
                    "error": "CANNOT REACH DOMAIN",
                    "error_reason": f"Unable to connect to '{clean_domain}'",
                    "error_suggestion": "Check if the domain is correct and the website is online",
                    "error_icon": "❓",
                    "screenshot": "",
                    "analysis": {
                        "typosquatting": typosquat_analysis,
                        "ssl": {"valid": False, "issuer": None},
                        "suspicious_elements": [],
                        "risk_score": 40 if typosquat_analysis.get("is_typosquat") else 0,
                        "risk_level": "MEDIUM" if typosquat_analysis.get("is_typosquat") else "LOW"
                    }
                }
        
        time.sleep(2)
        
        # Analyze typosquatting
        typosquat_analysis = analyze_typosquatting(url)
        
        # Check SSL
        domain = urlparse(url).netloc
        ssl_info = check_ssl_certificate(domain)
        
        # Detect suspicious elements
        suspicious_elements = detect_suspicious_elements(driver, url)
        
        # Capture screenshot
        filename = domain.replace('.', '_') + ".png"
        path = os.path.join(SCREENSHOT_FOLDER, filename)
        driver.save_screenshot(path)
        
        with open(path, "rb") as img_file:
            img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
        
        driver.quit()
        
        # Calculate risk score
        risk_score = 0
        if typosquat_analysis["is_typosquat"]:
            risk_score += 40
        if not ssl_info["valid"]:
            risk_score += 30
        if suspicious_elements:
            risk_score += min(30, len(suspicious_elements) * 10)
        
        risk_level = "HIGH" if risk_score > 60 else "MEDIUM" if risk_score > 30 else "LOW"
        
        return {
            "success": True,
            "url": original_url,
            "domain": domain,
            "screenshot": f"data:image/png;base64,{img_base64}",
            "analysis": {
                "typosquatting": typosquat_analysis,
                "ssl": ssl_info,
                "suspicious_elements": suspicious_elements,
                "risk_score": risk_score,
                "risk_level": risk_level
            }
        }
        
    except Exception as e:
        error_msg = str(e)[:200]
        return {
            "success": False,
            "url": url,
            "domain": url,
            "error": "ANALYSIS ERROR",
            "error_reason": "An unexpected error occurred during analysis",
            "error_suggestion": "Please try again or check your internet connection",
            "error_icon": "⚠️",
            "screenshot": "",
            "analysis": {
                "typosquatting": {
                    "is_typosquat": False,
                    "matched_legitimate": None,
                    "similarity_score": 0,
                    "issues": ["Analysis failed"]
                },
                "ssl": {"valid": False, "issuer": None},
                "suspicious_elements": [],
                "risk_score": 0,
                "risk_level": "LOW"
            }
        }