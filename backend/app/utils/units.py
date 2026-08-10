import string
from typing import List

from app.extensions import db
from app.models import Building, Unit, UnitStatus, UnitType
from app.schemas.building import UnitTypeIn


def generate_units_for_building(building: Building, unit_type_specs: List[UnitTypeIn]) -> int:
    """Creates a UnitType + its Units for each spec, numbered A1, A2… B1, B2… Returns units created."""
    units_created = 0
    for block_index, spec in enumerate(unit_type_specs):
        unit_type = UnitType(
            building_id=building.id,
            name=spec.name,
            size_sqft=spec.size_sqft,
            base_rent=spec.base_rent,
            rent_per_sqft=spec.rent_per_sqft,
            max_occupants=spec.max_occupants,
        )
        db.session.add(unit_type)
        db.session.flush()

        block_letter = string.ascii_uppercase[block_index % 26]
        for seq in range(1, spec.count + 1):
            db.session.add(
                Unit(
                    building_id=building.id,
                    unit_type_id=unit_type.id,
                    unit_number=f"{block_letter}{seq}",
                    status=UnitStatus.VACANT,
                )
            )
            units_created += 1

    return units_created
