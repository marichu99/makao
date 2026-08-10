from flask import Flask

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

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(buildings_bp, url_prefix="/api/buildings")
    app.register_blueprint(units_bp, url_prefix="/api/units")
    app.register_blueprint(tenants_bp, url_prefix="/api/tenants")
    app.register_blueprint(expenses_bp, url_prefix="/api/expenses")
    app.register_blueprint(invoices_bp, url_prefix="/api/invoices")
    app.register_blueprint(tickets_bp, url_prefix="/api/tickets")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

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
