from eth_account.messages import encode_structured_data
from eth_account import Account
from config import settings


EIP712_DOMAIN = {
"name": "LandRegistry",
"version": "1",
"chainId": 1337,
"verifyingContract": settings.CONTRACT_ADDRESS or "0x0000000000000000000000000000000000000000"
}


PROPERTY_TYPES = {
"EIP712Domain": [
{"name":"name","type":"string"},
{"name":"version","type":"string"},
{"name":"chainId","type":"uint256"},
{"name":"verifyingContract","type":"address"}
],
"PropertyRecord": [
{"name":"recordHash","type":"bytes32"},
{"name":"cid","type":"string"},
{"name":"timestamp","type":"uint256"}
]
}




def recover_owner_from_signature(record_hash_hex: str, cid: str, timestamp: int, signature: str) -> str:
    data = {
    "domain": EIP712_DOMAIN,
    "message": {
    "recordHash": record_hash_hex,
    "cid": cid,
    "timestamp": timestamp
    },
    "primaryType": "PropertyRecord",
    "types": PROPERTY_TYPES
    }
encoded = encode_structured_data(data)
signer = Account.recover_message(encoded, signature=signature)
return signer