from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class UnitTypeIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)  # e.g. "Bedsitter", "1-Bed"
    size_sqft: Optional[float] = Field(default=None, gt=0)
    base_rent: float = Field(ge=0)
    rent_per_sqft: Optional[float] = Field(default=None, ge=0)
    max_occupants: int = Field(default=1, ge=1)
    count: int = Field(gt=0, description="Number of units of this type to generate")

    @model_validator(mode="after")
    def rent_per_sqft_needs_size(self):
        if self.rent_per_sqft is not None and self.size_sqft is None:
            raise ValueError("size_sqft is required when rent_per_sqft is set")
        return self


class BuildingIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    location: str = Field(min_length=2, max_length=150)
    year_built: Optional[int] = None
    total_floors: Optional[int] = Field(default=None, ge=1)
    common_area_sqft: Optional[float] = Field(default=None, ge=0)
    rent_due_day: int = Field(
        default=5, ge=1, le=28, description="Day of the month rent is due, for every tenant in this building"
    )
    unit_types: List[UnitTypeIn] = Field(min_length=1)

    @field_validator("unit_types")
    @classmethod
    def must_have_units(cls, v: List[UnitTypeIn]) -> List[UnitTypeIn]:
        if sum(ut.count for ut in v) < 1:
            raise ValueError("Building must have at least one unit")
        return v


class BuildingUpdateIn(BaseModel):
    """Partial update — unit types aren't editable here, only the building's own fields."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    location: Optional[str] = Field(default=None, min_length=2, max_length=150)
    year_built: Optional[int] = None
    total_floors: Optional[int] = Field(default=None, ge=1)
    common_area_sqft: Optional[float] = Field(default=None, ge=0)
    rent_due_day: Optional[int] = Field(default=None, ge=1, le=28)
