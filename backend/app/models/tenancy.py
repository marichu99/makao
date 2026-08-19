import enum

from app.extensions import db
from app.models.mixins import BaseModel


class TenancyStatus(str, enum.Enum):
    PENDING = "pending"  # onboarding: awaiting payment of the landlord-set initial rent
    ACTIVE = "active"
    NOTICE_GIVEN = "notice_given"
    ENDED = "ended"


class Tenancy(BaseModel):
    """Links a tenant (User) to a unit for a period of time."""

    __tablename__ = "tenancies"

    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    move_in_date = db.Column(db.Date, nullable=False)
    move_out_date = db.Column(db.Date, nullable=True)
    notice_date = db.Column(db.Date, nullable=True)  # date tenant/landlord gave notice
    monthly_rent = db.Column(db.Float, nullable=False)  # snapshot at move-in
    deposit_amount = db.Column(db.Float, nullable=False)  # typically 1 month rent
    deposit_refunded = db.Column(db.Float, nullable=True)
    status = db.Column(db.Enum(TenancyStatus), nullable=False, default=TenancyStatus.ACTIVE)

    unit = db.relationship("Unit", back_populates="tenancies")
    tenant = db.relationship("User", back_populates="tenancies")
    invoices = db.relationship("Invoice", back_populates="tenancy", cascade="all, delete-orphan")
    deposit_payments = db.relationship("DepositPayment", back_populates="tenancy", cascade="all, delete-orphan")
    notices = db.relationship("Notice", back_populates="tenancy", cascade="all, delete-orphan")
    inspections = db.relationship("Inspection", back_populates="tenancy", cascade="all, delete-orphan")
    documents = db.relationship("Document", back_populates="tenancy", cascade="all, delete-orphan")


class CaretakerAssignment(BaseModel):
    """Assigns a caretaker (User) to manage a specific building."""

    __tablename__ = "caretaker_assignments"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)

    user = db.relationship("User", back_populates="caretaker_assignments")
    building = db.relationship("Building", back_populates="caretaker_assignments")

    __table_args__ = (
        db.UniqueConstraint("user_id", "building_id", name="uq_caretaker_per_building"),
    )
