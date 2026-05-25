from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


# Tao SQLAlchemy engine ket noi toi CSDL.
engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
# Tao session factory de thao tac DB theo request.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# Khai bao Base cho tat ca model ORM.
class Base(DeclarativeBase):
    pass


# Cap phat va dong DB session theo vong doi request.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
