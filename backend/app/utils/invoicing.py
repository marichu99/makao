from calendar import monthrange
from datetime import date

from app.extensions import db
from app.models import Invoice, InvoiceStatus, Tenancy, TenancyStatus


def next_due_date(building, from_date: date) -> date:
    """The building's next rent-due date on or after `from_date` — same day-of-month
    logic ensure_current_month_invoice uses, rolled into the following month if this
    month's due day has already passed."""
    due_day = building.rent_due_day
    period_end = from_date.replace(day=monthrange(from_date.year, from_date.month)[1])
    candidate = from_date.replace(day=min(due_day, period_end.day))
    if candidate >= from_date:
        return candidate
    year, month = (from_date.year + 1, 1) if from_date.month == 12 else (from_date.year, from_date.month + 1)
    next_period_days = monthrange(year, month)[1]
    return date(year, month, min(due_day, next_period_days))


def ensure_current_month_invoice(tenancy: Tenancy) -> Invoice:
    """Gets (creating if needed) this tenancy's rent invoice for the current calendar
    month, so neither the tenant's Payments grid nor the landlord's Tenants grid ever
    needs a manual monthly billing step. Also flips a stale PENDING invoice to OVERDUE
    once its due date has passed.

    While the tenancy itself is still PENDING (onboarding — see app/api/leasing/routes.py
    approve_application), normal monthly billing is skipped entirely in favor of the
    landlord-set initial invoice created at approval time; paying that invoice is what
    flips the tenancy to ACTIVE and lets this function resume generating full months."""
    if tenancy.status == TenancyStatus.PENDING:
        invoice = Invoice.query.filter_by(tenancy_id=tenancy.id, is_initial=True).first()
        sync_overdue_status(invoice)
        return invoice

    period_start = date.today().replace(day=1)
    period_end = period_start.replace(day=monthrange(period_start.year, period_start.month)[1])
    rent_due_day = tenancy.unit.building.rent_due_day
    due_date = period_start.replace(day=min(rent_due_day, period_end.day))

    invoice = Invoice.query.filter_by(tenancy_id=tenancy.id, period_start=period_start).first()
    if not invoice:
        invoice = Invoice(
            tenancy_id=tenancy.id,
            period_start=period_start,
            period_end=period_end,
            rent_amount=tenancy.monthly_rent,
            total_amount=tenancy.monthly_rent,
            due_date=due_date,
            status=InvoiceStatus.PENDING,
        )
        db.session.add(invoice)
        db.session.commit()
    elif invoice.status in (InvoiceStatus.PENDING, InvoiceStatus.OVERDUE) and invoice.due_date != due_date:
        # The building's rent due day changed after this invoice was created — keep
        # this month's still-unpaid invoice in step with the current policy rather
        # than leaving it pinned to a stale due date.
        invoice.due_date = due_date
        if due_date >= date.today():
            invoice.status = InvoiceStatus.PENDING
        db.session.commit()

    sync_overdue_status(invoice)
    return invoice


def sync_overdue_status(invoice: Invoice) -> None:
    if invoice.status == InvoiceStatus.PENDING and invoice.due_date < date.today():
        invoice.status = InvoiceStatus.OVERDUE
        db.session.commit()
