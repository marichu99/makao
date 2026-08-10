import os
from urllib.parse import urlparse

import psycopg2
from psycopg2 import sql


def _connect(dbname, user, password, host, port):
    return psycopg2.connect(dbname=dbname, user=user, password=password, host=host, port=port)


def ensure_database_exists(database_uri: str) -> None:
    """Creates the Postgres role and database targeted by `database_uri` if they don't
    exist yet. No-op for non-Postgres URIs (e.g. sqlite, used in tests).

    First tries connecting directly as the app role — if that already works (role/database
    already exist), nothing else happens and no admin credentials are needed at all. Only
    falls back to an admin connection (to create the role/database) if that direct
    connection fails. Admin access defaults to the local `postgres` superuser; override with
    DATABASE_ADMIN_URL or POSTGRES_ADMIN_USER/POSTGRES_ADMIN_PASSWORD if your setup differs.
    """
    if not database_uri.startswith("postgresql"):
        return

    parsed = urlparse(database_uri)
    dbname = parsed.path.lstrip("/")
    app_user = parsed.username
    app_password = parsed.password
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    try:
        _connect(dbname, app_user, app_password, host, port).close()
        return  # role + database already exist and are reachable — nothing to do
    except psycopg2.OperationalError:
        pass

    admin_uri = os.environ.get("DATABASE_ADMIN_URL")
    if admin_uri:
        admin_parsed = urlparse(admin_uri)
        admin_user = admin_parsed.username
        admin_password = admin_parsed.password
        admin_host = admin_parsed.hostname or host
        admin_port = admin_parsed.port or port
    else:
        admin_user = os.environ.get("POSTGRES_ADMIN_USER", "postgres")
        admin_password = os.environ.get("POSTGRES_ADMIN_PASSWORD")
        admin_host = host
        admin_port = port

    try:
        conn = _connect("postgres", admin_user, admin_password, admin_host, admin_port)
    except psycopg2.OperationalError as exc:
        raise RuntimeError(
            f"Couldn't connect to Postgres as '{app_user}' (database/role probably doesn't exist "
            f"yet), and couldn't connect as admin user '{admin_user}' either to create it ({exc}).\n\n"
            "Either:\n"
            "  1. Set POSTGRES_ADMIN_PASSWORD (or DATABASE_ADMIN_URL) in backend/.env to a working "
            "Postgres superuser connection, then rerun `flask init-db`; or\n"
            "  2. Create the role/database yourself once (needs sudo), then rerun `flask init-db` "
            "— it will just create the tables:\n"
            f"       sudo -u postgres psql -c \"CREATE ROLE {app_user} WITH LOGIN PASSWORD "
            f"'{app_password}' CREATEDB;\"\n"
            f"       sudo -u postgres psql -c \"CREATE DATABASE {dbname} OWNER {app_user};\"\n"
        ) from exc

    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (app_user,))
            if cur.fetchone() is None:
                cur.execute(
                    sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s").format(sql.Identifier(app_user)),
                    (app_password,),
                )
                print(f"Created role '{app_user}'")

            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
            if cur.fetchone() is None:
                cur.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(dbname), sql.Identifier(app_user)
                    )
                )
                print(f"Created database '{dbname}'")
    finally:
        conn.close()
