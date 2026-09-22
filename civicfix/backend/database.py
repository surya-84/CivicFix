import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Support Render PostgreSQL (via DATABASE_URL) or default local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civicfix.db")

# Render provides PostgreSQL connection strings starting with postgres://,
# but SQLAlchemy 1.4+ requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True if not DATABASE_URL.startswith("sqlite") else False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
