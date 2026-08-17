import enum

from app.extensions import db
from app.models.mixins import BaseModel


class UnitStatus(str, enum.Enum):
    VACANT = "vacant"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


class UnitType(BaseModel):
    """Template for a class of unit within a building, e.g. '1-Bed'."""

    __tablename__ = "unit_types"

    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    name = db.Column(db.String(50), nullable=False)  # e.g. Bedsitter, 1-Bed, 2-Bed
    size_sqft = db.Column(db.Float, nullable=True)
    base_rent = db.Column(db.Float, nullable=False)
    rent_per_sqft = db.Column(db.Float, nullable=True)  # if set, overrides base_rent as size_sqft * rent_per_sqft
    max_occupants = db.Column(db.Integer, nullable=False, default=1)

    building = db.relationship("Building", back_populates="unit_types")
    units = db.relationship("Unit", back_populates="unit_type", order_by="Unit.id")

    @property
    def computed_rent(self) -> float:
        if self.rent_per_sqft and self.size_sqft:
            return round(self.size_sqft * self.rent_per_sqft, 2)
        return self.base_rent


class Unit(BaseModel):
    __tablename__ = "units"

    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    unit_type_id = db.Column(db.Integer, db.ForeignKey("unit_types.id"), nullable=False)
    unit_number = db.Column(db.String(20), nullable=False)  # e.g. A1, B12
    floor = db.Column(db.Integer, nullable=True)
    status = db.Column(db.Enum(UnitStatus), nullable=False, default=UnitStatus.VACANT)

    building = db.relationship("Building", back_populates="units")
    unit_type = db.relationship("UnitType", back_populates="units")
    tenancies = db.relationship("Tenancy", back_populates="unit", cascade="all, delete-orphan")
    tickets = db.relationship("Ticket", back_populates="unit", cascade="all, delete-orphan")
    expense_allocations = db.relationship("ExpenseAllocation", back_populates="unit")
    applications = db.relationship("Application", back_populates="unit", cascade="all, delete-orphan")
    complaints = db.relationship("Complaint", back_populates="unit", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("building_id", "unit_number", name="uq_unit_number_per_building"),
    )
