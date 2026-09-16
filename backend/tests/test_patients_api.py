from datetime import date, timedelta
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
BIRTHDAYS_URL = f"{PATIENTS_URL}/birthdays/today"
PATIENT_DETAILS_URL = f"{PATIENTS_URL}/{{patient_id}}"
PATIENT_UPDATE_URL = PATIENT_DETAILS_URL
PATIENT_STATUS_URL = f"{PATIENTS_URL}/{{patient_id}}/status"


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


def test_list_today_birthdays_requires_authentication(client):
    response = client.get(BIRTHDAYS_URL)

    assert response.status_code == 401


def test_get_patient_requires_authentication(client):
    response = client.get(PATIENT_DETAILS_URL.format(patient_id=1))

    assert response.status_code == 401


def test_get_patient_returns_existing_patient(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
            cpf="52998224725",
            phone="31999998888",
            email="maria@example.com",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    response = authenticated_client.get(
        PATIENT_DETAILS_URL.format(patient_id=patient_id)
    )

    assert response.status_code == 200
    assert response.json["patient"]["id"] == patient_id
    assert response.json["patient"]["full_name"] == "Maria Silva"


def test_get_patient_returns_not_found_for_unknown_patient(authenticated_client):
    response = authenticated_client.get(PATIENT_DETAILS_URL.format(patient_id=9999))

    assert response.status_code == 404
    assert response.json == {"error": "Paciente não encontrado."}


def test_get_patient_uses_existing_serialization(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Formato do Paciente",
            birth_date=date(1988, 3, 15),
            sex="M",
            cpf="52998224725",
            phone="31999998888",
            email="formato@example.com",
        )
        db.session.add(patient)
        db.session.commit()
        expected = {
            "id": patient.id,
            "full_name": patient.full_name,
            "birth_date": patient.birth_date.isoformat(),
            "sex": patient.sex,
            "cpf": patient.cpf,
            "phone": patient.phone,
            "email": patient.email,
            "is_active": patient.is_active,
            "created_at": patient.created_at.isoformat(),
            "updated_at": patient.updated_at.isoformat(),
        }

    response = authenticated_client.get(
        PATIENT_DETAILS_URL.format(patient_id=expected["id"])
    )

    assert response.status_code == 200
    assert response.json == {"patient": expected}


def test_get_patient_prevents_caching(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Cache Control",
            birth_date=date(1988, 3, 15),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    response = authenticated_client.get(
        PATIENT_DETAILS_URL.format(patient_id=patient_id)
    )

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"


def test_update_patient_requires_authentication(client):
    response = client.patch(
        PATIENT_UPDATE_URL.format(patient_id=1),
        json={"full_name": "Maria Souza"},
    )

    assert response.status_code == 403


def test_update_patient_requires_csrf(authenticated_client):
    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=1),
        json={"full_name": "Maria Souza"},
    )

    assert response.status_code == 403


def test_update_patient_returns_not_found_for_unknown_patient(authenticated_client):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]

    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=9999),
        json={"full_name": "Maria Souza"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 404
    assert response.json == {"error": "Paciente não encontrado."}


def test_update_patient_applies_partial_normalized_fields_and_preserves_others(
    app, authenticated_client
):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
            cpf="52998224725",
            phone="31999998888",
            email="old@example.com",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id
        created_at = patient.created_at

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={
            "full_name": "  Maria Souza  ",
            "email": "  new@example.com  ",
        },
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 200
    assert response.json["patient"]["full_name"] == "MARIA SOUZA"
    assert response.json["patient"]["email"] == "new@example.com"
    assert response.json["patient"]["birth_date"] == "1990-05-20"
    assert response.json["patient"]["sex"] == "F"
    assert response.json["patient"]["cpf"] == "52998224725"
    assert response.json["patient"]["phone"] == "31999998888"
    assert response.json["patient"]["created_at"] == created_at.isoformat()


def test_update_patient_allows_keeping_own_cpf(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
            cpf="52998224725",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={"cpf": "529.982.247-25"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 200
    assert response.json["patient"]["cpf"] == "52998224725"


def test_update_patient_rejects_cpf_from_another_patient(app, authenticated_client):
    with app.app_context():
        patients = [
            Patient(
                full_name="Maria Silva",
                birth_date=date(1990, 5, 20),
                sex="F",
                cpf="52998224725",
            ),
            Patient(
                full_name="Ana Costa",
                birth_date=date(1991, 6, 21),
                sex="F",
                cpf="11144477735",
            ),
        ]
        db.session.add_all(patients)
        db.session.commit()
        patient_id = patients[1].id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={"cpf": "529.982.247-25"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 409
    assert response.json == {"error": "CPF já cadastrado."}


def test_update_patient_rejects_internal_fields_and_empty_payload(
    app, authenticated_client
):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    internal_response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={
            "id": 999,
            "is_active": False,
            "created_at": "2020-01-01T00:00:00+00:00",
            "updated_at": "2020-01-01T00:00:00+00:00",
        },
        headers={"X-CSRF-Token": token},
    )
    empty_response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={},
        headers={"X-CSRF-Token": token},
    )

    assert internal_response.status_code == 400
    assert internal_response.json["error"] == "Campos não permitidos."
    assert set(internal_response.json["fields"]) == {
        "id", "is_active", "created_at", "updated_at",
    }
    assert empty_response.status_code == 400


def test_update_patient_rejects_invalid_data(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_UPDATE_URL.format(patient_id=patient_id),
        json={"birth_date": "not-a-date"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json["error"] == "Dados inválidos."
    assert "birth_date" in response.json["errors"]


def test_update_patient_rolls_back_unrelated_integrity_error(
    app, authenticated_client, monkeypatch
):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    error = IntegrityError("unrelated constraint", {}, Exception("other constraint"))
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
        authenticated_client.patch(
            PATIENT_UPDATE_URL.format(patient_id=patient_id),
            json={"full_name": "Ana Souza"},
            headers={"X-CSRF-Token": token},
        )

    assert raised.value is error
    commit.assert_called_once()
    rollback_spy.assert_called_once()


def test_update_patient_status_requires_authentication(client):
    csrf_response = client.get(f"{AUTH_BASE}/me")
    response = client.patch(
        PATIENT_STATUS_URL.format(patient_id=1),
        json={"is_active": False},
        headers={"X-CSRF-Token": csrf_response.json["csrf_token"]},
    )

    assert response.status_code == 401


def test_update_patient_status_requires_csrf(authenticated_client):
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=1),
        json={"is_active": False},
    )

    assert response.status_code == 403


def test_update_patient_status_inactivates_patient(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=patient_id),
        json={"is_active": False},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 200
    assert response.json["patient"]["is_active"] is False
    assert response.headers["Cache-Control"] == "no-store"
    with app.app_context():
        assert db.session.get(Patient, patient_id).is_active is False


def test_update_patient_status_reactivates_patient(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
            is_active=False,
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=patient_id),
        json={"is_active": True},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 200
    assert response.json["patient"]["is_active"] is True
    with app.app_context():
        assert db.session.get(Patient, patient_id).is_active is True


def test_update_patient_status_returns_not_found_for_unknown_patient(
    authenticated_client,
):
    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=9999),
        json={"is_active": False},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 404
    assert response.json == {"error": "Paciente não encontrado."}


@pytest.mark.parametrize("value", ["false", "true", 0, 1, None, [], {}])
def test_update_patient_status_rejects_non_boolean_values(
    app, authenticated_client, value
):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=patient_id),
        json={"is_active": value},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json == {"error": "is_active deve ser booleano."}


def test_update_patient_status_rejects_extra_fields(app, authenticated_client):
    with app.app_context():
        patient = Patient(
            full_name="Maria Silva",
            birth_date=date(1990, 5, 20),
            sex="F",
        )
        db.session.add(patient)
        db.session.commit()
        patient_id = patient.id

    token = authenticated_client.get(f"{AUTH_BASE}/me").json["csrf_token"]
    response = authenticated_client.patch(
        PATIENT_STATUS_URL.format(patient_id=patient_id),
        json={"is_active": False, "id": patient_id},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 400
    assert response.json == {
        "error": "Envie somente o campo is_active.",
        "fields": ["id"],
    }


def test_list_today_birthdays_returns_only_today_matches(app, authenticated_client):
    today = date.today()
    other_day = today + timedelta(days=1)
    with app.app_context():
        birthday = Patient(
            full_name="Aniversariante Hoje",
            birth_date=date(2000, today.month, today.day),
            sex="F",
        )
        other_patient = Patient(
            full_name="Outro Paciente",
            birth_date=date(2000, other_day.month, other_day.day),
            sex="M",
        )
        db.session.add_all([birthday, other_patient])
        db.session.commit()
        expected = {
            "id": birthday.id,
            "full_name": birthday.full_name,
            "birth_date": birthday.birth_date.isoformat(),
        }

    response = authenticated_client.get(BIRTHDAYS_URL)

    assert response.status_code == 200
    assert response.json == {"patients": [expected]}


def test_list_today_birthdays_returns_multiple_matches(app, authenticated_client):
    today = date.today()
    with app.app_context():
        patients = [
            Patient(
                full_name="Primeiro Aniversariante",
                birth_date=date(1990, today.month, today.day),
                sex="F",
            ),
            Patient(
                full_name="Segundo Aniversariante",
                birth_date=date(1985, today.month, today.day),
                sex="M",
            ),
        ]
        db.session.add_all(patients)
        db.session.commit()

    response = authenticated_client.get(BIRTHDAYS_URL)

    assert response.status_code == 200
    assert [patient["full_name"] for patient in response.json["patients"]] == [
        "Primeiro Aniversariante",
        "Segundo Aniversariante",
    ]


def test_list_today_birthdays_returns_empty_list(app, authenticated_client):
    today = date.today()
    other_day = today + timedelta(days=1)
    with app.app_context():
        db.session.add(Patient(
            full_name="Sem Aniversario Hoje",
            birth_date=date(2000, other_day.month, other_day.day),
            sex="F",
        ))
        db.session.commit()

    response = authenticated_client.get(BIRTHDAYS_URL)

    assert response.status_code == 200
    assert response.json == {"patients": []}


def test_list_today_birthdays_response_contains_only_required_fields(app, authenticated_client):
    today = date.today()
    with app.app_context():
        patient = Patient(
            full_name="Formato da Resposta",
            birth_date=date(2000, today.month, today.day),
            sex="F",
            cpf="52998224725",
            phone="11999999999",
            email="formato@example.com",
        )
        db.session.add(patient)
        db.session.commit()

    response = authenticated_client.get(BIRTHDAYS_URL)

    assert response.status_code == 200
    assert set(response.json["patients"][0]) == {"id", "full_name", "birth_date"}


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
