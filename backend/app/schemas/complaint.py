from pydantic import BaseModel, Field


class ComplaintIn(BaseModel):
    unit_id: str
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1, max_length=2000)


class ComplaintStatusIn(BaseModel):
    status: str
