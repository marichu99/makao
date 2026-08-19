import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://makao:makao@localhost:5432/makao"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SMTP_HOST = os.environ.get("SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
    SMTP_USER = os.environ.get("SMTP_USER")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    EMAIL_FROM = os.environ.get("EMAIL_FROM")

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    GCS_BUCKET_NAME = os.environ.get("GCS_BUCKET_NAME")
    GCS_CREDENTIALS_JSON = os.environ.get("GCS_CREDENTIALS_JSON")
    USE_LOCAL_STORAGE = os.environ.get("USE_LOCAL_STORAGE", "true").lower() == "true"
