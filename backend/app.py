from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

from routes.auth_routes import router as auth_router
from routes.activity_routes import router as activity_router
from routes.registry_routes import router as registry_router
from routes.health_routes import router as health_router
from routes.registry_merkle_routes import router as registry_merkle_router
from routes.subdivision_merkle_routes import router as subdivision_merkle_router
from routes.registry_affidavit_routes import router as registry_affidavit_router
from routes.subdivision_routes import router as subdivision_router
from routes.gis_audit_routes import router as gis_audit_router
from routes.map_routes import router as map_router
from routes.subdivision_replay_routes import router as subdivision_replay_router
from routes.gis_appendix_routes import router as gis_appendix_router

from routes.agreement_routes import router as agreement_router
from routes.agreement_affidavit_routes import router as agreement_affidavit_router
from routes.agreement_enforcement_routes import router as agreement_enforcement_router
from routes.agreement_verify_routes import router as agreement_verify_router
from routes.agreement_merkle_anchor_routes import router as agreement_merkle_anchor_router
from routes.agreement_merkle_routes import router as agreement_merkle_router

from routes.analytics_routes import router as analytics_router
from routes.building_routes import router as building_router
from routes.court_bundle_routes import router as court_bundle_router
from routes.court_verification_routes import router as court_verification_router
from routes.explorer_routes import router as explorer_router
from routes.heatmap_routes import router as heatmap_router
from routes.pdf_batch_routes import router as pdf_batch_router

from routes.flat_affidavit_routes import router as flat_affidavit_router
from routes.flat_routes import router as flat_router
from routes.flat_agreement_merkle_routes import router as flat_agreement_merkle_router
from routes.pdf_verification_routes import router as pdf_verification_router

from models import Base, engine
from indexer.registry_indexer import sync_from_chain
import asyncio
from indexer.live_registry_listener import listen_registry_events


app = FastAPI(
    title="Land Registry Backend",
    version="1.0.0",
)

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(
    status_code=429,
    content={"detail": "Too many requests. Please try again later."}
))

# CORS middleware - must be added FIRST before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://localhost:8000",
        "http://localhost:5173",  # Vite default dev server
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static assets (signature image, etc.) from backend/assets - AFTER CORS middleware
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Request logging middleware for debugging
@app.middleware("http")
async def log_request(request: Request, call_next):
    if request.method == "POST" and "registry/create" in request.url.path:
        try:
            body = await request.body()
            logging.warning(f"📋 POST {request.url.path}: {body.decode('utf-8')[:500]}")
        except:
            pass
    response = await call_next(request)
    return response

# --------------------------------------------------
# CORE ROUTES
# --------------------------------------------------
app.include_router(auth_router, tags=["Auth"])
app.include_router(activity_router, tags=["Activity"])
app.include_router(health_router, prefix="/health", tags=["System"])

# --------------------------------------------------
# REGISTRY
# --------------------------------------------------
app.include_router(registry_router, prefix="/registry", tags=["Registry"])
app.include_router(subdivision_router, prefix="/registry", tags=["Subdivision"])
app.include_router(registry_merkle_router, prefix="/registry/merkle", tags=["Registry Merkle"])
app.include_router(subdivision_merkle_router, prefix="/subdivision", tags=["Subdivision Merkle"])

app.include_router(registry_affidavit_router, prefix="/registry/affidavit", tags=["Registry Affidavit"])
app.include_router(gis_audit_router, prefix="/audit", tags=["GIS Audit"])
app.include_router(map_router, prefix="/map", tags=["Map"])
app.include_router(subdivision_replay_router, prefix="/verify", tags=["Subdivision Replay"])
app.include_router(gis_appendix_router, prefix="/appendix", tags=["Court GIS Appendix"])

# --------------------------------------------------
# AGREEMENT — ⚠️ ORDER IS CRITICAL
# --------------------------------------------------

# 🔹 MOST SPECIFIC FIRST
app.include_router(agreement_affidavit_router, prefix="/agreement/affidavit", tags=["Agreement Affidavit"])
app.include_router(agreement_merkle_anchor_router, prefix="/agreement/merkle", tags=["Agreement Merkle Anchor"])
app.include_router(agreement_merkle_router, prefix="/agreement/merkle", tags=["Agreement Merkle"])

# 🔹 LESS SPECIFIC AFTER
app.include_router(agreement_verify_router, prefix="/agreement", tags=["Agreement Verification"])
app.include_router(agreement_enforcement_router, prefix="/agreement", tags=["Agreement Enforcement"])

# 🔹 MOST GENERIC LAST (/{agreement_id})
app.include_router(agreement_router, prefix="/agreement", tags=["Agreement"])

# --------------------------------------------------
# ANALYTICS
# --------------------------------------------------
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(heatmap_router, prefix="/analytics/heatmap", tags=["Heatmaps"])

# --------------------------------------------------
# BUILDINGS & FLATS
# --------------------------------------------------
app.include_router(building_router, prefix="/building", tags=["Building Registry"])

app.include_router(flat_affidavit_router, prefix="/flat/affidavit", tags=["Flat Affidavit"])
app.include_router(flat_router, prefix="/flat", tags=["Flat Registry"])
app.include_router(flat_agreement_merkle_router, prefix="/flat/agreements/merkle", tags=["Flat Agreement Merkle"])

# --------------------------------------------------
# COURT & EXPORT
# --------------------------------------------------
app.include_router(court_bundle_router, prefix="/court/bundle", tags=["Court Bundle"])
app.include_router(court_verification_router, prefix="/court", tags=["Court Verification"])
app.include_router(pdf_batch_router, prefix="/pdf", tags=["PDF Export"])
app.include_router(pdf_verification_router, prefix="/verify/pdf", tags=["PDF Verification"])

# --------------------------------------------------
# EXPLORER
# --------------------------------------------------
app.include_router(explorer_router, prefix="/explorer", tags=["Public Explorer"])

# --------------------------------------------------
# STARTUP
# --------------------------------------------------
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
