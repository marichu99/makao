import datetime

from app import create_app
from app.extensions import db, bcrypt
from app.models import (
    Building,
    Landlord,
    Tenancy,
    TenancyStatus,
    Unit,
    UnitStatus,
    UnitType,
    User,
    UserRole,
)

app = create_app()


def run():
    with app.app_context():
        if Building.query.filter_by(name="Jabavu Apartments").first():
            print("Seed data already present, skipping.")
            return

        landlord_user = User(
            full_name="Wanjiru Kamau",
            phone="+254712345678",
            email="wanjiru@example.com",
            password_hash=bcrypt.generate_password_hash("password123").decode("utf-8"),
            role=UserRole.LANDLORD,
        )
        db.session.add(landlord_user)
        db.session.flush()

        landlord = Landlord(user_id=landlord_user.id, id_number="23456789")
        db.session.add(landlord)
        db.session.flush()

        building = Building(
            landlord_id=landlord.id,
            name="Jabavu Apartments",
            location="Kilimani, Nairobi",
            year_built=2018,
            total_floors=4,
            common_area_sqft=1200,
        )
        db.session.add(building)
        db.session.flush()

        unit_type_specs = [
            {"name": "Bedsitter", "size_sqft": 300, "base_rent": 15000, "count": 4},
            {"name": "1-Bed", "size_sqft": 450, "base_rent": 25000, "count": 4},
            {"name": "2-Bed", "size_sqft": 700, "base_rent": 40000, "count": 2},
        ]

        block_letters = ["A", "B", "C"]
        units = []
        for spec, block_letter in zip(unit_type_specs, block_letters):
            unit_type = UnitType(
                building_id=building.id,
                name=spec["name"],
                size_sqft=spec["size_sqft"],
                base_rent=spec["base_rent"],
                max_occupants=2 if spec["name"] != "2-Bed" else 4,
            )
            db.session.add(unit_type)
            db.session.flush()

            for seq in range(1, spec["count"] + 1):
                unit = Unit(
                    building_id=building.id,
                    unit_type_id=unit_type.id,
                    unit_number=f"{block_letter}{seq}",
                    status=UnitStatus.VACANT,
                )
                db.session.add(unit)
                units.append(unit)

        db.session.flush()

        sample_tenants = [
            {
                "full_name": "Brian Otieno",
                "phone": "+254722334455",
                "email": "brian.otieno@example.com",
                "unit": units[0],
            },
            {
                "full_name": "Faith Njeri",
                "phone": "+254733445566",
                "email": "faith.njeri@example.com",
                "unit": units[4],
            },
        ]

        for tenant_spec in sample_tenants:
            tenant_user = User(
                full_name=tenant_spec["full_name"],
                phone=tenant_spec["phone"],
                email=tenant_spec["email"],
                password_hash=bcrypt.generate_password_hash("password123").decode("utf-8"),
                role=UserRole.TENANT,
            )
            db.session.add(tenant_user)
            db.session.flush()

            unit = tenant_spec["unit"]
            unit.status = UnitStatus.OCCUPIED
            monthly_rent = unit.unit_type.computed_rent

            tenancy = Tenancy(
                unit_id=unit.id,
                tenant_id=tenant_user.id,
                move_in_date=datetime.date.today() - datetime.timedelta(days=90),
                monthly_rent=monthly_rent,
                deposit_amount=monthly_rent,
                status=TenancyStatus.ACTIVE,
            )
            db.session.add(tenancy)

        db.session.commit()
        print(f"Seeded '{building.name}' (code: {building.building_code}) with {len(units)} units "
              f"and {len(sample_tenants)} active tenancies.")


if __name__ == "__main__":
    run()
