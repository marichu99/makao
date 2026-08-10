import enum

from app.extensions import db
from app.models.mixins import BaseModel


class UserRole(str, enum.Enum):
    LANDLORD = "landlord"
    TENANT = "tenant"
    CARETAKER = "caretaker"


class User(BaseModel):
    __tablename__ = "users"

    email = db.Column(db.String(255), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    landlord_profile = db.relationship(
        "Landlord", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    tenancies = db.relationship("Tenancy", back_populates="tenant")
    caretaker_assignments = db.relationship("CaretakerAssignment", back_populates="user")
