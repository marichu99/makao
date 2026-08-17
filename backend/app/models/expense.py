import enum

from app.extensions import db
from app.models.mixins import BaseModel


class ExpenseType(str, enum.Enum):
    FIXED = "fixed"  # recurring, e.g. security, garbage
    VARIABLE = "variable"  # one-off, e.g. plumbing repair


class ExpenseLiability(str, enum.Enum):
    COMMON = "common"  # split across all tenants
    LANDLORD = "landlord"
    TENANT = "tenant"  # billed to a specific unit's tenant


class Expense(BaseModel):
    __tablename__ = "expenses"

    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=True)  # set when unit-specific
    category = db.Column(db.String(100), nullable=False)  # e.g. Security, Garbage, Plumbing
    amount = db.Column(db.Float, nullable=False)
    expense_type = db.Column(db.Enum(ExpenseType), nullable=False)
    liability = db.Column(db.Enum(ExpenseLiability), nullable=False, default=ExpenseLiability.COMMON)
    incurred_on = db.Column(db.Date, nullable=False)
    notes = db.Column(db.String(500), nullable=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=True)
    receipt_url = db.Column(db.String(1000), nullable=True)
    recurring = db.Column(db.Boolean, nullable=False, default=False)

    building = db.relationship("Building", back_populates="expenses")
    unit = db.relationship("Unit")
    allocations = db.relationship(
        "ExpenseAllocation", back_populates="expense", cascade="all, delete-orphan"
    )


class ExpenseAllocation(BaseModel):
    """How a COMMON expense is split across units (e.g. proportional to unit size)."""

    __tablename__ = "expense_allocations"

    expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id"), nullable=False)
    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    share_percentage = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)

    expense = db.relationship("Expense", back_populates="allocations")
    unit = db.relationship("Unit", back_populates="expense_allocations")
