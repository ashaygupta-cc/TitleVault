# backend/ipfs_client.py
import os
import requests

# ======================================================
# CONFIG
# ======================================================
IPFS_PROVIDER = os.getenv("IPFS_PROVIDER", "pinata")

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")

PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs"


# ======================================================
# LEGACY JSON UPLOAD (kept for compatibility)
# ======================================================
def upload_json_to_ipfs(canonical_json: dict) -> str:
    print("\n========== IPFS JSON UPLOAD START ==========")
    print("📄 JSON keys:", list(canonical_json.keys()))
    print("🌐 Provider:", IPFS_PROVIDER)

    if IPFS_PROVIDER != "pinata":
        raise RuntimeError("Unsupported IPFS provider")

    try:
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
            "Content-Type": "application/json",
        }

        res = requests.post(
            PINATA_JSON_URL,
            json=canonical_json,
            headers=headers,
            timeout=60,
        )

        print("📡 Pinata response status:", res.status_code)
        res.raise_for_status()

        cid = res.json()["IpfsHash"]

        print("✅ IPFS JSON upload successful")
        print("📦 Returned CID:", cid)
        print("===========================================\n")

        return cid

    except Exception as e:
        print("❌ IPFS JSON upload FAILED")
        print("🔥 Error:", e)
        print("===========================================\n")
        raise


# ======================================================
# BYTE UPLOAD (PDF / BINARY)
# ======================================================
def upload_bytes_to_ipfs(data: bytes, filename: str = "record.bin") -> str:
    print("\n========== IPFS BYTE UPLOAD START ==========")
    print("📄 Byte length:", len(data))
    print("📁 Filename:", filename)
    print("🌐 Provider:", IPFS_PROVIDER)

    if IPFS_PROVIDER != "pinata":
        raise RuntimeError("Unsupported IPFS provider")

    try:
        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
        }

        files = {
            "file": (filename, data),
        }

        res = requests.post(
            PINATA_FILE_URL,
            files=files,
            headers=headers,
            timeout=60,
        )

        print("📡 Pinata response status:", res.status_code)
        res.raise_for_status()

        cid = res.json()["IpfsHash"]

        print("✅ IPFS byte upload successful")
        print("📦 Returned CID:", cid)
        print("===========================================\n")

        return cid

    except Exception as e:
        print("❌ IPFS byte upload FAILED")
        print("🔥 Error:", e)
        print("===========================================\n")
        raise


# ======================================================
# FETCH (PRINTS KEPT — PINATA GATEWAY)
# ======================================================
def fetch_raw_from_ipfs(cid: str) -> str:
    print("\n========== IPFS FETCH START ==========")
    print("📦 CID:", cid)

    url = f"{IPFS_GATEWAY}/{cid}"
    print("🌐 Fetch URL:", url)

    try:
        res = requests.get(url, timeout=20)

        print("📡 Gateway response status:", res.status_code)
        res.raise_for_status()

        content = res.text.strip()

        print("✅ IPFS fetch successful")
        print("📄 Content length:", len(content))
        print("=====================================\n")

        return content

    except Exception as e:
        print("❌ IPFS fetch FAILED")
        print("🔥 Error:", e)
        print("=====================================\n")
        raise
