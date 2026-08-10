import enum

from app.extensions import db
from app.models.mixins import BaseModel


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class Ticket(BaseModel):
    __tablename__ = "tickets"

    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    raised_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    status = db.Column(db.Enum(TicketStatus), nullable=False, default=TicketStatus.OPEN)

    unit = db.relationship("Unit", back_populates="tickets")
    raised_by = db.relationship("User")
