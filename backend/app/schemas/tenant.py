from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LinkUnitIn(BaseModel):
    unit_id: str = Field(min_length=1, description="Public ID of the vacant unit to link")


class UpdateMoveInDateIn(BaseModel):
    move_in_date: date


class PayInvoiceIn(BaseModel):
    method: Literal["mpesa", "cash", "bank_transfer"] = "mpesa"
    reference: Optional[str] = Field(default=None, max_length=100)
