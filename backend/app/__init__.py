from flask import Flask

from .commands import create_admin
from .config import Config
from .extensions import db, migrate
from .models import User
from .routes import register_routes


def create_app():
    """Cria e configura a aplicação Flask."""

    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializa as extensões da aplicação.
    db.init_app(app)
    migrate.init_app(app, db)

    # Registra as rotas HTTP da API.
    register_routes(app)

    # Registra os comandos administrativos do Flask CLI.
    app.cli.add_command(create_admin)

    return app
