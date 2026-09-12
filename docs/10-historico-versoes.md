# Histórico de Versões — Sistema Clínico

Este documento registra somente versões concluídas, com seus objetivos,
principais alterações, testes realizados e commits correspondentes.
Deve ser atualizado após a conclusão de cada versão.

## Versão 0.0.1

### Status

CONCLUÍDA

### Objetivo

Criar a estrutura inicial do projeto e iniciar o controle de versão com Git.

### Principais alterações

- Criação da estrutura inicial do projeto em `/home/administrator/clinica`.
- Início do controle de versão com Git.

### Testes realizados

Não há informações disponíveis sobre testes realizados nesta versão.

### Commits correspondentes

- `1c8887e`

## Versão 0.0.2

### Status

CONCLUÍDA

### Objetivo

Criar a base técnica funcional do sistema clínico, integrando backend,
frontend e banco de dados.

### Principais alterações

- Estrutura inicial do backend Flask.
- Frontend React e comunicação com o backend.
- Acesso do frontend pela rede local.
- Integração com MySQL, SQLAlchemy e Flask-Migrate.
- Configuração por variáveis de ambiente.
- Teste automatizado do backend em `backend/tests/test_health.py`.

Principais arquivos do backend:

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   └── routes/
│       ├── __init__.py
│       └── health.py
├── tests/
│   └── test_health.py
├── requirements.txt
└── run.py
```

### Testes realizados

Comando executado no diretório `backend`:

```bash
python -m pytest -q
```

Resultado registrado:

```text
1 passed in 0.63s
```

### Commits correspondentes

- `e4b4eb7`
- `ddae06e`
- `35bb244`
- `44d0f7b`

## Versão 0.0.3

### Status

CONCLUÍDA

### Objetivo

Criar a base de usuários do sistema.

### Principais alterações

- Criação do pacote `app/models`.
- Criação do model `User`.
- Campos `id`, `username`, `password_hash`, `is_active` e `created_at`.
- Armazenamento de senha através de hash.
- Métodos `set_password()` e `check_password()`.
- Inicialização do Flask-Migrate/Alembic.
- Primeira migration.
- Criação da tabela `users` no MySQL.
- Índice único para `username`.
- Criação dos testes automatizados do model `User`.

### Testes realizados

- Migration aplicada com sucesso no MySQL.
- Tabela `users` verificada diretamente no banco.
- Índice único `ix_users_username` verificado.

Comando executado no diretório `backend`:

```bash
python -m pytest -q
```

Resultado registrado:

```text
3 passed in 1.16s
```

### Commits correspondentes

- `fc06e86` — feat: cria base de usuarios e migrations

## Versão 0.0.4

### Status

CONCLUÍDA

### Objetivo

Criar de forma segura o primeiro usuário administrador do sistema.

### Principais alterações

- Criação do comando Flask CLI `create-admin`.
- Solicitação interativa de username e senha.
- Senha oculta durante a digitação.
- Confirmação de senha.
- Normalização do username com `strip()` e conversão para minúsculas (`lower()`).
- Validação de username vazio.
- Exigência mínima de 12 caracteres na senha.
- Bloqueio de username duplicado.
- Uso de `set_password()` para armazenamento somente em hash.
- Criação de testes automatizados do comando.
- Isolamento dos testes com SQLite em memória, sem acessar o MySQL real.

### Testes realizados

- Comando `create-admin` registrado e funcionando.
- Senha curta rejeitada.
- Criação válida confirmada.
- Hash da senha verificado.
- Username duplicado rejeitado.
- Usuário real verificado no MySQL.

Comando executado no diretório `backend`:

```bash
python -m pytest -q
```

Resultado registrado:

```text
6 passed in 1.40s
```

### Commits correspondentes

- `19036aa` — feat: adiciona criacao segura de administrador
