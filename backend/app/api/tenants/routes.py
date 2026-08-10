import secrets
from datetime import date, datetime

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import (
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    Tenancy,
    TenancyStatus,
    Unit,
    UnitStatus,
    User,
    UserRole,
)
from app.schemas.tenant import LinkUnitIn, PayInvoiceIn, UpdateMoveInDateIn
from app.utils.email import send_email_async
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.invoicing import ensure_current_month_invoice
from app.utils.receipt_pdf import generate_rent_receipt_pdf
from app.utils.welcome_email import rent_receipt_email

tenants_bp = Blueprint("tenants", __name__)


def _current_tenant() -> User:
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or user.role != UserRole.TENANT:
        raise ApiError("Only tenant accounts can manage tenancies", 403)
    return user


def _own_tenancy(tenant: User, tenancy_id: str) -> Tenancy:
    tenancy = Tenancy.query.filter_by(public_id=tenancy_id).first()
    if not tenancy or tenancy.tenant_id != tenant.id:
        raise ApiError("Tenancy not found", 404)
    return tenancy


def _own_invoice(tenant: User, invoice_id: str) -> Invoice:
    invoice = Invoice.query.filter_by(public_id=invoice_id).first()
    if not invoice or invoice.tenancy.tenant_id != tenant.id:
        raise ApiError("Invoice not found", 404)
    return invoice


def _serialize_invoice(invoice: Invoice) -> dict:
    tenancy = invoice.tenancy
    last_payment = invoice.payments[-1] if invoice.payments else None
    return {
        "id": invoice.public_id,
        "unit_number": tenancy.unit.unit_number,
        "building_name": tenancy.unit.building.name,
        "period_start": invoice.period_start.isoformat(),
        "period_end": invoice.period_end.isoformat(),
        "period_label": invoice.period_start.strftime("%B %Y"),
        "due_date": invoice.due_date.isoformat(),
        "total_amount": invoice.total_amount,
        "status": invoice.status.value,
        "paid_at": last_payment.paid_at.isoformat() if last_payment else None,
        "payment_method": last_payment.method.value if last_payment else None,
        "payment_reference": last_payment.reference if last_payment else None,
    }


def _serialize_tenancy(tenancy: Tenancy) -> dict:
    unit = tenancy.unit
    unit_type = unit.unit_type
    return {
        "id": tenancy.public_id,
        "unit_number": unit.unit_number,
        "building_name": unit.building.name,
        "building_location": unit.building.location,
        "monthly_rent": tenancy.monthly_rent,
        "deposit_amount": tenancy.deposit_amount,
        "move_in_date": tenancy.move_in_date.isoformat(),
        "status": tenancy.status.value,
        "unit_details": {
            "unit_type_name": unit_type.name,
            "size_sqft": unit_type.size_sqft,
            "floor": unit.floor,
            "max_occupants": unit_type.max_occupants,
        },
    }


@tenants_bp.get("/me/tenancies")
@jwt_required()
def my_tenancies():
    tenant = _current_tenant()
    return {"tenancies": [_serialize_tenancy(t) for t in tenant.tenancies]}


@tenants_bp.post("/link-unit")
@jwt_required()
def link_unit():
    """Links the current tenant to a vacant unit they picked from the dropdown. A
    tenant can hold several tenancies (e.g. renting more than one unit), so this
    doesn't check whether they already have one — only that this specific unit is free."""
    tenant = _current_tenant()

    try:
        payload = LinkUnitIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    unit = Unit.query.filter_by(public_id=payload.unit_id).first()
    if not unit:
        raise ApiError("Unit not found", 404)
    if unit.status != UnitStatus.VACANT:
        raise ApiError(f"Unit {unit.unit_number} is not available", 409)

    monthly_rent = unit.unit_type.computed_rent
    tenancy = Tenancy(
        unit_id=unit.id,
        tenant_id=tenant.id,
        move_in_date=date.today(),
        monthly_rent=monthly_rent,
        deposit_amount=monthly_rent,
        status=TenancyStatus.ACTIVE,
    )
    db.session.add(tenancy)
    unit.status = UnitStatus.OCCUPIED
    db.session.commit()

    return _serialize_tenancy(tenancy), 201


@tenants_bp.patch("/tenancies/<tenancy_id>/move-in-date")
@jwt_required()
def update_move_in_date(tenancy_id):
    """Lets a tenant correct their move-in date — it defaults to the day they linked
    the unit, which isn't always the day they actually moved in."""
    tenant = _current_tenant()
    tenancy = _own_tenancy(tenant, tenancy_id)

    try:
        payload = UpdateMoveInDateIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    tenancy.move_in_date = payload.move_in_date
    db.session.commit()

    return _serialize_tenancy(tenancy)


@tenants_bp.get("/me/invoices")
@jwt_required()
def my_invoices():
    tenant = _current_tenant()
    for tenancy in tenant.tenancies:
        if tenancy.status == TenancyStatus.ACTIVE:
            ensure_current_month_invoice(tenancy)

    invoices = (
        Invoice.query.join(Tenancy)
        .filter(Tenancy.tenant_id == tenant.id)
        .order_by(Invoice.period_start.desc())
        .all()
    )
    return {"invoices": [_serialize_invoice(i) for i in invoices]}


@tenants_bp.post("/invoices/<invoice_id>/pay")
@jwt_required()
def pay_invoice(invoice_id):
    """Records a rent payment against an invoice. There's no live M-Pesa/bank
    integration yet, so this settles the invoice immediately and emails a receipt —
    the same outcome a real payment gateway callback would produce."""
    tenant = _current_tenant()
    invoice = _own_invoice(tenant, invoice_id)

    if invoice.status == InvoiceStatus.PAID:
        raise ApiError("This invoice has already been paid", 409)

    try:
        payload = PayInvoiceIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    reference = payload.reference or f"NYB{secrets.token_hex(4).upper()}"
    paid_at = datetime.utcnow()

    payment = Payment(
        invoice_id=invoice.id,
        amount=invoice.total_amount,
        method=PaymentMethod(payload.method),
        reference=reference,
        paid_at=paid_at,
    )
    db.session.add(payment)
    invoice.status = InvoiceStatus.PAID
    db.session.commit()

    if tenant.email:
        building_name = invoice.tenancy.unit.building.name
        unit_number = invoice.tenancy.unit.unit_number
        period_label = invoice.period_start.strftime("%B %Y")
        paid_at_label = paid_at.strftime("%d %b %Y, %H:%M")

        subject, html = rent_receipt_email(
            tenant.full_name,
            building_name=building_name,
            unit_number=unit_number,
            period_label=period_label,
            amount=invoice.total_amount,
            method=payload.method,
            reference=reference,
            paid_at=paid_at_label,
        )
        pdf_bytes = generate_rent_receipt_pdf(
            tenant_name=tenant.full_name,
            building_name=building_name,
            unit_number=unit_number,
            period_label=period_label,
            amount=invoice.total_amount,
            method=payload.method,
            reference=reference,
            paid_at=paid_at_label,
        )
        attachment = (f"Nyumba-receipt-{invoice.period_start.strftime('%Y-%m')}.pdf", pdf_bytes, "pdf")
        send_email_async(tenant.email, subject, html, attachment=attachment)

    return _serialize_invoice(invoice)
