from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class IR(Base):
    __tablename__ = "irs"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    description = Column(String)
    tags        = Column(String)           # comma-separated: "marshall,v30,sm57"
    file_url    = Column(String, nullable=False)
    file_name   = Column(String, nullable=False)
    file_size   = Column(Integer)
    duration    = Column(Float)            # seconds
    sample_rate = Column(Integer)
    author_id   = Column(Integer, ForeignKey("users.id"))
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    downloads   = Column(Integer, default=0)

    author    = relationship("User", back_populates="irs")
    favorites = relationship("Favorite", back_populates="ir")