"""
EXIF Forensic Analyzer - Complete Port from exif_tool.py
Extracts GPS, camera metadata, AI detection, steganography, and more
"""

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import os
import time
import requests
import json
from datetime import datetime
import webbrowser
import re
from io import BytesIO
import base64

# GPS to Address
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# Map generation
import folium

# Steganography detection (original LSB)
try:
    from stegano import lsb
    STEGANO_AVAILABLE = True
except ImportError:
    STEGANO_AVAILABLE = False

# OpenCV for manipulation detection (optional)
try:
    import cv2
    CV2_AVAILABLE = True
except:
    CV2_AVAILABLE = False

# New forensic enhancer (AI + steganography) – optional
try:
    from .forensic_enhancer import ForensicEnhancer
    ENHANCER_AVAILABLE = True
except ImportError:
    ENHANCER_AVAILABLE = False


class ExifForensicAnalyzer:
    """Complete Forensic EXIF Analyzer with Rate Limiting & URL Support"""
    
    def __init__(self, hive_api_key: str = None):
        # Setup rate-limited geocoder
        self.geolocator = Nominatim(user_agent="exif_forensic_tool", timeout=10)
        try:
            self.reverse_geocode = RateLimiter(self.geolocator.reverse, delay=1.5)
        except TypeError:
            self.reverse_geocode = RateLimiter(self.geolocator.reverse, min_delay_seconds=1.5)
        
        # Cache for addresses
        self.address_cache = {}
        
        # Fallback API
        self.fallback_api = "https://api.bigdatacloud.net/data/reverse-geocode-client"
        
        # Track request times
        self.last_request_time = 0

        # Initialize forensic enhancer (AI + steganography) if available
        self.forensic_enhancer = None
        if ENHANCER_AVAILABLE:
            try:
                self.forensic_enhancer = ForensicEnhancer(hive_api_key)
            except Exception as e:
                print(f"Forensic enhancer init error: {e}")
    
    def download_from_url(self, url):
        """Download image from URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # Handle Instagram URLs
            if 'instagram.com' in url.lower() or 'instagr.am' in url.lower():
                return self._download_instagram(url, headers)
            else:
                response = requests.get(url, headers=headers, timeout=15)
                if response.status_code == 200:
                    return Image.open(BytesIO(response.content))
            return None
        except Exception as e:
            print(f"Download error: {e}")
            return None
    
    def _download_instagram(self, url, headers):
        """Extract and download image from Instagram"""
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            patterns = [
                r'"display_url":"([^"]+)"',
                r'"display_src":"([^"]+)"',
                r'"src":"([^"]+\.jpg)"',
                r'"url":"([^"]+\.jpg)"'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, response.text)
                if matches:
                    img_url = matches[0].replace('\\u0026', '&')
                    img_response = requests.get(img_url, headers=headers, timeout=10)
                    if img_response.status_code == 200:
                        return Image.open(BytesIO(img_response.content))
            
            raise Exception("No image found in Instagram page")
        except Exception as e:
            print(f"Instagram error: {e}")
            return None
    
    def _get_address_with_fallback(self, lat, lon):
        """Get address with caching and multiple fallback APIs"""
        cache_key = f"{lat},{lon}"
        
        if cache_key in self.address_cache:
            return self.address_cache[cache_key]
        
        # Try BigDataCloud FIRST
        try:
            response = requests.get(
                self.fallback_api,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "localityLanguage": "en"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                city = data.get('city', '')
                locality = data.get('locality', '')
                principal = data.get('principalSubdivision', '')
                country = data.get('countryName', '')
                
                parts = [p for p in [locality, city, principal, country] if p]
                address = ", ".join(parts) if parts else f"Near {lat}, {lon}"
                
                self.address_cache[cache_key] = address
                return address
        except Exception as e:
            print(f"BigDataCloud error: {e}")
        
        # Fallback to OpenStreetMap
        try:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < 1.5:
                time.sleep(1.5 - time_since_last)
            
            location = self.reverse_geocode(f"{lat}, {lon}")
            self.last_request_time = time.time()
            
            if location and location.address:
                self.address_cache[cache_key] = location.address
                return location.address
        except Exception as e:
            print(f"OpenStreetMap error: {e}")
        
        maps_link = f"https://www.google.com/maps?q={lat},{lon}"
        self.address_cache[cache_key] = maps_link
        return maps_link
    
    def analyze_image_from_url(self, url):
        """Analyze image directly from URL"""
        img = self.download_from_url(url)
        if img:
            temp_path = f"temp_url_{int(time.time())}.jpg"
            img.save(temp_path)
            result = self.analyze_single_image(temp_path)
            os.remove(temp_path)
            
            result['source_url'] = url
            result['platform'] = self._detect_platform_from_url(url)
            return result
        return None
    
    def _detect_platform_from_url(self, url):
        """Detect platform from URL"""
        url_lower = url.lower()
        if 'instagram.com' in url_lower:
            return "📸 Instagram"
        elif 'facebook.com' in url_lower:
            return "📘 Facebook"
        elif 'twitter.com' in url_lower or 'x.com' in url_lower:
            return "🐦 Twitter/X"
        elif 'pinterest.com' in url_lower:
            return "📌 Pinterest"
        elif 'tiktok.com' in url_lower:
            return "🎵 TikTok"
        else:
            return "🌐 Direct URL"
    
    def analyze_single_image(self, image_path):
        """Analyze single image and return complete report"""
        report = {
            "file": os.path.basename(image_path),
            "path": image_path,
            "size": os.path.getsize(image_path),
            "basic_info": {},
            "camera_info": {},
            "camera_settings": {},
            "gps_info": {},
            "location_details": {},
            "temporal_info": {},
            "manipulation_detection": {},
            "social_media_origin": {},
            "ai_generation_detection": {},
            "steganography_detection": {},
            "thumbnail_analysis": {},
            "forensic_indicators": []
        }
        
        try:
            img = Image.open(image_path)
            exif = img._getexif()
            
            # Basic Info
            report["basic_info"] = {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "size_kb": round(os.path.getsize(image_path) / 1024, 2)
            }
            
            if not exif:
                report["forensic_indicators"].append("⚠️ No EXIF data found (might be stripped or social media compressed)")
                # Even without EXIF, we can try forensic enhancer
                if self.forensic_enhancer:
                    enhancer_results = self.forensic_enhancer.analyze(image_path, img, {})
                    report["ai_generation_detection"] = enhancer_results.get("ai_generation_detection", {})
                    report["steganography_detection"] = enhancer_results.get("steganography_detection", {})
                    report["forensic_indicators"].extend(enhancer_results.get("forensic_indicators", []))
                else:
                    # Fallback to original methods
                    report["steganography_detection"] = self._detect_steganography(image_path)
                    report["ai_generation_detection"] = self._detect_ai_generated({}, img, image_path)
                report["temporal_info"] = self._get_file_timestamp(image_path)
                return report
            
            # Convert EXIF to readable format
            exif_data = {TAGS.get(k, k): v for k, v in exif.items()}
            
            # Camera Info
            report["camera_info"] = {
                "make": exif_data.get("Make", "Unknown"),
                "model": exif_data.get("Model", "Unknown"),
                "software": exif_data.get("Software", "Unknown"),
                "lens": exif_data.get("LensModel", "Unknown"),
                "firmware": exif_data.get("Firmware", "Unknown"),
                "serial_number": exif_data.get("BodySerialNumber", exif_data.get("SerialNumber", "Not found"))
            }
            
            # Camera Settings
            report["camera_settings"] = {
                "iso": exif_data.get("ISOSpeedRatings", "N/A"),
                "f_number": self._parse_fnumber(exif_data.get("FNumber")),
                "exposure_time": self._parse_exposure(exif_data.get("ExposureTime")),
                "focal_length": exif_data.get("FocalLength", "N/A"),
                "white_balance": "Auto" if exif_data.get("WhiteBalance") == 0 else "Manual",
                "flash": self._parse_flash(exif_data.get("Flash")),
                "metering_mode": exif_data.get("MeteringMode", "N/A")
            }
            
            # GPS Data Processing
            gps_raw = exif_data.get("GPSInfo")
            if gps_raw:
                report["gps_info"] = self._extract_gps(gps_raw)
                if report["gps_info"]["lat"]:
                    report["location_details"]["address"] = self._get_address_with_fallback(
                        report["gps_info"]["lat"], 
                        report["gps_info"]["lon"]
                    )
                    report["location_details"]["maps_url"] = f"https://www.google.com/maps?q={report['gps_info']['lat']},{report['gps_info']['lon']}"
            else:
                report["gps_info"] = {"lat": None, "lon": None, "alt": None}
            
            # Temporal Analysis
            report["temporal_info"] = self._analyze_temporal(exif_data, img, image_path)
            
            # Social Media Detection
            report["social_media_origin"] = self._detect_social_media_advanced(exif_data, img)
            
            # ---- NEW: Use forensic enhancer for AI + steganography if available ----
            if self.forensic_enhancer:
                enhancer_results = self.forensic_enhancer.analyze(image_path, img, exif_data)
                report["ai_generation_detection"] = enhancer_results.get("ai_generation_detection", {})
                report["steganography_detection"] = enhancer_results.get("steganography_detection", {})
                # Merge forensic indicators
                existing = set(report.get("forensic_indicators", []))
                new_indicators = enhancer_results.get("forensic_indicators", [])
                report["forensic_indicators"] = list(existing.union(new_indicators))
            else:
                # Original fallback methods
                report["ai_generation_detection"] = self._detect_ai_generated(exif_data, img, image_path)
                report["steganography_detection"] = self._detect_steganography(image_path)
            
            # Manipulation Detection (keep original)
            report["manipulation_detection"] = self._detect_manipulation(img, exif_data, image_path)
            
            # Generate original forensic indicators (without duplication)
            orig_indicators = self._generate_indicators(report)
            # Merge again in case enhancer didn't run
            if not self.forensic_enhancer:
                report["forensic_indicators"] = orig_indicators
            
        except Exception as e:
            report["error"] = str(e)
            
        return report
    
    def _get_file_timestamp(self, file_path):
        """Get file system timestamps when EXIF is missing"""
        try:
            stat = os.stat(file_path)
            return {
                "datetime_taken": datetime.fromtimestamp(stat.st_mtime).strftime("%Y:%m:%d %H:%M:%S"),
                "datetime_modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y:%m:%d %H:%M:%S"),
                "datetime_created": datetime.fromtimestamp(stat.st_ctime).strftime("%Y:%m:%d %H:%M:%S"),
                "time_mismatch": False,
                "source": "File System (No EXIF metadata found)"
            }
        except:
            return {
                "datetime_taken": "Not available",
                "datetime_modified": "Not available",
                "datetime_created": "Not available",
                "time_mismatch": False,
                "source": "Unknown"
            }
    
    def _detect_steganography(self, image_path):
        """Original LSB steganography detection (fallback)"""
        detection = {
            "has_hidden_data": False,
            "hidden_message": None,
            "confidence": "Low",
            "method": None,
            "description": ""
        }
        
        if STEGANO_AVAILABLE:
            try:
                secret = lsb.reveal(image_path)
                if secret and len(secret.strip()) > 0:
                    detection["has_hidden_data"] = True
                    detection["hidden_message"] = secret[:200]
                    detection["confidence"] = "High"
                    detection["method"] = "LSB Steganography"
                    detection["description"] = f"Hidden message found ({len(secret)} characters)"
                    return detection
            except Exception as e:
                print(f"Stegano error: {e}")
        
        return detection
    
    def _detect_ai_generated(self, exif_data, img, image_path):
        """Original heuristic AI detection (fallback)"""
        detection = {
            "is_ai_generated": False,
            "ai_tool": None,
            "confidence": "Low",
            "signatures": [],
            "icon": "🤖",
            "description": ""
        }
        
        software = str(exif_data.get("Software", "")).lower() if exif_data else ""
        make = str(exif_data.get("Make", "")).lower() if exif_data else ""
        exif_count = len(exif_data) if exif_data else 0
        
        ai_tools = {
            "DALL-E": ["dall-e", "dalle", "openai"],
            "ChatGPT": ["chatgpt", "gpt-4", "chatgpt"],
            "Midjourney": ["midjourney", "mj"],
            "Stable Diffusion": ["stable diffusion", "dreamstudio", "stabilityai"],
            "Adobe Firefly": ["firefly", "adobe firefly"],
            "Leonardo AI": ["leonardo ai", "leonardo"]
        }
        
        for tool, keywords in ai_tools.items():
            for keyword in keywords:
                if keyword in software or keyword in make:
                    detection["is_ai_generated"] = True
                    detection["ai_tool"] = tool
                    detection["confidence"] = "High"
                    detection["description"] = f"AI Generated using {tool}"
                    detection["signatures"].append(f"Found '{keyword}' in metadata")
                    return detection
        
        width = img.width
        height = img.height
        
        common_ai_sizes = [
            (1024, 1024), (1792, 1024), (1024, 1792),
            (512, 512), (256, 256), (1152, 896), (896, 1152)
        ]
        
        is_ai_size = (width, height) in common_ai_sizes
        
        if exif_count < 3 and is_ai_size:
            detection["is_ai_generated"] = True
            detection["ai_tool"] = "ChatGPT / DALL-E"
            detection["confidence"] = "High"
            detection["description"] = f"AI typical size {width}x{height} with no metadata"
            detection["signatures"].append("Zero EXIF metadata")
            return detection
        
        if img.format == "PNG" and exif_count < 3:
            detection["is_ai_generated"] = True
            detection["ai_tool"] = "ChatGPT / DALL-E"
            detection["confidence"] = "High"
            detection["description"] = "PNG format with no metadata (ChatGPT default)"
            return detection
        
        return detection
    
    def _detect_social_media_advanced(self, exif_data, img):
        """Advanced social media platform detection"""
        detection = {
            "platform": "Unknown",
            "confidence": "Low",
            "signatures": [],
            "icon": "❓",
            "description": ""
        }
        
        software = str(exif_data.get("Software", "")).lower() if exif_data else ""
        make = str(exif_data.get("Make", "")).lower() if exif_data else ""
        exif_count = len(exif_data) if exif_data else 0
        
        if "whatsapp" in software:
            detection["platform"] = "WhatsApp"
            detection["confidence"] = "High"
            detection["icon"] = "📱"
            detection["description"] = "WhatsApp heavily compresses images and strips GPS"
        elif "instagram" in software:
            detection["platform"] = "Instagram"
            detection["confidence"] = "High"
            detection["icon"] = "📸"
        elif "capcut" in software:
            detection["platform"] = "CapCut"
            detection["confidence"] = "High"
            detection["icon"] = "✂️"
        elif "canva" in software:
            detection["platform"] = "Canva"
            detection["confidence"] = "High"
            detection["icon"] = "🎨"
        elif "twitter" in software or "x.com" in software:
            detection["platform"] = "Twitter/X"
            detection["confidence"] = "High"
            detection["icon"] = "🐦"
        elif exif_count < 5:
            detection["platform"] = "Likely Social Media"
            detection["confidence"] = "Medium"
            detection["icon"] = "🌐"
            detection["description"] = "Very limited metadata - Common in social media downloads"
        elif "iphone" in make or "samsung" in make or "pixel" in make:
            detection["platform"] = "Original Mobile Photo"
            detection["confidence"] = "High"
            detection["icon"] = "📱"
        elif "canon" in make or "nikon" in make or "sony" in make:
            detection["platform"] = "Original Camera Photo"
            detection["confidence"] = "High"
            detection["icon"] = "📷"
        
        return detection
    
    # ================= PRIVATE METHODS =================
    
    def _parse_fnumber(self, fnumber):
        if isinstance(fnumber, tuple):
            return f"{fnumber[0]}/{fnumber[1]}"
        return fnumber if fnumber else "N/A"
    
    def _parse_exposure(self, exposure):
        if isinstance(exposure, tuple):
            if exposure[1] > 0:
                return f"{exposure[0]}/{exposure[1]}s"
        return exposure if exposure else "N/A"
    
    def _parse_flash(self, flash):
        flash_modes = {
            0x0: "Flash did not fire",
            0x1: "Flash fired",
            0x5: "Flash fired, strobe return light not detected",
            0x7: "Flash fired, strobe return light detected",
        }
        return flash_modes.get(flash, "Unknown")
    
    def _extract_gps(self, gps_info):
        gps = {"lat": None, "lon": None, "alt": None}
        
        try:
            if 2 in gps_info and 1 in gps_info:
                lat_parts = gps_info[2]
                lat_ref = gps_info.get(1, "N")
                lat = self._convert_to_degrees(lat_parts)
                if lat_ref == "S":
                    lat = -lat
                gps["lat"] = round(lat, 6)
            
            if 4 in gps_info and 3 in gps_info:
                lon_parts = gps_info[4]
                lon_ref = gps_info.get(3, "E")
                lon = self._convert_to_degrees(lon_parts)
                if lon_ref == "W":
                    lon = -lon
                gps["lon"] = round(lon, 6)
            
            if 6 in gps_info:
                alt_parts = gps_info[6]
                if isinstance(alt_parts, tuple) and len(alt_parts) == 2 and alt_parts[1] != 0:
                    alt = alt_parts[0] / alt_parts[1]
                else:
                    alt = alt_parts if isinstance(alt_parts, (int, float)) else 0
                gps["alt"] = round(alt, 1) if alt else None
        except Exception as e:
            print(f"GPS extraction error: {e}")
        
        return gps
    
    def _convert_to_degrees(self, coordinate):
        if isinstance(coordinate, tuple) and len(coordinate) == 3:
            degrees = float(coordinate[0])
            minutes = float(coordinate[1]) / 60.0
            seconds = float(coordinate[2]) / 3600.0
            return degrees + minutes + seconds
        return 0
    
    def _analyze_temporal(self, exif_data, img, file_path):
        """Enhanced temporal analysis that ensures timestamp shows"""
        temporal = {
            "datetime_taken": "Not found",
            "datetime_original": "Not found",
            "datetime_digitized": "Not found",
            "datetime_modified": "Not found",
            "time_mismatch": False,
            "source": "EXIF Metadata"
        }
        
        # Try multiple EXIF date fields
        if exif_data:
            temporal["datetime_taken"] = exif_data.get("DateTime", "Not found")
            temporal["datetime_original"] = exif_data.get("DateTimeOriginal", "Not found")
            temporal["datetime_digitized"] = exif_data.get("DateTimeDigitized", "Not found")
        
        # Get file modification time
        mod_time = os.path.getmtime(file_path)
        temporal["datetime_modified"] = datetime.fromtimestamp(mod_time).strftime("%Y:%m:%d %H:%M:%S")
        
        # Check if any date was found
        date_found = temporal["datetime_taken"]
        if date_found == "Not found" and temporal["datetime_original"] != "Not found":
            date_found = temporal["datetime_original"]
            temporal["datetime_taken"] = date_found
        elif date_found == "Not found" and temporal["datetime_digitized"] != "Not found":
            date_found = temporal["datetime_digitized"]
            temporal["datetime_taken"] = date_found
        
        # If still no date, use file modification time
        if date_found == "Not found":
            temporal["datetime_taken"] = temporal["datetime_modified"]
            temporal["source"] = "File System (No EXIF date found)"
        
        # Check for time mismatch
        if temporal["datetime_taken"] != "Not found" and temporal["datetime_taken"][:10] != temporal["datetime_modified"][:10]:
            temporal["time_mismatch"] = True
        
        return temporal
    
    def _detect_manipulation(self, img, exif_data, file_path):
        """Detect image manipulation"""
        manipulation = {
            "is_edited": False,
            "editing_software": None,
            "warnings": []
        }
        
        if exif_data:
            software = str(exif_data.get("Software", ""))
            editing_tools = ["Photoshop", "Lightroom", "GIMP", "PicsArt", "Snapseed", "VSCO", "CapCut", "Canva"]
            
            for tool in editing_tools:
                if tool.lower() in software.lower():
                    manipulation["is_edited"] = True
                    manipulation["editing_software"] = tool
                    manipulation["warnings"].append(f"✏️ Edited with {tool}")
        
        return manipulation
    
    def _generate_indicators(self, report):
        """Generate forensic indicators"""
        indicators = []
        
        if report.get("gps_info", {}).get("lat"):
            indicators.append("📍 GPS Location Available")
        
        if report.get("manipulation_detection", {}).get("is_edited"):
            indicators.append("✏️ EDITED PHOTO DETECTED")
        
        if report.get("temporal_info", {}).get("time_mismatch"):
            indicators.append("⏰ TIME TAMPERING DETECTED")
        
        if not report.get("camera_info", {}).get("model") or report.get("camera_info", {}).get("model") == "Unknown":
            indicators.append("⚠️ No camera metadata - Possible social media image")
        
        ai = report.get("ai_generation_detection", {})
        if ai.get("is_ai_generated"):
            indicators.append(f"🤖 AI GENERATED: {ai.get('ai_tool', 'Unknown')}")
        
        stego = report.get("steganography_detection", {})
        if stego.get("has_hidden_data"):
            indicators.append(f"🕵️ STEGANOGRAPHY: Hidden data detected!")
        
        sm = report.get("social_media_origin", {})
        if sm.get("platform") != "Unknown":
            indicators.append(f"{sm.get('icon', '📱')} Origin: {sm['platform']}")
        
        return indicators


# ================= HELPER FUNCTION FOR API =================

def analyze_image_from_base64(image_base64, filename):
    """Analyze image from base64 string"""
    try:
        # Decode base64
        if ',' in image_base64:
            image_data = base64.b64decode(image_base64.split(',')[1])
        else:
            image_data = base64.b64decode(image_base64)
        
        # Save temporarily
        os.makedirs("uploads", exist_ok=True)
        temp_path = f"uploads/{filename}"
        
        with open(temp_path, "wb") as f:
            f.write(image_data)
        
        # Analyze – you can pass hive_api_key from environment if needed
        analyzer = ExifForensicAnalyzer()  # Add hive_api_key=os.getenv("HIVE_API_KEY") if you have it
        result = analyzer.analyze_single_image(temp_path)
        
        # Clean up
        os.remove(temp_path)
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "filename": filename
        }