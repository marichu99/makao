from app.extensions import db
from app.models.mixins import BaseModel


class LoginOtp(BaseModel):
    """A one-time code emailed to a user to complete login. Naive UTC timestamps
    throughout (not the aware datetimes BaseModel's own created_at/updated_at use)
    so expiry comparisons don't hit a naive/aware TypeError after a DB round-trip."""

    __tablename__ = "login_otps"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    code_hash = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    consumed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User")
