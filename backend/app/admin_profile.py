"""Keep the structural Administrador association in step with is_admin.

In this phase is_admin remains the sole authorization source. Callers hold the
user-write lock and commit the association with the user change.
"""

from app.extensions import db
from app.models import Profile


ADMIN_PROFILE_NAME = "Administrador"


def sync_admin_profile(user):
    admin = Profile.query.filter_by(name=ADMIN_PROFILE_NAME).one_or_none()
    if admin is None:
        admin = Profile(name=ADMIN_PROFILE_NAME)
        db.session.add(admin)
        db.session.flush()
    if user.is_admin:
        if admin not in user.profiles:
            user.profiles.append(admin)
    elif admin in user.profiles:
        user.profiles.remove(admin)
