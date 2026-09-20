"""
CivicFix - Backend Configuration
Loads secrets and OAuth configurations from environment variables.
"""

import os
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Application environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Secret Key for CivicFix JWT tokens
SECRET_KEY = os.getenv("SECRET_KEY", "civicfix-secret-2024-srm")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_CALLBACK_URL = os.getenv("GOOGLE_CALLBACK_URL", "http://localhost:8000/api/auth/google/callback").strip()

# Frontend Base URL (for browser redirects)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()

# Check if Google OAuth is fully configured
GOOGLE_OAUTH_CONFIGURED = bool(
    GOOGLE_CLIENT_ID and 
    GOOGLE_CLIENT_SECRET and 
    not GOOGLE_CLIENT_ID.startswith("your_") and
    not GOOGLE_CLIENT_SECRET.startswith("your_")
)
