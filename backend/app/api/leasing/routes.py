from datetime import datetime, timedelta

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import (Application, ApplicationStatus, Building, DepositPayment, Document, Inspection, Invoice,
                        InvoiceStatus, PaymentMethod, Tenancy, TenancyStatus, Unit, UnitStatus, User, UserRole)
from app.schemas.operations import ApplicationIn, ApproveApplicationIn, DepositPaymentIn, DocumentIn, InspectionIn, MoveOutIn
from app.utils.audit import audit
from app.utils.email import send_email_async
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.invoicing import next_due_date
from app.utils.welcome_email import application_approved_email, application_rejected_email

leasing_bp = Blueprint("leasing", __name__)


def current_user():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user:
        raise ApiError("User not found", 404)
    return user


def owned_tenancy(user, tenancy_id):
    tenancy = Tenancy.query.filter_by(public_id=tenancy_id).first()
    if not tenancy or tenancy.unit.building.landlord.user_id != user.id:
        raise ApiError("Tenancy not found", 404)
    return tenancy


def serialize_application(application):
    return {
        "id": application.public_id, "status": application.status.value,
        "unit_id": application.unit.public_id, "unit_number": application.unit.unit_number,
        "building_name": application.unit.building.name,
        "applicant_name": application.applicant.full_name, "applicant_phone": application.applicant.phone,
        "proposed_move_in_date": application.proposed_move_in_date.isoformat(),
        "household_size": application.household_size, "notes": application.notes,
        "unit_rent": application.unit.unit_type.computed_rent,
        "created_at": application.created_at.isoformat(),
    }


@leasing_bp.post("/applications")
@jwt_required()
def submit_application():
    user = current_user()
    if user.role != UserRole.TENANT:
        raise ApiError("Only tenant accounts can apply for a unit", 403)
    try:
        payload = ApplicationIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    unit = Unit.query.filter_by(public_id=payload.unit_id, status=UnitStatus.VACANT).first()
    if not unit:
        raise ApiError("That unit is no longer available", 409)
    duplicate = Application.query.filter_by(unit_id=unit.id, applicant_id=user.id, status=ApplicationStatus.SUBMITTED).first()
    if duplicate:
        raise ApiError("You already have an application awaiting review for this unit", 409)
    application = Application(unit_id=unit.id, applicant_id=user.id, **payload.model_dump(exclude={"unit_id"}))
    db.session.add(application)
    audit("application.submitted", application, unit_id=unit.public_id)
    db.session.commit()
    return serialize_application(application), 201


@leasing_bp.get("/applications")
@jwt_required()
def list_applications():
    user = current_user()
    if user.role == UserRole.TENANT:
        applications = Application.query.filter_by(applicant_id=user.id).order_by(Application.created_at.desc()).all()
    elif user.landlord_profile:
        applications = Application.query.join(Unit).join(Building).filter(Building.landlord_id == user.landlord_profile.id).order_by(Application.created_at.desc()).all()
    else:
        raise ApiError("Only tenants and landlords can access applications", 403)
    return {"applications": [serialize_application(a) for a in applications]}


@leasing_bp.post("/applications/<application_id>/approve")
@jwt_required()
def approve_application(application_id):
    user = current_user()
    if not user.landlord_profile:
        raise ApiError("Only landlords can approve applications", 403)
    application = Application.query.filter_by(public_id=application_id).first()
    if not application or application.unit.building.landlord_id != user.landlord_profile.id:
        raise ApiError("Application not found", 404)
    if application.status != ApplicationStatus.SUBMITTED or application.unit.status != UnitStatus.VACANT:
        raise ApiError("This application can no longer be approved", 409)
    try:
        payload = ApproveApplicationIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    computed_rent = application.unit.unit_type.computed_rent
    move_in_date = application.proposed_move_in_date
    building = application.unit.building
    due = next_due_date(building, move_in_date)
    # A move-in that doesn't leave a full month before the building's next rent due
    # date (true for almost every move-in unless it happens to land exactly on the
    # due day) starts the tenancy as PENDING with a landlord-set initial rent for
    # that partial first period, instead of an auto-generated full-month invoice.
    starts_pending = (due - move_in_date).days < 30

    tenancy = Tenancy(unit_id=application.unit_id, tenant_id=application.applicant_id,
                      move_in_date=move_in_date, monthly_rent=computed_rent, deposit_amount=computed_rent,
                      status=TenancyStatus.PENDING if starts_pending else TenancyStatus.ACTIVE)
    application.status, application.reviewed_by_id, application.reviewed_at = ApplicationStatus.APPROVED, user.id, datetime.utcnow()
    application.unit.status = UnitStatus.OCCUPIED
    Application.query.filter(Application.unit_id == application.unit_id, Application.id != application.id,
                             Application.status == ApplicationStatus.SUBMITTED).update({"status": ApplicationStatus.REJECTED})
    db.session.add(tenancy)
    db.session.flush()

    if starts_pending:
        initial_amount = payload.initial_rent or computed_rent
        db.session.add(Invoice(
            tenancy_id=tenancy.id, period_start=move_in_date, period_end=max(move_in_date, due - timedelta(days=1)),
            rent_amount=initial_amount, total_amount=initial_amount, due_date=due,
            status=InvoiceStatus.PENDING, is_initial=True,
        ))

    audit("application.approved", application, tenancy_pending=True)
    db.session.commit()
    if application.applicant.email:
        subject, html = application_approved_email(
            application.applicant.full_name,
            building_name=application.unit.building.name,
            unit_number=application.unit.unit_number,
            move_in_date=application.proposed_move_in_date.strftime("%d %b %Y"),
        )
        send_email_async(application.applicant.email, subject, html)
    return {"application": serialize_application(application), "tenancy_id": tenancy.public_id}, 201


@leasing_bp.post("/applications/<application_id>/reject")
@jwt_required()
def reject_application(application_id):
    user = current_user()
    application = Application.query.filter_by(public_id=application_id).first()
    if not user.landlord_profile or not application or application.unit.building.landlord_id != user.landlord_profile.id:
        raise ApiError("Application not found", 404)
    if application.status != ApplicationStatus.SUBMITTED:
        raise ApiError("Only submitted applications may be rejected", 409)
    application.status, application.reviewed_by_id, application.reviewed_at = ApplicationStatus.REJECTED, user.id, datetime.utcnow()
    audit("application.rejected", application)
    db.session.commit()
    if application.applicant.email:
        subject, html = application_rejected_email(
            application.applicant.full_name,
            building_name=application.unit.building.name,
            unit_number=application.unit.unit_number,
        )
        send_email_async(application.applicant.email, subject, html)
    return serialize_application(application)


@leasing_bp.post("/tenancies/<tenancy_id>/inspections")
@jwt_required()
def create_inspection(tenancy_id):
    user = current_user()
    tenancy = owned_tenancy(user, tenancy_id)
    try:
        payload = InspectionIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    inspection = Inspection(tenancy_id=tenancy.id, created_by_id=user.id, **payload.model_dump())
    db.session.add(inspection)
    audit("inspection.created", inspection, tenancy_id=tenancy.public_id)
    db.session.commit()
    return {"id": inspection.public_id}, 201


@leasing_bp.post("/tenancies/<tenancy_id>/documents")
@jwt_required()
def add_document(tenancy_id):
    user = current_user()
    tenancy = owned_tenancy(user, tenancy_id)
    try:
        payload = DocumentIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    document = Document(tenancy_id=tenancy.id, uploaded_by_id=user.id,
                        name=payload.name, document_type=payload.document_type, url=payload.url)
    db.session.add(document)
    audit("document.added", document, tenancy_id=tenancy.public_id)
    db.session.commit()
    return {"id": document.public_id}, 201


@leasing_bp.post("/tenancies/<tenancy_id>/move-out")
@jwt_required()
def move_out(tenancy_id):
    user = current_user()
    tenancy = owned_tenancy(user, tenancy_id)
    try:
        payload = MoveOutIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    if tenancy.status == TenancyStatus.ENDED:
        raise ApiError("This tenancy has already ended", 409)
    if payload.deposit_refunded > tenancy.deposit_amount:
        raise ApiError("Deposit refund cannot exceed the held deposit", 422)
    tenancy.status, tenancy.move_out_date, tenancy.deposit_refunded = TenancyStatus.ENDED, payload.move_out_date, payload.deposit_refunded
    tenancy.unit.status = UnitStatus.VACANT
    audit("tenancy.moved_out", tenancy, deposit_refunded=payload.deposit_refunded, notes=payload.notes)
    db.session.commit()
    return {"id": tenancy.public_id, "status": tenancy.status.value, "unit_status": tenancy.unit.status.value}


def serialize_deposit_payment(payment):
    return {"id": payment.public_id, "amount": payment.amount, "method": payment.method.value,
            "reference": payment.reference, "paid_at": payment.paid_at.isoformat(),
            "recorded_by": payment.recorded_by.full_name if payment.recorded_by else None}


@leasing_bp.get("/tenancies/<tenancy_id>/deposit-payments")
@jwt_required()
def list_deposit_payments(tenancy_id):
    user = current_user()
    tenancy = owned_tenancy(user, tenancy_id)
    paid = sum(p.amount for p in tenancy.deposit_payments)
    return {
        "deposit_payments": [serialize_deposit_payment(p) for p in tenancy.deposit_payments],
        "deposit_amount": tenancy.deposit_amount,
        "deposit_paid": paid,
        "deposit_balance": max(0, tenancy.deposit_amount - paid),
    }


@leasing_bp.post("/tenancies/<tenancy_id>/deposit-payments")
@jwt_required()
def record_deposit_payment(tenancy_id):
    user = current_user()
    tenancy = owned_tenancy(user, tenancy_id)
    try:
        payload = DepositPaymentIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    paid = sum(p.amount for p in tenancy.deposit_payments)
    if payload.amount > tenancy.deposit_amount - paid + 0.001:
        raise ApiError("Payment exceeds the outstanding deposit balance", 422)
    payment = DepositPayment(
        tenancy_id=tenancy.id, amount=payload.amount, method=PaymentMethod(payload.method),
        reference=payload.reference, paid_at=payload.paid_at or datetime.utcnow(), recorded_by_id=user.id,
    )
    db.session.add(payment)
    audit("deposit_payment.recorded", payment, tenancy_id=tenancy.public_id, amount=payload.amount)
    db.session.commit()
    return serialize_deposit_payment(payment), 201
