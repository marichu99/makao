from datetime import datetime

from flask import Blueprint, Response, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import Building, InvoiceStatus, Notice, NoticeType, Tenancy, TenancyStatus, Unit, UnitStatus, User
from app.schemas.building import BuildingIn, BuildingUpdateIn
from app.schemas.notice import SendNoticeIn
from app.utils.email import send_email_async
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.invoicing import ensure_current_month_invoice
from app.utils.units import generate_units_for_building
from app.utils.units_report_pdf import generate_units_report_pdf
from app.utils.welcome_email import tenant_notice_email

buildings_bp = Blueprint("buildings", __name__)


def _current_landlord():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlord accounts can manage buildings", 403)
    return user.landlord_profile


def _get_owned_building(landlord, building_public_id: str) -> Building:
    building = Building.query.filter_by(public_id=building_public_id, landlord_id=landlord.id).first()
    if not building:
        raise ApiError("Building not found", 404)
    return building


def _get_owned_tenancy(landlord, tenancy_public_id: str) -> Tenancy:
    tenancy = Tenancy.query.filter_by(public_id=tenancy_public_id).first()
    if not tenancy or tenancy.unit.building.landlord_id != landlord.id:
        raise ApiError("Tenant not found", 404)
    return tenancy


def _serialize_building(building: Building) -> dict:
    return {
        "id": building.public_id,
        "name": building.name,
        "location": building.location,
        "building_code": building.building_code,
        "year_built": building.year_built,
        "total_floors": building.total_floors,
        "common_area_sqft": building.common_area_sqft,
        "rent_due_day": building.rent_due_day,
        "unit_types_count": len(building.unit_types),
        "units_count": len(building.units),
    }


def _serialize_unit(unit) -> dict:
    active_tenancy = next((t for t in unit.tenancies if t.status == TenancyStatus.ACTIVE), None)
    tenant = None
    if active_tenancy:
        tenant = {
            "tenancy_id": active_tenancy.public_id,
            "name": active_tenancy.tenant.full_name,
            "phone": active_tenancy.tenant.phone,
            "email": active_tenancy.tenant.email,
            "move_in_date": active_tenancy.move_in_date.isoformat(),
            "rent_status": ensure_current_month_invoice(active_tenancy).status.value,
        }
    return {
        "id": unit.public_id,
        "unit_number": unit.unit_number,
        "floor": unit.floor,
        "status": unit.status.value,
        "tenant": tenant,
    }


def _serialize_unit_type_with_units(unit_type) -> dict:
    return {
        "id": unit_type.public_id,
        "name": unit_type.name,
        "size_sqft": unit_type.size_sqft,
        "base_rent": unit_type.base_rent,
        "rent_per_sqft": unit_type.rent_per_sqft,
        "computed_rent": unit_type.computed_rent,
        "max_occupants": unit_type.max_occupants,
        "units": [_serialize_unit(u) for u in unit_type.units],
    }


def _serialize_building_detail(building: Building) -> dict:
    return {
        **_serialize_building(building),
        "unit_types": [_serialize_unit_type_with_units(ut) for ut in building.unit_types],
    }


@buildings_bp.get("/")
@jwt_required()
def list_buildings():
    landlord = _current_landlord()
    return {"buildings": [_serialize_building(b) for b in landlord.buildings]}


@buildings_bp.get("/stats")
@jwt_required()
def building_stats():
    landlord = _current_landlord()
    buildings = landlord.buildings
    total_units = sum(len(b.units) for b in buildings)
    occupied_units = sum(1 for b in buildings for u in b.units if u.status == UnitStatus.OCCUPIED)

    return {
        "buildings_count": len(buildings),
        "units_count": total_units,
        "occupied_units_count": occupied_units,
        "occupancy_rate": round((occupied_units / total_units) * 100, 1) if total_units else None,
    }


@buildings_bp.get("/tenants")
@jwt_required()
def landlord_tenants():
    """Every active tenancy across all of the landlord's buildings, for the Tenants
    grid — a tenant only shows up here once they've linked themselves to a unit."""
    landlord = _current_landlord()
    tenancies = [
        tenancy
        for building in landlord.buildings
        for unit in building.units
        for tenancy in unit.tenancies
        if tenancy.status == TenancyStatus.ACTIVE
    ]
    tenancies.sort(key=lambda t: t.tenant.full_name)

    return {
        "tenants": [
            {
                "id": t.public_id,
                "tenant_name": t.tenant.full_name,
                "tenant_phone": t.tenant.phone,
                "tenant_email": t.tenant.email,
                "building_name": t.unit.building.name,
                "unit_number": t.unit.unit_number,
                "monthly_rent": t.monthly_rent,
                "move_in_date": t.move_in_date.isoformat(),
                "rent_status": ensure_current_month_invoice(t).status.value,
            }
            for t in tenancies
        ]
    }


@buildings_bp.post("/tenants/<tenancy_id>/notices")
@jwt_required()
def send_tenant_notice(tenancy_id):
    """Sends a rent reminder, arrears warning, or general notice to a tenant by
    email, and keeps a record of it for the landlord's own reference."""
    landlord = _current_landlord()
    tenancy = _get_owned_tenancy(landlord, tenancy_id)

    try:
        payload = SendNoticeIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    if not tenancy.tenant.email:
        raise ApiError(f"{tenancy.tenant.full_name} has no email on file to send a notice to", 409)

    notice = Notice(
        tenancy_id=tenancy.id,
        sent_by_id=landlord.user_id,
        notice_type=NoticeType(payload.notice_type),
        subject=payload.subject,
        message=payload.message,
    )
    db.session.add(notice)
    db.session.commit()

    subject, html_body = tenant_notice_email(
        tenancy.tenant.full_name,
        subject=payload.subject,
        message=payload.message,
        building_name=tenancy.unit.building.name,
        unit_number=tenancy.unit.unit_number,
    )
    send_email_async(tenancy.tenant.email, subject, html_body)

    return {
        "id": notice.public_id,
        "notice_type": notice.notice_type.value,
        "subject": notice.subject,
        "message": notice.message,
        "sent_at": notice.created_at.isoformat(),
    }, 201


@buildings_bp.get("/tenants/<tenancy_id>/notices")
@jwt_required()
def list_tenant_notices(tenancy_id):
    landlord = _current_landlord()
    tenancy = _get_owned_tenancy(landlord, tenancy_id)

    notices = sorted(tenancy.notices, key=lambda n: n.created_at, reverse=True)
    return {
        "notices": [
            {
                "id": n.public_id,
                "notice_type": n.notice_type.value,
                "subject": n.subject,
                "message": n.message,
                "sent_at": n.created_at.isoformat(),
            }
            for n in notices
        ]
    }


@buildings_bp.get("/tenants/<tenancy_id>/rent-history")
@jwt_required()
def tenant_rent_history(tenancy_id):
    """A tenant's rent payment track record over time — how consistently they've
    paid, month over month — for the landlord's 'Payment history' view."""
    landlord = _current_landlord()
    tenancy = _get_owned_tenancy(landlord, tenancy_id)

    invoices = sorted(tenancy.invoices, key=lambda i: i.period_start, reverse=True)

    months = []
    on_time_count = 0
    late_count = 0
    outstanding_count = 0
    for invoice in invoices:
        last_payment = invoice.payments[-1] if invoice.payments else None
        on_time = None
        if invoice.status == InvoiceStatus.PAID and last_payment:
            on_time = last_payment.paid_at.date() <= invoice.due_date
            if on_time:
                on_time_count += 1
            else:
                late_count += 1
        elif invoice.status in (InvoiceStatus.PENDING, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID):
            outstanding_count += 1

        months.append(
            {
                "period_label": invoice.period_start.strftime("%B %Y"),
                "due_date": invoice.due_date.isoformat(),
                "status": invoice.status.value,
                "paid_at": last_payment.paid_at.isoformat() if last_payment else None,
                "on_time": on_time,
            }
        )

    paid_count = on_time_count + late_count
    return {
        "tenant_name": tenancy.tenant.full_name,
        "unit_number": tenancy.unit.unit_number,
        "building_name": tenancy.unit.building.name,
        "summary": {
            "months_billed": len(months),
            "paid_count": paid_count,
            "on_time_count": on_time_count,
            "late_count": late_count,
            "outstanding_count": outstanding_count,
            "on_time_rate": round((on_time_count / paid_count) * 100, 1) if paid_count else None,
        },
        "months": months,
    }


@buildings_bp.get("/directory")
@jwt_required()
def buildings_directory():
    """Every building on the platform, minimal fields only — lets a tenant search for
    theirs by name/location without exposing landlord-only details like unit rents."""
    buildings = Building.query.order_by(Building.name).all()
    return {
        "buildings": [
            {"id": b.public_id, "name": b.name, "location": b.location} for b in buildings
        ]
    }


@buildings_bp.get("/<building_id>/vacant-units")
@jwt_required()
def vacant_units(building_id):
    building = Building.query.filter_by(public_id=building_id).first()
    if not building:
        raise ApiError("Building not found", 404)

    units = (
        Unit.query.filter_by(building_id=building.id, status=UnitStatus.VACANT)
        .order_by(Unit.unit_number)
        .all()
    )
    return {"units": [{"id": u.public_id, "unit_number": u.unit_number} for u in units]}


@buildings_bp.get("/<building_id>")
@jwt_required()
def get_building(building_id):
    landlord = _current_landlord()
    building = _get_owned_building(landlord, building_id)
    return _serialize_building_detail(building)


@buildings_bp.get("/<building_id>/units-report")
@jwt_required()
def units_report(building_id):
    """A printable PDF of this building's units, optionally narrowed to an
    occupancy status (vacant/occupied/maintenance) and/or a rent status
    (pending/paid/overdue/partially_paid) — mirrors whatever filters the
    landlord has applied to the Units grid."""
    landlord = _current_landlord()
    building = _get_owned_building(landlord, building_id)

    occupancy_filter = request.args.get("occupancy_status", "all")
    rent_filter = request.args.get("rent_status", "all")

    rows = []
    for unit in sorted(building.units, key=lambda u: u.id):
        if occupancy_filter != "all" and unit.status.value != occupancy_filter:
            continue

        tenant = _serialize_unit(unit)["tenant"]
        unit_rent_status = tenant["rent_status"] if tenant else None
        if rent_filter != "all" and unit_rent_status != rent_filter:
            continue

        rows.append(
            {
                "unit_number": unit.unit_number,
                "floor": unit.floor,
                "status": unit.status.value,
                "tenant_name": tenant["name"] if tenant else None,
                "tenant_phone": tenant["phone"] if tenant else None,
                "rent_status": unit_rent_status,
            }
        )

    filters_label_parts = []
    if occupancy_filter != "all":
        filters_label_parts.append(f"Status: {occupancy_filter.capitalize()}")
    if rent_filter != "all":
        filters_label_parts.append(f"Rent: {rent_filter.replace('_', ' ').capitalize()}")
    filters_label = ", ".join(filters_label_parts) or "All units"

    pdf_bytes = generate_units_report_pdf(
        building_name=building.name,
        building_location=building.location,
        filters_label=filters_label,
        generated_at=datetime.now().strftime("%d %b %Y, %H:%M"),
        rows=rows,
    )

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Nyumba-units-report-{building.building_code}.pdf"'},
    )


@buildings_bp.post("/")
@jwt_required()
def create_building():
    landlord = _current_landlord()

    try:
        payload = BuildingIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    building = Building(
        landlord_id=landlord.id,
        name=payload.name,
        location=payload.location,
        year_built=payload.year_built,
        total_floors=payload.total_floors,
        common_area_sqft=payload.common_area_sqft,
        rent_due_day=payload.rent_due_day,
    )
    db.session.add(building)
    db.session.flush()

    generate_units_for_building(building, payload.unit_types)
    db.session.commit()

    return _serialize_building(building), 201


@buildings_bp.patch("/<building_id>")
@jwt_required()
def update_building(building_id):
    landlord = _current_landlord()
    building = _get_owned_building(landlord, building_id)

    try:
        payload = BuildingUpdateIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(building, field, value)

    db.session.commit()
    return _serialize_building(building)


@buildings_bp.delete("/<building_id>")
@jwt_required()
def delete_building(building_id):
    landlord = _current_landlord()
    building = _get_owned_building(landlord, building_id)

    occupied = sum(1 for u in building.units if u.status == UnitStatus.OCCUPIED)
    if occupied:
        raise ApiError(
            f"Cannot delete '{building.name}' — {occupied} unit(s) still have tenants. "
            "Move tenants out first.",
            409,
        )

    db.session.delete(building)
    db.session.commit()
    return "", 204
