import re
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RegisterIn(BaseModel):
    role: Literal["landlord", "tenant"]
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=9, max_length=20)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=8)

    # Landlord-only
    id_number: Optional[str] = Field(default=None, min_length=5, max_length=20)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def check_role_fields(self):
        if self.role == "landlord" and not self.id_number:
            raise ValueError("id_number is required for landlord accounts")
        return self


class LoginIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=150, description="Phone number or email")
    password: str = Field(min_length=1)


class VerifyLoginOtpIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=150)
    code: str = Field(min_length=6, max_length=6)


class ResendLoginOtpIn(BaseModel):
    identifier: str = Field(min_length=3, max_length=150)
