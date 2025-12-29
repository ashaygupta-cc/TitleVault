import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@postgres:5432/registry")
    WEB3_PROVIDER = os.getenv("WEB3_PROVIDER", "http://ganache:8545")
    REGISTRAR_PRIVATE_KEY = os.getenv("REGISTRAR_PRIVATE_KEY")
    REGISTRAR_ADDRESS = os.getenv("REGISTRAR_ADDRESS")
    CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
    IPFS_API = os.getenv("IPFS_API", "http://ipfs:5001")
    IPFS_LOCAL_CLI = os.getenv("IPFS_LOCAL_CLI", "true").lower() == "true"
    SECRET_KEY = os.getenv("SECRET_KEY", "change_this_in_prod")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_KEY")
    RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "600"))
    DEPLOYMENT_BLOCK = int(os.getenv("DEPLOYMENT_BLOCK"))
    ALCHEMY_HTTP = os.getenv("ALCHEMY_HTTP")
    REGISTRY_ROOT_CONTRACT = os.getenv("REGISTRY_ROOT_CONTRACT")
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL","http://127.0.0.1:8000")
    ETH_EXPLORER_BASE = os.getenv("ETH_EXPLORER_BASE")

settings = Settings()