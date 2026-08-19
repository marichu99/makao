import os

from flask import Flask, abort, send_file
from flask_jwt_extended import jwt_required

from app.config import Config
from app.extensions import db, migrate, jwt, bcrypt, cors


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    # Without this, Werkzeug's interactive debugger intercepts unhandled exceptions
    # before our error handlers (and flask-cors) ever run, so the response comes back
    # with no CORS headers at all — the browser reports a confusing "CORS error" that
    # is actually masking a 500. Forcing this off means our own handler below always
    # runs instead, with proper JSON + CORS headers, while the traceback still prints
    # to the terminal via logger.exception.
    app.config["PROPAGATE_EXCEPTIONS"] = False

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    from app import models  # noqa: F401  (registers models with SQLAlchemy metadata)

    from app.api.auth.routes import auth_bp
    from app.api.buildings.routes import buildings_bp
    from app.api.units.routes import units_bp
    from app.api.tenants.routes import tenants_bp
    from app.api.expenses.routes import expenses_bp
    from app.api.invoices.routes import invoices_bp
    from app.api.tickets.routes import tickets_bp
    from app.api.leasing.routes import leasing_bp
    from app.api.reports.routes import reports_bp
    from app.api.complaints.routes import complaints_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(buildings_bp, url_prefix="/api/buildings")
    app.register_blueprint(units_bp, url_prefix="/api/units")
    app.register_blueprint(tenants_bp, url_prefix="/api/tenants")
    app.register_blueprint(expenses_bp, url_prefix="/api/expenses")
    app.register_blueprint(invoices_bp, url_prefix="/api/invoices")
    app.register_blueprint(tickets_bp, url_prefix="/api/tickets")
    app.register_blueprint(leasing_bp, url_prefix="/api/leasing")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(complaints_bp, url_prefix="/api/complaints")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/uploads/<path:stored_path>")
    @jwt_required()
    def serve_local_upload(stored_path):
        # Only reachable when USE_LOCAL_STORAGE is set — in GCS mode, uploads are
        # served via signed URLs instead (see app/utils/storage.py).
        if not app.config.get("USE_LOCAL_STORAGE"):
            abort(404)
        uploads_root = os.path.abspath("uploads")
        local_path = os.path.abspath(os.path.join(uploads_root, stored_path))
        if not local_path.startswith(uploads_root + os.sep) or not os.path.isfile(local_path):
            abort(404)
        return send_file(local_path)

    from app.utils.errors import ApiError

    @app.errorhandler(ApiError)
    def handle_api_error(exc: ApiError):
        db.session.rollback()
        return {"error": exc.message}, exc.status_code

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        db.session.rollback()
        app.logger.exception("Unhandled exception")
        message = str(exc) if app.debug else "Something went wrong on our end. Please try again."
        return {"error": message}, 500

    @app.cli.command("init-db")
    def init_db_command():
        """Creates the Postgres database (if missing) and all tables/relations."""
        from app.utils.db_setup import ensure_database_exists

        ensure_database_exists(app.config["SQLALCHEMY_DATABASE_URI"])
        db.create_all()
        print("Database ready: all tables created.")

    return app
