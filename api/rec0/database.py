import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rec0.db")

# PostgreSQL needs pool_pre_ping to handle dropped connections
_is_postgres = DATABASE_URL.startswith("postgresql") or DATABASE_URL.startswith("postgres")
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=_is_postgres,
    **({"connect_args": {"check_same_thread": False}} if not _is_postgres else {}),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
