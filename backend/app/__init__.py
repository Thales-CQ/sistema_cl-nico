from flask import Flask

from .config import Config
from .routes import register_routes
from .extensions import db, migrate
from .models import User

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    register_routes(app)

    return app
