from datetime import datetime, timedelta

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from pydantic import ValidationError

from app.extensions import db, bcrypt
from app.models import Landlord, LoginOtp, User, UserRole
from app.schemas.auth import LoginIn, RegisterIn, ResendLoginOtpIn, VerifyLoginOtpIn
from app.utils.email import send_email_async
from app.utils.errors import ApiError, pydantic_error_response
from app.utils.login_otp_email import login_otp_email
from app.utils.otp import generate_otp_code
from app.utils.welcome_email import landlord_welcome_email, tenant_welcome_email

auth_bp = Blueprint("auth", __name__)

OTP_VALIDITY_MINUTES = 10


def _issue_tokens(user: User) -> dict:
    access_token = create_access_token(identity=user.public_id, additional_claims={"role": user.role.value})
    refresh_token = create_refresh_token(identity=user.public_id)
    return {"access_token": access_token, "refresh_token": refresh_token}


def _serialize_user(user: User) -> dict:
    return {
        "id": user.public_id,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value,
    }


def _find_user_by_identifier(identifier: str):
    identifier = identifier.strip()
    if "@" in identifier:
        return User.query.filter_by(email=identifier.lower()).first()
    return User.query.filter_by(phone=identifier).first()


def _send_login_otp(user: User) -> None:
    # Invalidate any still-open codes so only the latest one is valid.
    LoginOtp.query.filter_by(user_id=user.id, consumed_at=None).delete()

    code = generate_otp_code()
    db.session.add(
        LoginOtp(
            user_id=user.id,
            code_hash=bcrypt.generate_password_hash(code).decode("utf-8"),
            expires_at=datetime.utcnow() + timedelta(minutes=OTP_VALIDITY_MINUTES),
        )
    )
    db.session.commit()

    subject, html = login_otp_email(user.full_name, code, OTP_VALIDITY_MINUTES)
    send_email_async(user.email, subject, html)


@auth_bp.post("/register")
def register():
    """Creates a user account with just credentials. Landlords set up their building
    once logged in; tenants pick their building and unit afterwards via a dropdown
    (see /api/tenants/link-unit) rather than at signup."""
    try:
        payload = RegisterIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    email = payload.email.lower() if payload.email else None

    if User.query.filter_by(phone=payload.phone).first():
        raise ApiError("A user with this phone number already exists", 409)
    if email and User.query.filter_by(email=email).first():
        raise ApiError("A user with this email already exists", 409)

    role = UserRole.LANDLORD if payload.role == "landlord" else UserRole.TENANT
    user = User(
        full_name=payload.full_name,
        phone=payload.phone,
        email=email,
        password_hash=bcrypt.generate_password_hash(payload.password).decode("utf-8"),
        role=role,
    )
    db.session.add(user)
    db.session.flush()

    if role == UserRole.LANDLORD:
        db.session.add(Landlord(user_id=user.id, id_number=payload.id_number))

    db.session.commit()

    if user.email:
        if role == UserRole.LANDLORD:
            subject, html = landlord_welcome_email(user.full_name)
        else:
            subject, html = tenant_welcome_email(user.full_name)
        send_email_async(user.email, subject, html)

    return {
        **_issue_tokens(user),
        "user": {
            "id": user.public_id,
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "role": user.role.value,
        },
    }, 201


@auth_bp.post("/login")
def login():
    """Verifies phone/email + password. If the account has an email on file, a login
    is completed with a follow-up OTP (see /verify-login-otp) rather than issuing
    tokens immediately; phone-only accounts have nowhere to send a code, so they
    skip straight to a normal login."""
    try:
        payload = LoginIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    user = _find_user_by_identifier(payload.identifier)
    if not user or not bcrypt.check_password_hash(user.password_hash, payload.password):
        raise ApiError("Invalid phone number, email, or password", 401)
    if not user.is_active:
        raise ApiError("This account has been deactivated", 403)

    if user.email:
        _send_login_otp(user)
        return {"otp_required": True}

    return {**_issue_tokens(user), "user": _serialize_user(user)}


@auth_bp.post("/verify-login-otp")
def verify_login_otp():
    try:
        payload = VerifyLoginOtpIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    user = _find_user_by_identifier(payload.identifier)
    if not user:
        raise ApiError("Invalid or expired code", 401)

    otp = (
        LoginOtp.query.filter_by(user_id=user.id, consumed_at=None)
        .order_by(LoginOtp.id.desc())
        .first()
    )
    if not otp or otp.expires_at < datetime.utcnow() or not bcrypt.check_password_hash(otp.code_hash, payload.code):
        raise ApiError("Invalid or expired code", 401)

    otp.consumed_at = datetime.utcnow()
    db.session.commit()

    return {**_issue_tokens(user), "user": _serialize_user(user)}


@auth_bp.post("/resend-login-otp")
def resend_login_otp():
    try:
        payload = ResendLoginOtpIn.model_validate(request.get_json(force=True, silent=True) or {})
    except ValidationError as exc:
        return pydantic_error_response(exc), 422

    user = _find_user_by_identifier(payload.identifier)
    if not user or not user.email:
        raise ApiError("Could not resend code", 404)

    _send_login_otp(user)
    return {"sent": True}


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = User.query.filter_by(public_id=get_jwt_identity()).first()
    if not user:
        raise ApiError("User not found", 404)

    access_token = create_access_token(identity=user.public_id, additional_claims={"role": user.role.value})
    return {"access_token": access_token}
