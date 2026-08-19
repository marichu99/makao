from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import BaseModel, Field, ValidationError

from app.extensions import db
from app.models import Unit, UnitStatus, User
from app.utils.errors import ApiError, pydantic_error_response

units_bp = Blueprint("units", __name__)


class UnitUpdateIn(BaseModel):
    unit_number: str = Field(min_length=1, max_length=20)


def _get_owned_unit(unit_public_id: str) -> Unit:
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user or not user.landlord_profile:
        raise ApiError("Only landlord accounts can manage units", 403)

    unit = (
        Unit.query.join(Unit.building)
        .filter(Unit.public_id == unit_public_id, Unit.building.has(landlord_id=user.landlord_profile.id))
        .first()
    )
    if not unit:
        raise ApiError("Unit not found", 404)
    return unit


@units_bp.patch("/<unit_id>")
@jwt_required()
def update_unit(unit_id):
    unit = _get_owned_unit(unit_id)
    try:
        payload = UnitUpdateIn.model_validate(request.get_json(silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    new_number = payload.unit_number.strip()
    if not new_number:
        raise ApiError("Unit name cannot be empty", 422)
    duplicate = Unit.query.filter(
        Unit.building_id == unit.building_id, Unit.unit_number == new_number, Unit.id != unit.id
    ).first()
    if duplicate:
        raise ApiError(f"Unit {new_number} already exists in this building", 409)

    unit.unit_number = new_number
    db.session.commit()
    return {"id": unit.public_id, "unit_number": unit.unit_number}


@units_bp.delete("/<unit_id>")
@jwt_required()
def delete_unit(unit_id):
    unit = _get_owned_unit(unit_id)

    if unit.status == UnitStatus.OCCUPIED:
        raise ApiError(f"Cannot delete unit {unit.unit_number} — it still has a tenant.", 409)

    db.session.delete(unit)
    db.session.commit()
    return "", 204
