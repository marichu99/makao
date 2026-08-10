import random
import string

from app.extensions import db
from app.models.mixins import BaseModel


def generate_building_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Building(BaseModel):
    __tablename__ = "buildings"

    landlord_id = db.Column(db.Integer, db.ForeignKey("landlords.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(150), nullable=False)  # estate/area
    building_code = db.Column(
        db.String(10), unique=True, nullable=False, default=generate_building_code
    )
    year_built = db.Column(db.Integer, nullable=True)
    total_floors = db.Column(db.Integer, nullable=True)
    common_area_sqft = db.Column(db.Float, nullable=True)
    rent_due_day = db.Column(db.Integer, nullable=False, default=5)  # day of month rent is due, all tenants

    landlord = db.relationship("Landlord", back_populates="buildings")
    unit_types = db.relationship("UnitType", back_populates="building", cascade="all, delete-orphan")
    units = db.relationship("Unit", back_populates="building", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", back_populates="building", cascade="all, delete-orphan")
    utility_bills = db.relationship("UtilityBill", back_populates="building", cascade="all, delete-orphan")
    caretaker_assignments = db.relationship(
        "CaretakerAssignment", back_populates="building", cascade="all, delete-orphan"
    )
