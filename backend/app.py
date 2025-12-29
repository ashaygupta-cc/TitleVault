from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.registry_routes import router as registry_router
from routes.health_routes import router as health_router
from routes.merkle_routes import router as merkle_router
from routes.affidavit_routes import router as affidavit_router
from routes.subdivision_routes import router as subdivision_router

from models import Base, engine
from indexer.registry_indexer import sync_from_chain   
import asyncio
from indexer.live_registry_listener import listen_registry_events


app = FastAPI(
    title="Land Registry Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(registry_router, prefix="/registry", tags=["Registry"])
app.include_router(subdivision_router)
app.include_router(merkle_router, prefix="/merkle", tags=["Merkle"])
app.include_router(affidavit_router, prefix="/affidavit", tags=["Affidavit"])
app.include_router(health_router, prefix="/health", tags=["System"])

@app.on_event("startup")
async def startup():
    print("🔄 Syncing database from blockchain events...")
    # sync_from_chain()
    print("✅ Blockchain → DB sync complete")

    print("📡 Starting live registry listener...")
    asyncio.create_task(listen_registry_events())


@app.get("/")
def root():
    return {"message": "Land Registry Backend API Running 🚀"}
