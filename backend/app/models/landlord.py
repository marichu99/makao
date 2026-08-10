from app.extensions import db
from app.models.mixins import BaseModel


class Landlord(BaseModel):
    __tablename__ = "landlords"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    id_number = db.Column(db.String(20), nullable=False)  # National ID, for KYC
    mpesa_paybill = db.Column(db.String(20), nullable=True)

    user = db.relationship("User", back_populates="landlord_profile")
    buildings = db.relationship("Building", back_populates="landlord", cascade="all, delete-orphan")
