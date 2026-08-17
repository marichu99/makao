import enum

from app.extensions import db
from app.models.mixins import BaseModel


class ApplicationStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(BaseModel):
    __tablename__ = "applications"

    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"), nullable=False)
    applicant_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.SUBMITTED)
    proposed_move_in_date = db.Column(db.Date, nullable=False)
    household_size = db.Column(db.Integer, nullable=False, default=1)
    employment_details = db.Column(db.String(500), nullable=True)
    notes = db.Column(db.String(1000), nullable=True)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    unit = db.relationship("Unit", back_populates="applications")
    applicant = db.relationship("User", foreign_keys=[applicant_id], back_populates="applications")
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])


class InspectionType(str, enum.Enum):
    MOVE_IN = "move_in"
    MOVE_OUT = "move_out"
    ROUTINE = "routine"


class Inspection(BaseModel):
    __tablename__ = "inspections"

    tenancy_id = db.Column(db.Integer, db.ForeignKey("tenancies.id"), nullable=False)
    inspection_type = db.Column(db.Enum(InspectionType), nullable=False)
    inspected_on = db.Column(db.Date, nullable=False)
    condition_notes = db.Column(db.Text, nullable=True)
    photos = db.Column(db.JSON, nullable=False, default=list)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    tenancy = db.relationship("Tenancy", back_populates="inspections")
    created_by = db.relationship("User")


class Document(BaseModel):
    __tablename__ = "documents"

    tenancy_id = db.Column(db.Integer, db.ForeignKey("tenancies.id"), nullable=True)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)
    url = db.Column(db.String(1000), nullable=False)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    tenancy = db.relationship("Tenancy", back_populates="documents")
    building = db.relationship("Building", back_populates="documents")
    uploaded_by = db.relationship("User")


class Vendor(BaseModel):
    __tablename__ = "vendors"

    landlord_id = db.Column(db.Integer, db.ForeignKey("landlords.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    trade = db.Column(db.String(100), nullable=True)
    active = db.Column(db.Boolean, nullable=False, default=True)

    landlord = db.relationship("Landlord", back_populates="vendors")
    tickets = db.relationship("Ticket", back_populates="vendor")


class AuditEvent(BaseModel):
    __tablename__ = "audit_events"

    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_public_id = db.Column(db.String(36), nullable=False)
    metadata_json = db.Column(db.JSON, nullable=False, default=dict)

    actor = db.relationship("User")


class TicketComment(BaseModel):
    __tablename__ = "ticket_comments"

    ticket_id = db.Column(db.Integer, db.ForeignKey("tickets.id"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.String(2000), nullable=False)

    ticket = db.relationship("Ticket", back_populates="comments")
    author = db.relationship("User")
