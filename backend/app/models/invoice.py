import enum

from app.extensions import db
from app.models.mixins import BaseModel


class InvoiceStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"


class PaymentMethod(str, enum.Enum):
    MPESA = "mpesa"
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"


class Invoice(BaseModel):
    __tablename__ = "invoices"

    tenancy_id = db.Column(db.Integer, db.ForeignKey("tenancies.id"), nullable=False)
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    rent_amount = db.Column(db.Float, nullable=False)
    utility_amount = db.Column(db.Float, nullable=False, default=0)
    other_charges = db.Column(db.Float, nullable=False, default=0)
    total_amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.PENDING)

    tenancy = db.relationship("Tenancy", back_populates="invoices")
    payments = db.relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class Payment(BaseModel):
    __tablename__ = "payments"

    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.Enum(PaymentMethod), nullable=False)
    reference = db.Column(db.String(100), nullable=True)  # M-Pesa code or receipt no.
    paid_at = db.Column(db.DateTime, nullable=False)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)  # caretaker who logged cash
    receipt_path = db.Column(db.String(500), nullable=True)  # storage key for the generated PDF receipt

    invoice = db.relationship("Invoice", back_populates="payments")
    recorded_by = db.relationship("User")
