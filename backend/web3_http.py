from web3 import Web3
from config import settings

w3 = Web3(Web3.HTTPProvider(settings.ALCHEMY_HTTP))

if not w3.is_connected():
    raise RuntimeError("❌ HTTP RPC not connected")

print("🌐 HTTP RPC connected")
