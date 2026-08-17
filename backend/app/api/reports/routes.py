from datetime import date

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import (Application, ApplicationStatus, Building, Complaint, ComplaintStatus, Expense,
                        Invoice, InvoiceStatus, Tenancy, Ticket, TicketStatus, Unit, User)
from app.utils.errors import ApiError

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/portfolio")
@jwt_required()
def portfolio_report():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlords can view portfolio reports", 403)
    building_ids = [b.id for b in user.landlord_profile.buildings]
    invoices = Invoice.query.join(Tenancy).filter(Tenancy.unit.has(Building.id.in_(building_ids))).all()
    expenses = Expense.query.filter(Expense.building_id.in_(building_ids)).all()
    expected = sum(float(i.total_amount) for i in invoices)
    collected = sum(sum(float(p.amount) for p in i.payments) for i in invoices)
    arrears = max(0, expected - collected)
    expense_total = sum(float(e.amount) for e in expenses)
    return {"as_of": date.today().isoformat(), "expected_rent": expected, "collected": collected,
            "arrears": arrears, "expenses": expense_total, "net_cash_flow": collected - expense_total,
            "overdue_invoices": sum(1 for i in invoices if i.status == InvoiceStatus.OVERDUE),
            "by_building": [{"building_id": b.public_id, "building_name": b.name,
                             "expected_rent": sum(float(i.total_amount) for i in invoices if i.tenancy.unit.building_id == b.id),
                             "expenses": sum(float(e.amount) for e in expenses if e.building_id == b.id)} for b in user.landlord_profile.buildings]}


# Powers the sidebar's pending-item badges: how many items in each module are
# awaiting the landlord's action, so they can prioritize without opening every page.
@reports_bp.get("/pending-counts")
@jwt_required()
def pending_counts():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlords can view pending counts", 403)
    landlord_id = user.landlord_profile.id
    applications = Application.query.join(Unit).join(Building).filter(
        Building.landlord_id == landlord_id, Application.status == ApplicationStatus.SUBMITTED).count()
    tickets = Ticket.query.join(Unit).join(Building).filter(
        Building.landlord_id == landlord_id, Ticket.status == TicketStatus.OPEN).count()
    complaints = Complaint.query.join(Unit).join(Building).filter(
        Building.landlord_id == landlord_id, Complaint.status == ComplaintStatus.OPEN).count()
    overdue_invoices = Invoice.query.join(Tenancy).join(Tenancy.unit).join(Building).filter(
        Building.landlord_id == landlord_id, Invoice.status == InvoiceStatus.OVERDUE).count()
    return {"applications": applications, "tickets": tickets, "complaints": complaints, "invoices": overdue_invoices}
