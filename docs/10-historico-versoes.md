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
