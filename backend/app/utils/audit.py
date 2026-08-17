from flask_jwt_extended import get_jwt_identity

from app.extensions import db
from app.models import AuditEvent, User


def audit(action: str, entity, **metadata):
    """Persist an append-only business event in the caller's transaction."""
    # SQLAlchemy evaluates column defaults at INSERT time. Flush first so a newly
    # constructed entity has its immutable public id before we reference it.
    db.session.flush()
    identity = get_jwt_identity()
    actor = User.query.filter_by(public_id=identity).first() if identity else None
    db.session.add(AuditEvent(
        actor_id=actor.id if actor else None,
        action=action,
        entity_type=entity.__class__.__name__.lower(),
        entity_public_id=entity.public_id,
        metadata_json=metadata,
    ))
