import re
from datetime import date


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_FULL_NAME_LENGTH = 120
MAX_EMAIL_LENGTH = 254
MIN_PASSWORD_LENGTH = 12


def normalize_username(value):
    if not isinstance(value, str):
        raise ValueError("O nome de usuário deve ser um texto.")
    normalized = value.strip().upper()
    if not normalized:
        raise ValueError("O nome de usuário não pode ficar vazio.")
    if len(normalized) > 80:
        raise ValueError("O nome de usuário deve ter no máximo 80 caracteres.")
    return normalized


def validate_full_name(value):
    if not isinstance(value, str):
        raise ValueError("O nome completo deve ser um texto.")
    normalized = " ".join(value.split()).upper()
    if not normalized:
        raise ValueError("O nome completo não pode ficar vazio.")
    if len(normalized) > MAX_FULL_NAME_LENGTH:
        raise ValueError(
            f"O nome completo deve ter no máximo {MAX_FULL_NAME_LENGTH} caracteres."
        )
    words = normalized.split()
    if len(words) < 2 or any(not any(char.isalpha() for char in word) for word in words):
        raise ValueError("Informe o nome completo com pelo menos nome e sobrenome.")
    return normalized


def parse_birth_date(value):
    """Converte a entrada DD/MM/AAAA de CLI ou formulário em datetime.date."""
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{2}/[0-9]{2}/[0-9]{4}", value):
        raise ValueError("A data de nascimento deve estar no formato DD/MM/AAAA.")
    day, month, year = map(int, value.split("/"))
    try:
        parsed = date(year, month, day)
    except ValueError as exc:
        raise ValueError(
            "A data de nascimento deve ser uma data válida no formato DD/MM/AAAA."
        ) from exc
    if parsed > date.today():
        raise ValueError("A data de nascimento não pode ser futura (DD/MM/AAAA).")
    return parsed


def format_birth_date(value):
    """Formata um Date do banco para exibição; cadastro legado vazio retorna None."""
    if value is None:
        return None
    if type(value) is not date:
        raise ValueError("A data de nascimento deve ser do tipo date para exibição em DD/MM/AAAA.")
    return f"{value.day:02d}/{value.month:02d}/{value.year:04d}"


def normalize_email(value):
    if not isinstance(value, str):
        raise ValueError("O e-mail deve ser um texto.")
    normalized = value.strip().lower()
    if not normalized or len(normalized) > MAX_EMAIL_LENGTH:
        raise ValueError("O e-mail é obrigatório e deve ter formato válido.")
    if not EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("O e-mail é obrigatório e deve ter formato válido.")
    return normalized


def validate_password(value):
    if not isinstance(value, str) or len(value) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres."
        )
    return value
