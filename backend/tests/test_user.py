from app.models import User


def test_set_password_generates_hash():
    user = User(username="admin")
    user.set_password("senha-segura")

    assert user.password_hash != "senha-segura"
    assert user.password_hash is not None


def test_check_password():
    user = User(username="admin")
    user.set_password("senha-segura")

    assert user.check_password("senha-segura") is True
    assert user.check_password("senha-errada") is False
