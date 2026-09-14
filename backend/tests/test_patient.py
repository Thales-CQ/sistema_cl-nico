from datetime import date, datetime, timezone

import pytest
from flask_migrate import upgrade
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Patient


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setattr(
        Config, "SQLALCHEMY_DATABASE_URI", f"sqlite:///{tmp_path / 'patients.db'}"
    )
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        upgrade()
        try:
            yield app
        finally:
            db.session.remove()
            db.engine.dispose()


def test_create_patient_with_defaults(app):
    patient = Patient(
        full_name="Maria Silva",
        birth_date=date(1990, 5, 20),
        sex="F",
    )
    db.session.add(patient)
    db.session.commit()
    patient_id = patient.id
    db.session.expunge_all()

    saved = db.session.get(Patient, patient_id)
    assert saved.full_name == "Maria Silva"
    assert saved.is_active is True
    assert saved.cpf is None
    assert isinstance(saved.created_at, datetime)
    assert isinstance(saved.updated_at, datetime)


def test_persist_main_fields(app):
    patient = Patient(
        full_name="Ana Souza",
        birth_date=date(1990, 5, 20),
        sex="F",
        cpf="52998224725",
        phone="11987654321",
        email="ana@example.com",
        is_active=False,
    )
    db.session.add(patient)
    db.session.commit()
    patient_id = patient.id
    db.session.expunge_all()

    saved = db.session.get(Patient, patient_id)
    assert saved.full_name == "Ana Souza"
    assert saved.birth_date == date(1990, 5, 20)
    assert saved.cpf == "52998224725"
    assert saved.phone == "11987654321"
    assert saved.email == "ana@example.com"
    assert saved.is_active is False


def test_multiple_patients_without_cpf(app):
    db.session.add_all([
        Patient(full_name="Ana", birth_date=date(1990, 5, 20), sex="F"),
        Patient(full_name="Maria", birth_date=date(1992, 8, 15), sex="F"),
    ])
    db.session.commit()

    assert Patient.query.filter_by(cpf=None).count() == 2


def test_duplicate_cpf_is_rejected(app):
    db.session.add_all([
        Patient(full_name="Ana", cpf="52998224725"),
        Patient(full_name="Maria", cpf="52998224725"),
    ])
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_full_name_is_required(app):
    db.session.add(Patient())
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_update_refreshes_updated_at(app):
    old_timestamp = datetime(2000, 1, 1, tzinfo=timezone.utc)
    patient = Patient(
        full_name="Ana",
        birth_date=date(1990, 5, 20),
        sex="F",
        created_at=old_timestamp,
        updated_at=old_timestamp,
    )
    db.session.add(patient)
    db.session.commit()
    patient_id = patient.id
    created_at = patient.created_at
    updated_at = patient.updated_at

    patient.full_name = "Ana Souza"
    db.session.commit()
    db.session.expunge_all()

    saved = db.session.get(Patient, patient_id)
    assert saved.full_name == "Ana Souza"
    assert saved.created_at == created_at
    assert saved.updated_at > updated_at
