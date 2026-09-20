"""Equivalent search normalization executed inside SQLite and MySQL queries."""

import sqlite3
import unicodedata

from sqlalchemy import String, event, func
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.functions import FunctionElement


# Canonically accented Latin letters, including uppercase and Vietnamese forms.
# Build one shared mapping for Python/SQLite and the MySQL SQL expression.
_ACCENT_GROUPS = {}
for _codepoint in (*range(0xC0, 0x250), *range(0x1E00, 0x1F00)):
    _character = chr(_codepoint)
    _decomposed = unicodedata.normalize("NFD", _character)
    _base = "".join(c for c in _decomposed if not unicodedata.combining(c))
    if len(_base) == 1 and _base.isascii() and _base.isalpha():
        _ACCENT_GROUPS.setdefault(_base.lower(), []).append(_character)

_TRANSLATION = str.maketrans({
    character: base
    for base, characters in _ACCENT_GROUPS.items()
    for character in characters
})


def normalize_patient_search(value):
    if value is None:
        return None
    value = value.translate(_TRANSLATION).lower()
    return "".join(character for character in value if character.isalnum())


@event.listens_for(Engine, "connect")
def _register_sqlite_search(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.create_function(
            "normalize_patient_search", 1, normalize_patient_search,
            deterministic=True,
        )


class normalized_patient_column(FunctionElement):
    type = String()
    inherit_cache = True


@compiles(normalized_patient_column, "sqlite")
def _sqlite_normalized_column(element, compiler, **kwargs):
    return f"normalize_patient_search({compiler.process(element.clauses, **kwargs)})"


@compiles(normalized_patient_column, "mysql")
def _mysql_normalized_column(element, compiler, **kwargs):
    expression = next(iter(element.clauses))
    for base, characters in _ACCENT_GROUPS.items():
        expression = func.regexp_replace(
            expression, f"[{''.join(characters)}]", base, 1, 0, "c",
        )
    expression = func.regexp_replace(func.lower(expression), "[^[:alnum:]]", "")
    return compiler.process(expression, **kwargs)
