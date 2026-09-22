import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine
import models
from routers import auth, complaints, dashboard, gis, volunteers, public, admins

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title       = "CivicFix API",
    description = "Civic Issue Reporting & Resolution Platform",
    version     = "1.0.0",
)

# CORS — allow local development servers and production deployments
default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]
custom_origins = os.getenv("CORS_ORIGINS", "")
if custom_origins:
    origins = [orig.strip() for orig in custom_origins.split(",") if orig.strip()]
    for d in default_origins:
        if d not in origins:
            origins.append(d)
else:
    from config import FRONTEND_URL
    origins = list(default_origins)
    if FRONTEND_URL and FRONTEND_URL not in origins:
        origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = origins,
    allow_origin_regex= os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app|https://.*\.onrender\.com|https://.*\.netlify\.app"),
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# Serve uploaded images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(gis.router,        prefix="/api/wards",      tags=["GIS"])
app.include_router(volunteers.router, prefix="/api/volunteers", tags=["Volunteers"])
app.include_router(public.router,     prefix="/api/public",     tags=["Public"])
app.include_router(admins.router,     prefix="/api/admin",      tags=["Admin Management"])



@app.get("/")
def root():
    return {
        "message": "CivicFix API is running 🚀",
        "docs":    "/docs",
        "version": "1.0.0",
    }
