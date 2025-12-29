from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.registry_routes import router as registry_router
from routes.health_routes import router as health_router

from models import Base, engine


# ------------------------------------
# Create tables if missing (optional)
# ------------------------------------
# Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Land Registry Backend",
    version="1.0.0",
)


# ------------------------------------
# CORS (Allow frontend)
# ------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # change later in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------
# ROUTES
# ------------------------------------
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(registry_router, prefix="/registry", tags=["Registry"])
app.include_router(health_router, prefix="/health", tags=["System"])


@app.get("/")
def root():
    return {"message": "Land Registry Backend API Running 🚀"}
