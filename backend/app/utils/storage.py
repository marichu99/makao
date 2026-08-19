import os
from datetime import timedelta

from flask import current_app

# Mirrors the sibling leviathan project's document_service.py, which is the actual
# source of the GCS_BUCKET_NAME / GCS_CREDENTIALS_JSON / USE_LOCAL_STORAGE vars in
# .env (shared GCP project). Every object this app writes is prefixed "makao/" so
# it doesn't collide with that project's own "companies/…" layout in the same bucket.

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
ALLOWED_MIMETYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class UploadRejected(Exception):
    pass


def _config():
    return (
        current_app.config.get("GCS_CREDENTIALS_JSON"),
        current_app.config.get("GCS_BUCKET_NAME"),
        current_app.config.get("USE_LOCAL_STORAGE", True),
    )


def _get_gcs_client(credentials_json):
    from google.cloud import storage
    from google.oauth2 import service_account

    if credentials_json and os.path.exists(credentials_json):
        creds = service_account.Credentials.from_service_account_file(credentials_json)
        return storage.Client(credentials=creds)
    return storage.Client()


def validate_upload(file_storage) -> None:
    """Raises UploadRejected if a werkzeug FileStorage fails the extension/mimetype/size check."""
    filename = file_storage.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mime = (file_storage.content_type or "").lower().split(";")[0].strip()
    if ext not in ALLOWED_EXTENSIONS or mime not in ALLOWED_MIMETYPES:
        raise UploadRejected("Only PDF, JPG, or PNG files are accepted")
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if size > MAX_UPLOAD_BYTES:
        raise UploadRejected("File is larger than 10MB")


def upload_file(data, path: str, content_type: str) -> str:
    """Writes `data` (raw bytes, or a file-like object such as a werkzeug
    FileStorage's .stream) to GCS — or local disk when USE_LOCAL_STORAGE is set —
    under "makao/<path>". Returns the stored path to persist on the owning row."""
    stored_path = f"makao/{path}"
    credentials_json, bucket_name, use_local = _config()
    payload = data.read() if hasattr(data, "read") else data

    if use_local:
        local_path = os.path.join("uploads", stored_path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(payload)
    else:
        client = _get_gcs_client(credentials_json)
        blob = client.bucket(bucket_name).blob(stored_path)
        blob.upload_from_string(payload, content_type=content_type)

    return stored_path


def get_signed_url(stored_path: str, expiry_minutes: int = 60) -> str:
    credentials_json, bucket_name, use_local = _config()
    if use_local:
        return f"/api/uploads/{stored_path}"
    client = _get_gcs_client(credentials_json)
    blob = client.bucket(bucket_name).blob(stored_path)
    return blob.generate_signed_url(expiration=timedelta(minutes=expiry_minutes))
