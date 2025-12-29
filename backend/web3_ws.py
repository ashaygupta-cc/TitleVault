from web3 import Web3
from config import settings

w3_ws = Web3(Web3.WebsocketProvider(settings.ALCHEMY_WS))

if not w3_ws.is_connected():
    raise RuntimeError("❌ WebSocket not connected")

print("🔗 WebSocket connected")
