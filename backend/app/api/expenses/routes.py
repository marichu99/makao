from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db
from app.models import Building, Expense, ExpenseLiability, ExpenseType, User
from app.schemas.operations import ExpenseIn
from app.utils.audit import audit
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.storage import get_signed_url

expenses_bp = Blueprint("expenses", __name__)


def landlord():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlords can manage expenses", 403)
    return user


def serialize(expense):
    return {"id": expense.public_id, "building_id": expense.building.public_id,
            "building_name": expense.building.name, "unit_id": expense.unit.public_id if expense.unit else None,
            "unit_number": expense.unit.unit_number if expense.unit else None, "category": expense.category,
            "amount": float(expense.amount), "expense_type": expense.expense_type.value,
            "liability": expense.liability.value, "incurred_on": expense.incurred_on.isoformat(),
            "notes": expense.notes, "has_receipt": bool(expense.receipt_url), "recurring": expense.recurring,
            "ticket_id": expense.ticket.public_id if expense.ticket else None}


@expenses_bp.get("/")
@jwt_required()
def list_expenses():
    user = landlord()
    rows = Expense.query.join(Building).filter(Building.landlord_id == user.landlord_profile.id).order_by(Expense.incurred_on.desc()).all()
    return {"expenses": [serialize(row) for row in rows]}


@expenses_bp.post("/")
@jwt_required()
def create_expense():
    user = landlord()
    try:
        payload = ExpenseIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422
    building = Building.query.filter_by(public_id=payload.building_id, landlord_id=user.landlord_profile.id).first()
    if not building:
        raise ApiError("Building not found", 404)
    values = payload.model_dump(exclude={"building_id"})
    expense = Expense(building_id=building.id, expense_type=ExpenseType(values.pop("expense_type")),
                      liability=ExpenseLiability(values.pop("liability")), **values)
    db.session.add(expense)
    audit("expense.created", expense, building_id=building.public_id, amount=payload.amount)
    db.session.commit()
    return serialize(expense), 201


@expenses_bp.get("/<expense_id>/receipt")
@jwt_required()
def expense_receipt(expense_id):
    user = landlord()
    expense = Expense.query.filter_by(public_id=expense_id).first()
    if not expense or expense.building.landlord_id != user.landlord_profile.id or not expense.receipt_url:
        raise ApiError("Receipt not found", 404)
    # receipt_url is either an internal storage key (uploaded via ticket resolution)
    # or an externally-hosted URL supplied directly when the expense was created.
    if expense.receipt_url.startswith("makao/"):
        return {"url": get_signed_url(expense.receipt_url)}
    return {"url": expense.receipt_url}
