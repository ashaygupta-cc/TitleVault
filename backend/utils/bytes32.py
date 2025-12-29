# backend/utils/bytes32.py

def to_bytes32(hexstr: str) -> bytes:
    if not hexstr.startswith("0x"):
        hexstr = "0x" + hexstr

    raw = bytes.fromhex(hexstr[2:])
    if len(raw) > 32:
        raise ValueError("Hash exceeds 32 bytes")

    return raw.rjust(32, b"\x00")
