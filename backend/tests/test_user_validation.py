from datetime import date, datetime, timedelta

import pytest

from app.validators.user import format_birth_date, parse_birth_date, validate_full_name


@pytest.mark.parametrize("value", ["JOÃO", "MARIA", " JOÃO ", "   ", "JOÃO -"])
def test_full_name_rejects_missing_surname(value):
    with pytest.raises(ValueError, match="nome e sobrenome|vazio"):
        validate_full_name(value)


@pytest.mark.parametrize("value, expected", [
    ("JOÃO SILVA", "JOÃO SILVA"),
    ("MARIA SOUZA", "MARIA SOUZA"),
    ("  João   da  Silva ", "JOÃO DA SILVA"),
    ("ANA MARIA COSTA", "ANA MARIA COSTA"),
    ("A B", "A B"),
])
def test_full_name_accepts_words_and_normalizes_spaces(value, expected):
    assert validate_full_name(value) == expected


@pytest.mark.parametrize("value, expected", [
    ("02/01/1980", date(1980, 1, 2)),
    ("29/02/2000", date(2000, 2, 29)),
    ("01/01/0001", date(1, 1, 1)),
])
def test_birth_date_round_trip(value, expected):
    parsed = parse_birth_date(value)
    assert type(parsed) is date
    assert parsed == expected
    assert format_birth_date(parsed) == value


@pytest.mark.parametrize("value", [
    "1980-01-02", "1/01/1980", "01/1/1980", "01/01/80", "01011980",
    "01-01-1980", " 01/01/1980", "01/01/1980\n", "０１/０１/１９８０",
    "31/04/1980", "29/02/1900", "29/02/2001", "00/01/1980",
    "01/00/1980", "01/13/1980", "01/01/0000", "", None, 19800101,
    date(1980, 1, 2),
])
def test_birth_date_rejects_invalid_input(value):
    with pytest.raises(ValueError, match="DD/MM/AAAA"):
        parse_birth_date(value)


def test_birth_date_accepts_today_and_rejects_tomorrow():
    today = date.today()
    assert parse_birth_date(format_birth_date(today)) == today
    with pytest.raises(ValueError, match="não pode ser futura"):
        parse_birth_date(format_birth_date(today + timedelta(days=1)))


def test_format_legacy_birth_date():
    assert format_birth_date(None) is None


@pytest.mark.parametrize("value", ["1980-01-02", 19800102, datetime(1980, 1, 2)])
def test_format_birth_date_requires_date(value):
    with pytest.raises(ValueError, match="DD/MM/AAAA"):
        format_birth_date(value)
