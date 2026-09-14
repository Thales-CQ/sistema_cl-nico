from datetime import date
from unittest.mock import Mock

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Patient, User


PASSWORD = "senha-de-teste-005"
AUTH_BASE = "/api/v1/auth"
PATIENTS_URL = "/api/v1/patients"


@pytest.fixture
def app(monkeypatch):
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")
    monkeypatch.setattr(Config, "SECRET_KEY", "chave-exclusiva-dos-testes")
    monkeypatch.setattr(Config, "SESSION_COOKIE_SECURE", False)
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.create_all()
        user = User(username="admin")
        user.set_password(PASSWORD)
        db.session.add(user)
        db.session.commit()
    try:
        yield app
    finally:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def authenticated_client(client):
    response = client.get(f"{AUTH_BASE}/me")
    token = response.json["csrf_token"]
    response = client.post(
        f"{AUTH_BASE}/login",
        json={"username": "admin", "password": PASSWORD},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 200
    return client


def test_list_patients_requires_authentication(client):
    response = client.get(PATIENTS_URL)

    assert response.status_code == 401


def test_list_patients_empty(authenticated_client):
    response = authenticated_client.get(PATIENTS_URL)

    assert response.status_code == 200
    assert response.json == {
        "patients": [],
        "page": 1,
        "per_page": 20,
        "total": 0,
    }


def test_list_patients_serializes_existing_patient(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
            cpf="52998224725",
            phone=None,
            email=None,
        )
        db.session.add(patient)
        db.session.commit()
        db.session.refresh(patient)
        expected = {
            "id": patient.id,
            "full_name": patient.full_name,
            "birth_date": patient.birth_date.isoformat(),
            "sex": patient.sex,
            "cpf": patient.cpf,
            "phone": None,
            "email": None,
            "is_active": patient.is_active,
            "created_at": patient.created_at.isoformat(),
            "updated_at": patient.updated_at.isoformat(),
        }

    response = authenticated_client.get(PATIENTS_URL)

    assert response.status_code == 200
    assert response.json["patients"] == [expected]
    assert response.json["total"] == 1


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page=invalid",
        "per_page=0",
        "per_page=101",
        "per_page=invalid",
    ],
)
def test_list_patients_rejects_invalid_pagination(authenticated_client, query):
    response = authenticated_client.get(f"{PATIENTS_URL}?{query}")

    assert response.status_code == 400


def test_create_patient_without_session_or_csrf_returns_403(client):
    response = client.post(PATIENTS_URL, json={})

    assert response.status_code == 403


def test_create_patient_with_anonymous_csrf_but_no_session_returns_401(client):
    csrf_response = client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = client.post(
        PATIENTS_URL,
        json={},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 401


def test_create_patient_with_session_but_no_csrf_returns_403(authenticated_client):
    response = authenticated_client.post(PATIENTS_URL, json={})

    assert response.status_code == 403


def test_create_patient_with_session_and_csrf_reaches_validation(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json["error"] == "Dados inválidos."
    assert "full_name" in response.json["errors"]
    assert "birth_date" in response.json["errors"]
    assert "sex" in response.json["errors"]


def test_create_patient_minimal(authenticated_client, app):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "  Maria Silva  ", "birth_date": "1990-05-20", "sex": "F"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 201
    patient_data = response.json["patient"]

    with app.app_context():
        saved = db.session.get(Patient, patient_data["id"])
        assert saved is not None
        assert saved.full_name == "MARIA SILVA"
        assert saved.birth_date == date(1990, 5, 20)
        assert saved.sex == "F"
        assert saved.cpf is None
        assert saved.phone is None
        assert saved.email is None
        assert saved.is_active is True
        assert saved.created_at <= saved.updated_at

        assert patient_data == {
            "id": saved.id,
            "full_name": saved.full_name,
            "birth_date": saved.birth_date.isoformat(),
            "sex": saved.sex,
            "cpf": None,
            "phone": None,
            "email": None,
            "is_active": True,
            "created_at": saved.created_at.isoformat(),
            "updated_at": saved.updated_at.isoformat(),
        }


def test_create_patient_complete(authenticated_client, app):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={
            "full_name": "  João Souza  ",
            "birth_date": "1990-05-20",
            "sex": "M",
            "cpf": "529.982.247-25",
            "phone": "  (31) 99999-8888  ",
            "email": "  joao@example.com  ",
        },
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 201
    patient_data = response.json["patient"]
    with app.app_context():
        saved = db.session.get(Patient, patient_data["id"])
        assert saved is not None
        assert saved.full_name == "JOÃO SOUZA"
        assert saved.birth_date == date(1990, 5, 20)
        assert saved.sex == "M"
        assert saved.cpf == "52998224725"
        assert len(saved.cpf) == 11
        assert saved.phone == "31999998888"
        assert saved.email == "joao@example.com"
        assert saved.is_active is True
        assert saved.created_at <= saved.updated_at

        assert patient_data == {
            "id": saved.id,
            "full_name": saved.full_name,
            "birth_date": saved.birth_date.isoformat(),
            "sex": saved.sex,
            "cpf": saved.cpf,
            "phone": saved.phone,
            "email": saved.email,
            "is_active": True,
            "created_at": saved.created_at.isoformat(),
            "updated_at": saved.updated_at.isoformat(),
        }


def test_create_patient_normalizes_email_to_lowercase(authenticated_client, app):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={
            "full_name": "Paciente Exemplo",
            "birth_date": "1990-05-20",
            "sex": "F",
            "email": "  Ana.Souza@Example.Com.Br  ",
        },
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 201
    patient_data = response.json["patient"]
    with app.app_context():
        saved = db.session.get(Patient, patient_data["id"])
        assert saved.email == "ana.souza@example.com.br"
        assert patient_data["email"] == "ana.souza@example.com.br"


def test_create_patient_rejects_non_json(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        data="full_name=Maria",
        content_type="text/plain",
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json == {"error": "Envie um objeto JSON válido."}


def test_create_patient_rejects_json_that_is_not_an_object(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json=["Maria"],
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json == {"error": "Envie um objeto JSON válido."}


def test_create_patient_rejects_json_body_larger_than_64_kib(
    authenticated_client, app
):
    import json

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    body = json.dumps({"full_name": "Maria Silva", "birth_date": "1990-05-20", "sex": "F"}).encode("utf-8")
    body += b" " * (64 * 1024)

    assert len(body) > 64 * 1024

    with app.app_context():
        assert Patient.query.count() == 0

    response = authenticated_client.post(
        PATIENTS_URL,
        data=body,
        content_type="application/json",
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 413

    with app.app_context():
        assert Patient.query.count() == 0


def test_create_patient_rejects_unknown_fields(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria", "birth_date": "1990-05-20", "sex": "F", "zzz": "value", "aaa": "value"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json == {
        "error": "Campos não permitidos.",
        "fields": ["aaa", "zzz"],
    }


def test_create_patient_rejects_invalid_patient_data(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    token = csrf_response.json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "   ", "birth_date": "1990-05-20", "sex": "F"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json["error"] == "Dados inválidos."
    assert "full_name" in response.json["errors"]


def test_create_patient_rejects_full_name_with_one_part(authenticated_client):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria", "birth_date": "1990-05-20", "sex": "F"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json["error"] == "Dados inválidos."
    assert response.json["errors"]["full_name"] == (
        "Informe o nome completo, com pelo menos nome e sobrenome."
    )


def test_create_patient_rejects_missing_sex(authenticated_client):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Silva", "birth_date": "1990-05-20"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert "sex" in response.json["errors"]


@pytest.mark.parametrize("sex", [None, "", "X", "Masculino", 1])
def test_create_patient_rejects_invalid_sex(authenticated_client, sex):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Silva", "birth_date": "1990-05-20", "sex": sex},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert "sex" in response.json["errors"]


def test_create_patient_rejects_missing_birth_date(authenticated_client):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Silva", "sex": "F"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert "birth_date" in response.json["errors"]


def test_create_patient_rejects_normalized_duplicate_cpf(authenticated_client):
    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Souza", "birth_date": "1990-05-20", "sex": "F", "cpf": "52998224725"},
        headers={"X-CSRF-Token": csrf_response.json["csrf_token"]},
    )
    assert response.status_code == 201

    csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Ana Costa", "birth_date": "1990-05-20", "sex": "F", "cpf": "529.982.247-25"},
        headers={"X-CSRF-Token": csrf_response.json["csrf_token"]},
    )

    assert response.status_code == 409
    assert response.json == {"error": "CPF já cadastrado."}


def test_create_patients_without_cpf_are_allowed(authenticated_client):
    for name in ("Maria Souza", "Ana Costa"):
        csrf_response = authenticated_client.get(f"{AUTH_BASE}/me")
        response = authenticated_client.post(
            PATIENTS_URL,
            json={"full_name": name, "birth_date": "1990-05-20", "sex": "F"},
            headers={"X-CSRF-Token": csrf_response.json["csrf_token"]},
        )
        assert response.status_code == 201
        assert response.json["patient"]["cpf"] is None


def test_patient_creation_continues_after_cpf_conflict(authenticated_client):
    first_csrf = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    first_response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Souza", "birth_date": "1990-05-20", "sex": "F", "cpf": "52998224725"},
        headers={"X-CSRF-Token": first_csrf},
    )
    assert first_response.status_code == 201

    duplicate_csrf = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    duplicate_response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Ana Costa", "birth_date": "1990-05-20", "sex": "F", "cpf": "529.982.247-25"},
        headers={"X-CSRF-Token": duplicate_csrf},
    )
    assert duplicate_response.status_code == 409

    valid_csrf = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    valid_response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "João Silva", "birth_date": "1990-05-20", "sex": "M"},
        headers={"X-CSRF-Token": valid_csrf},
    )

    assert valid_response.status_code == 201
    assert valid_response.json["patient"]["full_name"] == "JOÃO SILVA"


def test_create_patient_returns_409_for_concurrent_cpf_conflict(
    authenticated_client, monkeypatch
):
    """Verifica recuperação após conflito simulado, sem concorrência real."""


    rollback_spy = Mock()
    original_rollback = Session.rollback

    def tracked_rollback(session):
        rollback_spy()
        return original_rollback(session)

    lookup_count = [0]
    query = Mock()

    def find_cpf():
        lookup_count[0] += 1
        if lookup_count[0] == 1:
            return None
        rollback_spy.assert_called_once()
        return object()

    query.filter_by.return_value.first.side_effect = find_cpf
    commit = Mock(
        side_effect=IntegrityError("unique conflict", {}, Exception("duplicate"))
    )

    with authenticated_client.application.app_context():
        monkeypatch.setattr(Patient, "query", query)
    monkeypatch.setattr(Session, "commit", commit)
    monkeypatch.setattr(Session, "rollback", tracked_rollback)
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.post(
        PATIENTS_URL,
        json={"full_name": "Maria Souza", "birth_date": "1990-05-20", "sex": "F", "cpf": "52998224725"},
        headers={"X-CSRF-Token": token},
    )
    assert response.status_code == 409
    assert response.json == {"error": "CPF já cadastrado."}
    assert commit.call_count == 1
    assert query.filter_by.call_count == 2
    assert lookup_count[0] == 2
    rollback_spy.assert_called_once()


def test_create_patient_reraises_unrelated_integrity_error(
    authenticated_client, monkeypatch
):

    error = IntegrityError(
        "unrelated constraint", {}, Exception("other constraint")
    )
    commit = Mock(side_effect=error)
    rollback_spy = Mock()
    original_rollback = Session.rollback

    def tracked_rollback(session):
        rollback_spy()
        return original_rollback(session)

    monkeypatch.setattr(Session, "commit", commit)
    monkeypatch.setattr(Session, "rollback", tracked_rollback)
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    with pytest.raises(IntegrityError) as raised:
        authenticated_client.post(
            PATIENTS_URL,
            json={"full_name": "Maria Souza", "birth_date": "1990-05-20", "sex": "F"},
            headers={"X-CSRF-Token": token},
        )
    assert raised.value is error
    commit.assert_called_once()
    rollback_spy.assert_called_once()


def test_engine_hides_parameters(app):
    with app.app_context():
        assert db.engine.hide_parameters is True


def test_integrity_error_hides_patient_parameters(app):

    sentinel = "sentinela-paciente@example.com"

    with app.app_context():
        assert db.engine.hide_parameters is True
        db.session.add(Patient(full_name=None, email=sentinel))

        try:
            with pytest.raises(IntegrityError) as exc:
                db.session.commit()

            message = str(exc.value)
            assert sentinel not in message
            assert "SQL parameters hidden due to hide_parameters=True" in message
        finally:
            db.session.rollback()
