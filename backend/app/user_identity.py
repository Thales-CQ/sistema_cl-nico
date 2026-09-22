"""Canonical identity comparisons, including legacy rows, without DB collation drift."""

from sqlalchemy import select

from app.extensions import db
from app.models import User
from app.validators.user import normalize_email, normalize_username, validate_full_name


IDENTITY_NORMALIZERS = {"username": normalize_username, "email": normalize_email}
PROFILE_NORMALIZERS = {**IDENTITY_NORMALIZERS, "full_name": validate_full_name}


def matching_user_ids(field, value, exclude_id=None):
    normalize = IDENTITY_NORMALIZERS[field]
    target = normalize(value)
    # Python's Unicode upper() is also the persistence rule. SQL UPPER/LOWER
    # differs across SQLite/MySQL/PostgreSQL, especially for non-ASCII text.
    query = select(User.id, getattr(User, field))
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    matches = []
    for user_id, stored in db.session.execute(query):
        if stored is None:
            continue
        try:
            if normalize(stored) == target:
                matches.append(user_id)
        except ValueError:
            # Invalid legacy identifiers cannot be addressed by a valid input.
            continue
    return matches


def normalization_plan():
    """Read only public profile columns; report IDs, never credentials or values."""
    rows = db.session.execute(select(
        User.id, User.username, User.full_name, User.email,
    ).order_by(User.id)).mappings().all()
    changes = []
    invalid = []
    identities = {field: {} for field in IDENTITY_NORMALIZERS}
    for row in rows:
        fields = {}
        for field, normalize in PROFILE_NORMALIZERS.items():
            value = row[field]
            if value is None and field != "username":
                continue
            try:
                normalized = normalize(value)
            except ValueError:
                invalid.append((row["id"], field))
                continue
            if field in identities:
                identities[field].setdefault(normalized, []).append(row["id"])
            if normalized != value:
                fields[field] = normalized
        if fields:
            changes.append((row["id"], fields))
    collisions = [
        (field, ids) for field, groups in identities.items()
        for ids in groups.values() if len(ids) > 1
    ]
    return len(rows), changes, invalid, collisions
