"""
Forensic Enhancer for EXIF Tool
AI Image Detection (Hive AI) + Steganography Detection (Aletheia)
"""

import os
import requests
import subprocess
import json
from typing import Dict, Any
from io import BytesIO
from PIL import Image

# ==================== AI DETECTION (HIVE AI - Free Tier) ====================
class HiveAIDetector:
    """
    Uses Hive AI's free API to detect AI-generated images.
    Sign up at https://thehive.ai/ to get a free API key (1000 requests/month).
    """
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.endpoint = "https://api.thehive.ai/api/v2/image/detect"
        self.enabled = bool(api_key)

    def detect(self, image_bytes: bytes) -> Dict[str, Any]:
        if not self.enabled:
            return {"error": "Hive AI API key not configured", "is_ai_generated": None}

        files = {'image': ('image.jpg', image_bytes, 'image/jpeg')}
        headers = {'Authorization': f'Token {self.api_key}'}
        try:
            resp = requests.post(self.endpoint, files=files, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            # Parse Hive's response structure (adjust keys based on actual API)
            # Typical response: {"status": "success", "predictions": [{"class": "ai", "score": 0.95}]}
            predictions = data.get("predictions", [])
            if predictions:
                top = predictions[0]
                is_ai = top.get("class") == "ai"
                confidence = top.get("score", 0)
            else:
                is_ai = False
                confidence = 0
            return {
                "is_ai_generated": is_ai,
                "confidence": confidence,
                "ai_tool": top.get("model_name") if is_ai else None,
                "raw_response": data
            }
        except Exception as e:
            return {"error": str(e), "is_ai_generated": None}

# ==================== STEGANOGRAPHY DETECTION (ALETHEIA) ====================
class SteganographyDetector:
    """
    Uses Aletheia (open-source steganalysis tool) to detect hidden data.
    Install Aletheia: git clone https://github.com/k-dot-greyz/aletheia.git && cd aletheia && pip install -r requirements.txt
    """
    def __init__(self, aletheia_path: str = "aletheia"):
        self.aletheia_cmd = aletheia_path
        self.enabled = self._check_aletheia()

    def _check_aletheia(self) -> bool:
        try:
            subprocess.run([self.aletheia_cmd, "--help"], capture_output=True, check=True)
            return True
        except:
            return False

    def detect(self, image_path: str) -> Dict[str, Any]:
        if not self.enabled:
            return {"error": "Aletheia not installed", "has_hidden_data": None}

        # Run Aletheia's steganalysis (simplified LSB detection)
        cmd = [self.aletheia_cmd, "analyse", image_path, "--method", "lsb"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            output = result.stdout + result.stderr
            # Heuristic: look for positive detection strings
            has_data = any(keyword in output.lower() for keyword in 
                           ["hidden data", "secret message", "payload detected", "lsb embedding"])
            return {
                "has_hidden_data": has_data,
                "confidence": "High" if has_data else "Low",
                "analysis": output[:500],
                "method": "Aletheia LSB Analysis"
            }
        except Exception as e:
            return {"error": str(e), "has_hidden_data": None}

# ==================== FALLBACK HEURISTIC (if APIs unavailable) ====================
class FallbackDetector:
    """Simple heuristic for AI/stego detection when advanced tools are missing."""
    @staticmethod
    def detect_ai_heuristic(img: Image.Image) -> Dict:
        width, height = img.size
        exif_count = 0  # we won't have exif here, but method will be called with exif count
        # check common AI sizes
        ai_sizes = [(1024,1024), (1792,1024), (1024,1792), (512,512), (1152,896), (896,1152)]
        is_ai_size = (width, height) in ai_sizes
        return {
            "is_ai_generated": is_ai_size,
            "confidence": "Medium" if is_ai_size else "Low",
            "method": "Heuristic (size check)",
            "description": "Detected typical AI output dimensions" if is_ai_size else "No AI indicators"
        }

    @staticmethod
    def detect_stego_heuristic(image_path: str) -> Dict:
        # basic LSB extraction via PIL (very primitive)
        try:
            img = Image.open(image_path).convert("RGB")
            pixels = list(img.getdata())
            # Very naive: check if last bit of red channel is not random
            bits = [p[0] & 1 for p in pixels[:1000]]
            if len(set(bits)) < 2:
                return {"has_hidden_data": False, "confidence": "Low", "method": "Heuristic"}
            # if bits alternate too regularly, might indicate embedding
            changes = sum(1 for i in range(1, len(bits)) if bits[i] != bits[i-1])
            ratio = changes / len(bits)
            if ratio < 0.2 or ratio > 0.8:
                return {"has_hidden_data": True, "confidence": "Medium", "method": "Heuristic (LSB pattern)"}
            return {"has_hidden_data": False, "confidence": "Low", "method": "Heuristic"}
        except:
            return {"has_hidden_data": None, "error": "Heuristic failed"}

# ==================== MAIN ENHANCER CLASS ====================
class ForensicEnhancer:
    """
    Orchestrates AI and steganography detection.
    """
    def __init__(self, hive_api_key: str = None):
        self.ai_detector = HiveAIDetector(hive_api_key)
        self.stego_detector = SteganographyDetector()
        self.fallback_ai = FallbackDetector.detect_ai_heuristic
        self.fallback_stego = FallbackDetector.detect_stego_heuristic

    def analyze(self, image_path: str, img_pil: Image.Image = None, exif_data: dict = None) -> Dict:
        results = {
            "ai_generation_detection": {},
            "steganography_detection": {},
            "forensic_indicators": []
        }

        # ----- AI Detection -----
        if self.ai_detector.enabled:
            try:
                with open(image_path, "rb") as f:
                    img_bytes = f.read()
                ai_res = self.ai_detector.detect(img_bytes)
                results["ai_generation_detection"] = ai_res
                if ai_res.get("is_ai_generated"):
                    results["forensic_indicators"].append(f"🤖 AI GENERATED: {ai_res.get('ai_tool', 'Unknown')} (confidence {ai_res.get('confidence',0)})")
            except Exception as e:
                results["ai_generation_detection"] = {"error": str(e)}
        else:
            # use fallback heuristic
            if img_pil:
                fallback = FallbackDetector.detect_ai_heuristic(img_pil)
                results["ai_generation_detection"] = fallback
                if fallback.get("is_ai_generated"):
                    results["forensic_indicators"].append(f"⚠️ Possibly AI-generated ({fallback.get('method')})")
            else:
                results["ai_generation_detection"] = {"error": "No image object provided", "is_ai_generated": None}

        # ----- Steganography Detection -----
        if self.stego_detector.enabled:
            try:
                stego_res = self.stego_detector.detect(image_path)
                results["steganography_detection"] = stego_res
                if stego_res.get("has_hidden_data"):
                    results["forensic_indicators"].append(f"🕵️ STEGANOGRAPHY: Hidden data detected ({stego_res.get('method')})")
            except Exception as e:
                results["steganography_detection"] = {"error": str(e)}
        else:
            # fallback heuristic
            stego_heur = FallbackDetector.detect_stego_heuristic(image_path)
            results["steganography_detection"] = stego_heur
            if stego_heur.get("has_hidden_data"):
                results["forensic_indicators"].append(f"⚠️ Possible hidden data ({stego_heur.get('method')})")

        return results