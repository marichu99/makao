from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import Complaint, ComplaintStatus, Unit, User, UserRole
from app.schemas.complaint import ComplaintIn, ComplaintStatusIn
from app.utils.email import send_email_async
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.welcome_email import maintenance_update_email

complaints_bp = Blueprint("complaints", __name__)


def actor():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user:
        raise ApiError("User not found", 404)
    return user


def serialize(complaint):
    return {"id": complaint.public_id, "title": complaint.title, "description": complaint.description,
            "status": complaint.status.value, "unit_number": complaint.unit.unit_number,
            "building_name": complaint.unit.building.name, "raised_by": complaint.raised_by.full_name,
            "created_at": complaint.created_at.isoformat()}


def notify(complaint):
    people = {complaint.raised_by, complaint.unit.building.landlord.user}
    for person in people:
        if person and person.email:
            subject, html = maintenance_update_email(person.full_name, event="New complaint received",
                ticket_title=complaint.title, building_name=complaint.unit.building.name,
                unit_number=complaint.unit.unit_number,
                detail="A complaint has been lodged and is ready for review in Nyumba.")
            send_email_async(person.email, subject, html)


@complaints_bp.get("/")
@jwt_required()
def list_complaints():
    user = actor()
    if user.role == UserRole.TENANT:
        rows = Complaint.query.filter_by(raised_by_id=user.id).order_by(Complaint.created_at.desc()).all()
    elif user.landlord_profile:
        rows = Complaint.query.join(Unit).filter(Unit.building.has(landlord_id=user.landlord_profile.id)).order_by(Complaint.created_at.desc()).all()
    else:
        raise ApiError("You cannot view complaints", 403)
    return {"complaints": [serialize(row) for row in rows]}


@complaints_bp.post("/")
@jwt_required()
def create_complaint():
    user = actor()
    if user.role != UserRole.TENANT:
        raise ApiError("Only tenants can lodge complaints", 403)
    try:
        payload = ComplaintIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    unit = Unit.query.filter_by(public_id=payload.unit_id).first()
    if not unit or not any(t.unit_id == unit.id and t.status.value == "active" for t in user.tenancies):
        raise ApiError("You can only complain about your active unit", 403)
    complaint = Complaint(unit_id=unit.id, raised_by_id=user.id, title=payload.title, description=payload.description)
    db.session.add(complaint); db.session.commit(); notify(complaint)
    return serialize(complaint), 201


@complaints_bp.patch("/<complaint_id>")
@jwt_required()
def update_complaint(complaint_id):
    user = actor(); complaint = Complaint.query.filter_by(public_id=complaint_id).first()
    if not complaint or not user.landlord_profile or complaint.unit.building.landlord_id != user.landlord_profile.id:
        raise ApiError("Complaint not found", 404)
    try:
        payload = ComplaintStatusIn.model_validate(request.get_json(silent=True) or {})
        complaint.status = ComplaintStatus(payload.status)
    except (ValidationError, ValueError) as exc:
        if isinstance(exc, ValidationError): return pydantic_error_response(exc), 422
        raise ApiError("Invalid complaint status", 422)
    db.session.commit(); notify(complaint)
    return serialize(complaint)
