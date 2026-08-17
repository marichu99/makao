import enum

from app.extensions import db
from app.models.mixins import BaseModel


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EMERGENCY = "emergency"


class Ticket(BaseModel):
    __tablename__ = "tickets"

    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    raised_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    status = db.Column(db.Enum(TicketStatus), nullable=False, default=TicketStatus.OPEN)
    priority = db.Column(db.Enum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    photos = db.Column(db.JSON, nullable=False, default=list)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=True)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    estimated_cost = db.Column(db.Numeric(12, 2), nullable=True)
    actual_cost = db.Column(db.Numeric(12, 2), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    unit = db.relationship("Unit", back_populates="tickets")
    # Ticket has two User foreign keys (the reporter and the assignee), so both
    # relationships must name their FK explicitly to keep mapper configuration
    # deterministic.
    raised_by = db.relationship("User", foreign_keys=[raised_by_id])
    vendor = db.relationship("Vendor", back_populates="tickets")
    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    comments = db.relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketComment.created_at")
