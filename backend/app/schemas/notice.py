from typing import Literal, Optional

from pydantic import BaseModel, Field


class SendNoticeIn(BaseModel):
    notice_type: Literal["reminder", "arrears", "general"]
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=5555)
