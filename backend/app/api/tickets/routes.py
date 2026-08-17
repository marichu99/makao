from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import Building, CaretakerAssignment, Ticket, TicketComment, TicketPriority, TicketStatus, Unit, User, UserRole, Vendor
from app.schemas.operations import TicketCommentIn, TicketIn, TicketUpdateIn, VendorIn
from app.utils.email import send_email_async
from app.utils.welcome_email import maintenance_update_email
from app.utils.audit import audit
from app.utils.errors import ApiError, pydantic_error_response

tickets_bp = Blueprint("tickets", __name__)


def user():
    result = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not result:
        raise ApiError("User not found", 404)
    return result


def can_manage(actor, ticket):
    if actor.landlord_profile:
        return ticket.unit.building.landlord_id == actor.landlord_profile.id
    return CaretakerAssignment.query.filter_by(user_id=actor.id, building_id=ticket.unit.building_id).first() is not None


def serialize(ticket):
    return {"id": ticket.public_id, "title": ticket.title, "description": ticket.description,
            "status": ticket.status.value, "priority": ticket.priority.value, "photos": ticket.photos,
            "unit_number": ticket.unit.unit_number, "building_name": ticket.unit.building.name,
            "raised_by": ticket.raised_by.full_name, "vendor_id": ticket.vendor.public_id if ticket.vendor else None,
            "vendor_name": ticket.vendor.name if ticket.vendor else None, "estimated_cost": float(ticket.estimated_cost) if ticket.estimated_cost is not None else None,
            "actual_cost": float(ticket.actual_cost) if ticket.actual_cost is not None else None,
            "created_at": ticket.created_at.isoformat(), "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None}


def can_view(actor, ticket):
    if actor.role == UserRole.TENANT:
        return ticket.raised_by_id == actor.id or any(t.unit_id == ticket.unit_id for t in actor.tenancies)
    return can_manage(actor, ticket)


def serialize_comment(comment):
    return {"id": comment.public_id, "body": comment.body, "author_name": comment.author.full_name,
            "author_role": comment.author.role.value, "created_at": comment.created_at.isoformat()}


def notify_ticket_parties(ticket, event, message):
    recipients = {ticket.raised_by, ticket.unit.building.landlord.user if ticket.unit.building.landlord else None}
    for recipient in recipients:
        email = recipient.email if recipient else None
        if email:
            subject, html = maintenance_update_email(
                recipient.full_name,
                event=event,
                ticket_title=ticket.title,
                building_name=ticket.unit.building.name,
                unit_number=ticket.unit.unit_number,
                detail=message,
            )
            send_email_async(email, subject, html)


@tickets_bp.get("/")
@jwt_required()
def list_tickets():
    actor = user()
    query = Ticket.query.join(Unit).join(Building)
    if actor.role == UserRole.TENANT:
        query = query.filter(Ticket.raised_by_id == actor.id)
    elif actor.landlord_profile:
        query = query.filter(Building.landlord_id == actor.landlord_profile.id)
    elif actor.role == UserRole.CARETAKER:
        assigned_ids = [a.building_id for a in actor.caretaker_assignments]
        query = query.filter(Building.id.in_(assigned_ids))
    else:
        raise ApiError("You cannot view maintenance tickets", 403)
    return {"tickets": [serialize(t) for t in query.order_by(Ticket.created_at.desc()).all()]}


@tickets_bp.post("/")
@jwt_required()
def create_ticket():
    actor = user()
    try:
        payload = TicketIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    unit = Unit.query.filter_by(public_id=payload.unit_id).first()
    if not unit:
        raise ApiError("Unit not found", 404)
    if actor.role == UserRole.TENANT and not any(t.unit_id == unit.id and t.status.value == "active" for t in actor.tenancies):
        raise ApiError("You can only report maintenance for your own active unit", 403)
    ticket = Ticket(unit_id=unit.id, raised_by_id=actor.id, title=payload.title, description=payload.description,
                    priority=TicketPriority(payload.priority), photos=payload.photos)
    db.session.add(ticket)
    audit("ticket.created", ticket, unit_id=unit.public_id)
    db.session.commit()
    notify_ticket_parties(ticket, "New maintenance request", f"A maintenance request was submitted for {unit.building.name}, unit {unit.unit_number}.")
    return serialize(ticket), 201


@tickets_bp.patch("/<ticket_id>")
@jwt_required()
def update_ticket(ticket_id):
    actor = user()
    ticket = Ticket.query.filter_by(public_id=ticket_id).first()
    if not ticket or not can_manage(actor, ticket):
        raise ApiError("Ticket not found", 404)
    try:
        payload = TicketUpdateIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    if payload.vendor_id:
        vendor = Vendor.query.filter_by(public_id=payload.vendor_id, landlord_id=ticket.unit.building.landlord_id, active=True).first()
        if not vendor:
            raise ApiError("Vendor not found", 404)
        ticket.vendor_id = vendor.id
    for field in ("estimated_cost", "actual_cost"):
        value = getattr(payload, field)
        if value is not None:
            setattr(ticket, field, value)
    if payload.priority:
        ticket.priority = TicketPriority(payload.priority)
    if payload.status:
        ticket.status = TicketStatus(payload.status)
        ticket.resolved_at = datetime.utcnow() if payload.status == "resolved" else None
    audit("ticket.updated", ticket, status=ticket.status.value)
    db.session.commit()
    notify_ticket_parties(ticket, "Maintenance request updated", f"The maintenance request status is now {ticket.status.value.replace('_', ' ')}.")
    return serialize(ticket)


@tickets_bp.get("/<ticket_id>/comments")
@jwt_required()
def list_comments(ticket_id):
    actor = user()
    ticket = Ticket.query.filter_by(public_id=ticket_id).first()
    if not ticket or not can_view(actor, ticket):
        raise ApiError("Ticket not found", 404)
    return {"comments": [serialize_comment(comment) for comment in ticket.comments]}


@tickets_bp.post("/<ticket_id>/comments")
@jwt_required()
def add_comment(ticket_id):
    actor = user()
    ticket = Ticket.query.filter_by(public_id=ticket_id).first()
    if not ticket or not can_view(actor, ticket):
        raise ApiError("Ticket not found", 404)
    try:
        payload = TicketCommentIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    comment = TicketComment(ticket_id=ticket.id, author_id=actor.id, body=payload.body.strip())
    db.session.add(comment)
    audit("ticket.comment_added", comment, ticket_id=ticket.public_id)
    db.session.commit()
    notify_ticket_parties(ticket, "New maintenance update", f"{actor.full_name} added an update to a maintenance request.")
    return serialize_comment(comment), 201


@tickets_bp.get("/vendors")
@jwt_required()
def list_vendors():
    actor = user()
    if not actor.landlord_profile:
        raise ApiError("Only landlords can manage vendors", 403)
    return {"vendors": [{"id": v.public_id, "name": v.name, "trade": v.trade, "phone": v.phone, "email": v.email} for v in actor.landlord_profile.vendors if v.active]}


@tickets_bp.post("/vendors")
@jwt_required()
def create_vendor():
    actor = user()
    if not actor.landlord_profile:
        raise ApiError("Only landlords can manage vendors", 403)
    try:
        payload = VendorIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    vendor = Vendor(landlord_id=actor.landlord_profile.id, **payload.model_dump())
    db.session.add(vendor)
    audit("vendor.created", vendor)
    db.session.commit()
    return {"id": vendor.public_id, "name": vendor.name}, 201
