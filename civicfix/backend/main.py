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

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
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
