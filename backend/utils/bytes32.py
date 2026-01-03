# backend/utils/bytes32.py

from fastapi import HTTPException

def parse_bytes32(value: str) -> bytes:
    """
    Strict parser for externally supplied hashes (API layer).
    - Accepts 0x-prefixed or raw hex
    - Must be exactly 32 bytes
    - Raises HTTP 400 (not 500)
    """

    print(f"[DEBUG] parse_bytes32 input: '{value}' (len={len(value)})")
    if value.startswith("0x"):
        value = value[2:]
    print(f"[DEBUG] parse_bytes32 after strip: '{value}' (len={len(value)})")

    # 64 hex chars = 32 bytes
    if len(value) != 64:
        print("[DEBUG] parse_bytes32 length check failed")
        raise HTTPException(
            status_code=400,
            detail="Invalid record_hash: must be 32-byte hex string"
        )

    try:
        raw = bytes.fromhex(value)
    except ValueError:
        print("[DEBUG] parse_bytes32 non-hex error")
        raise HTTPException(
            status_code=400,
            detail="Invalid record_hash: non-hex characters"
        )

    return raw


def to_bytes32(hexstr: str) -> bytes:
    """
    ABI helper ONLY:
    - Pads to 32 bytes
    - Used ONLY for contract calls
    """
    if not hexstr.startswith("0x"):
        hexstr = "0x" + hexstr

    raw = bytes.fromhex(hexstr[2:])
    if len(raw) > 32:
        raise ValueError("Hash exceeds 32 bytes")

    return raw.rjust(32, b"\x00")
