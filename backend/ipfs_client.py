# backend/ipfs_client.py
import requests

IPFS_API = "http://127.0.0.1:5001/api/v0"
IPFS_GATEWAY = "http://127.0.0.1:8080/ipfs"


# ======================================================
# LEGACY JSON UPLOAD (kept for backward compatibility)
# ======================================================
def upload_json_to_ipfs(canonical_json: str) -> str:
    print("\n========== IPFS JSON UPLOAD START ==========")
    print("📄 JSON length:", len(canonical_json))
    print("🌐 IPFS API:", IPFS_API)

    try:
        res = requests.post(
            f"{IPFS_API}/add",
            files={
                "file": (
                    "record.json",
                    canonical_json.encode("utf-8"),
                    "application/json",
                )
            },
            params={"pin": "true"},
            timeout=30,
        )

        print("📡 IPFS response status:", res.status_code)
        res.raise_for_status()

        cid = res.json()["Hash"]

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
# ✅ CORRECT BYTE UPLOAD (USE THIS FOR NEW RECORDS)
# ======================================================
def upload_bytes_to_ipfs(data: bytes) -> str:
    print("\n========== IPFS BYTE UPLOAD START ==========")
    print("📄 Byte length:", len(data))
    print("🌐 IPFS API:", IPFS_API)

    try:
        res = requests.post(
            f"{IPFS_API}/add",
            files={
                "file": (
                    "record.bin",
                    data,
                    "application/octet-stream",
                )
            },
            params={"pin": "true"},
            timeout=30,
        )

        print("📡 IPFS response status:", res.status_code)
        res.raise_for_status()

        cid = res.json()["Hash"]

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
# FETCH (unchanged, works for both JSON & bytes)
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
