from app.extensions import db
from app.models.mixins import BaseModel


class UtilityBill(BaseModel):
    """A building's monthly water/electricity bill, pro-rated across units."""

    __tablename__ = "utility_bills"

    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    billing_month = db.Column(db.Date, nullable=False)  # first day of the billing month
    water_total = db.Column(db.Float, nullable=False, default=0)
    electricity_total = db.Column(db.Float, nullable=False, default=0)
    total_due = db.Column(db.Float, nullable=False)

    building = db.relationship("Building", back_populates="utility_bills")

    __table_args__ = (
        db.UniqueConstraint("building_id", "billing_month", name="uq_utility_bill_per_month"),
    )
