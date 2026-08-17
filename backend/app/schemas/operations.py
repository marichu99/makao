from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class ApplicationIn(BaseModel):
    unit_id: str
    proposed_move_in_date: date
    household_size: int = Field(default=1, ge=1, le=20)
    employment_details: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)


class InspectionIn(BaseModel):
    inspection_type: Literal["move_in", "move_out", "routine"]
    inspected_on: date
    condition_notes: str | None = None
    photos: list[str] = Field(default_factory=list, max_length=20)


class DocumentIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    document_type: str = Field(min_length=1, max_length=50)
    url: str = Field(min_length=1, max_length=1000)
    tenancy_id: str | None = None


class MoveOutIn(BaseModel):
    move_out_date: date
    deposit_refunded: float = Field(ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class ExpenseIn(BaseModel):
    building_id: str
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    expense_type: Literal["fixed", "variable"]
    liability: Literal["common", "landlord", "tenant"] = "common"
    incurred_on: date
    notes: str | None = Field(default=None, max_length=500)
    receipt_url: str | None = Field(default=None, max_length=1000)
    recurring: bool = False


class TicketIn(BaseModel):
    unit_id: str
    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    priority: Literal["low", "medium", "high", "emergency"] = "medium"
    photos: list[str] = Field(default_factory=list, max_length=10)


class TicketUpdateIn(BaseModel):
    status: Literal["open", "in_progress", "resolved"] | None = None
    priority: Literal["low", "medium", "high", "emergency"] | None = None
    vendor_id: str | None = None
    estimated_cost: float | None = Field(default=None, ge=0)
    actual_cost: float | None = Field(default=None, ge=0)


class TicketCommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class VendorIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=255)
    trade: str | None = Field(default=None, max_length=100)
