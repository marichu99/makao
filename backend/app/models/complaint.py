import enum

from app.extensions import db
from app.models.mixins import BaseModel


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"


class Complaint(BaseModel):
    __tablename__ = "complaints"

    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    raised_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(2000), nullable=False)
    status = db.Column(db.Enum(ComplaintStatus), nullable=False, default=ComplaintStatus.OPEN)

    unit = db.relationship("Unit", back_populates="complaints")
    raised_by = db.relationship("User", foreign_keys=[raised_by_id])
