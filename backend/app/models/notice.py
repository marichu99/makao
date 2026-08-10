import enum

from app.extensions import db
from app.models.mixins import BaseModel


class NoticeType(str, enum.Enum):
    REMINDER = "reminder"
    ARREARS = "arrears"
    GENERAL = "general"


class Notice(BaseModel):
    """A notice a landlord sends a tenant — a rent reminder, an arrears warning, or a
    general message. Kept for the landlord's record of what's been sent."""

    __tablename__ = "notices"

    tenancy_id = db.Column(db.Integer, db.ForeignKey("tenancies.id"), nullable=False)
    sent_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    notice_type = db.Column(db.Enum(NoticeType), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)

    tenancy = db.relationship("Tenancy", back_populates="notices")
    sent_by = db.relationship("User")
