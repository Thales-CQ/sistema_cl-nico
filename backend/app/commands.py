import click
from flask.cli import with_appcontext

from app.extensions import db
from app.models import User


@click.command("create-admin")
@click.option(
    "--username",
    prompt="Nome de usuário",
)
@click.option(
    "--password",
    prompt="Senha",
    hide_input=True,
    confirmation_prompt="Confirme a senha",
)
@with_appcontext
def create_admin(username, password):
    """Cria um usuário administrador de forma segura."""

    # Remove espaços acidentais e padroniza o nome de usuário.
    username = username.strip().lower()

    if not username:
        raise click.ClickException(
            "O nome de usuário não pode ficar vazio."
        )

    # Define um requisito mínimo antes de gerar o hash da senha.
    if len(password) < 12:
        raise click.ClickException(
            "A senha deve ter pelo menos 12 caracteres."
        )

    # O nome de usuário deve ser único no sistema.
    existing_user = User.query.filter_by(username=username).first()

    if existing_user:
        raise click.ClickException(
            "Este nome de usuário já existe."
        )

    user = User(username=username)

    # set_password gera o hash; a senha original não é salva no banco.
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    click.echo("Usuário administrador criado com sucesso.")
