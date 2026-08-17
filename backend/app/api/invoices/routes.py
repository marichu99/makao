from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import BaseModel, Field, ValidationError

from app.extensions import db
from app.models import Building, Invoice, InvoiceStatus, Notice, NoticeType, Payment, PaymentMethod, Tenancy, User
from app.utils.email import send_email_async
from app.utils.audit import audit
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.invoicing import sync_overdue_status
from app.utils.welcome_email import tenant_notice_email

invoices_bp = Blueprint("invoices", __name__)


class RecordPaymentIn(BaseModel):
    amount: float = Field(gt=0)
    method: str
    reference: str = Field(min_length=3, max_length=100)
    paid_at: datetime | None = None


def landlord():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlords can manage collections", 403)
    return user


def owned_invoice(user, invoice_id):
    invoice = Invoice.query.filter_by(public_id=invoice_id).first()
    if not invoice or invoice.tenancy.unit.building.landlord_id != user.landlord_profile.id:
        raise ApiError("Invoice not found", 404)
    return invoice


def refresh_status(invoice):
    paid = sum(float(payment.amount) for payment in invoice.payments)
    if paid >= float(invoice.total_amount):
        invoice.status = InvoiceStatus.PAID
    elif paid > 0:
        invoice.status = InvoiceStatus.PARTIALLY_PAID
    else:
        sync_overdue_status(invoice)


def serialize(invoice):
    refresh_status(invoice)
    paid = sum(float(payment.amount) for payment in invoice.payments)
    return {"id": invoice.public_id, "tenant_name": invoice.tenancy.tenant.full_name,
            "unit_number": invoice.tenancy.unit.unit_number, "building_name": invoice.tenancy.unit.building.name,
            "period_start": invoice.period_start.isoformat(), "due_date": invoice.due_date.isoformat(),
            "rent_amount": float(invoice.rent_amount), "utility_amount": float(invoice.utility_amount),
            "other_charges": float(invoice.other_charges), "total_amount": float(invoice.total_amount),
            "paid_amount": paid, "balance": max(0, float(invoice.total_amount) - paid),
            "status": invoice.status.value,
            "payments": [{"id": p.public_id, "amount": float(p.amount), "method": p.method.value,
                          "reference": p.reference, "paid_at": p.paid_at.isoformat()} for p in invoice.payments]}


@invoices_bp.get("/arrears")
@jwt_required()
def arrears():
    user = landlord()
    rows = Invoice.query.join(Tenancy).join(Tenancy.unit).join(Building).filter(
        Building.landlord_id == user.landlord_profile.id,
        Invoice.status.in_([InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID]),
    ).order_by(Invoice.due_date).all()
    result = [serialize(row) for row in rows]
    db.session.commit()
    return {"arrears": result, "total": sum(row["balance"] for row in result)}


@invoices_bp.post("/<invoice_id>/send-reminder")
@jwt_required()
def send_reminder(invoice_id):
    user = landlord()
    invoice = owned_invoice(user, invoice_id)
    details = serialize(invoice)
    if details["balance"] <= 0:
        raise ApiError("This invoice has no outstanding balance", 409)
    tenant = invoice.tenancy.tenant
    message = (f"Your rent balance for {invoice.period_start.strftime('%B %Y')} is "
               f"KES {details['balance']:,.2f}. Please make payment as soon as possible.")
    notice = Notice(tenancy_id=invoice.tenancy_id, sent_by_id=user.id, notice_type=NoticeType.ARREARS,
                    subject="Outstanding rent reminder", message=message)
    db.session.add(notice)
    audit("invoice.reminder_sent", invoice, balance=details["balance"])
    db.session.commit()
    if tenant.email:
        subject, html = tenant_notice_email(
            tenant.full_name,
            subject=notice.subject,
            message=message,
            building_name=invoice.tenancy.unit.building.name,
            unit_number=invoice.tenancy.unit.unit_number,
        )
        send_email_async(tenant.email, subject, html)
    return {"sent": True, "delivery": "email" if tenant.email else "recorded_no_email"}


@invoices_bp.get("/")
@jwt_required()
def list_invoices():
    user = landlord()
    rows = Invoice.query.join(Tenancy).join(Tenancy.unit).join(Building).filter(Building.landlord_id == user.landlord_profile.id).order_by(Invoice.due_date.desc()).all()
    result = [serialize(row) for row in rows]
    db.session.commit()
    return {"invoices": result}


@invoices_bp.post("/<invoice_id>/payments")
@jwt_required()
def record_payment(invoice_id):
    user = landlord()
    invoice = owned_invoice(user, invoice_id)
    try:
        payload = RecordPaymentIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    try:
        method = PaymentMethod(payload.method)
    except ValueError:
        raise ApiError("Unsupported payment method", 422)
    if Payment.query.filter_by(reference=payload.reference).first():
        raise ApiError("That payment reference has already been reconciled", 409)
    balance = float(invoice.total_amount) - sum(float(p.amount) for p in invoice.payments)
    if payload.amount > balance + 0.001:
        raise ApiError("Payment exceeds the outstanding invoice balance", 422)
    payment = Payment(invoice_id=invoice.id, amount=payload.amount, method=method,
                      reference=payload.reference, paid_at=payload.paid_at or datetime.utcnow(), recorded_by_id=user.id)
    db.session.add(payment)
    db.session.flush()
    refresh_status(invoice)
    audit("payment.reconciled", payment, invoice_id=invoice.public_id, amount=payload.amount)
    db.session.commit()
    return serialize(invoice), 201
