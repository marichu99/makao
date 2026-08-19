from app.extensions import db
from app.models.invoice import PaymentMethod
from app.models.mixins import BaseModel


class DepositPayment(BaseModel):
    """A payment against a tenancy's security deposit — kept entirely separate from
    Invoice/Payment (rent), since a deposit isn't billed on a recurring cycle."""

    __tablename__ = "deposit_payments"

    tenancy_id = db.Column(db.Integer, db.ForeignKey("tenancies.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.Enum(PaymentMethod), nullable=False)
    reference = db.Column(db.String(100), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=False)
    recorded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    tenancy = db.relationship("Tenancy", back_populates="deposit_payments")
    recorded_by = db.relationship("User")
