# Histórico de Versões — TCQ Clinic

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

## Versão 0.0.5

### Status

CONCLUÍDA

### Objetivo

Implementar a autenticação backend baseada em sessão segura.

### Principais alterações

- `POST /api/v1/auth/login`.
- `GET /api/v1/auth/me`.
- `POST /api/v1/auth/logout`.
- Autenticação baseada em sessão Flask.
- Sessão contendo somente `user_id`.
- Cookie `HttpOnly`.
- `SameSite=Lax`.
- `Secure` configurável conforme ambiente.
- Duração da sessão de 30 minutos.
- Rejeição genérica para usuário inexistente, senha incorreta e usuário inativo.
- Revalidação do usuário em `/me`.
- Proteção CSRF com token assinado.
- Validação adicional de `Origin`.
- Testes isolados usando SQLite em memória.
- Sem JWT, localStorage, alterações no frontend, roles ou permissions.

### Testes realizados

Comando executado no diretório `backend`:

```bash
python -m pytest -q
```

Resultado registrado:

```text
58 passed in 8.98s
```

### Commits correspondentes

- `a7a843b` — feat: adiciona autenticacao backend com sessao segura

### Pendências deliberadas para produção

- HTTPS.
- `SESSION_COOKIE_SECURE=true`.
- `SECRET_KEY` forte no ambiente.
- Configuração correta de proxy/origem.
- Limitação de tentativas de login.
- Mecanismo futuro de revogação server-side de sessões roubadas.

## Versão 0.0.6

### Status

CONCLUÍDA

### Objetivo

Implementar a autenticação no frontend integrada ao backend da versão 0.0.5.

### Principais alterações

- Tela de login responsiva e acessível.
- `AuthContext` e `AuthProvider`.
- Restauração automática da sessão via `/auth/me`.
- Login e logout integrados à API.
- CSRF mantido somente em memória.
- Sem JWT, `localStorage` ou `sessionStorage`.
- `AuthLayout` e `MainLayout` reutilizáveis.
- Componente `Button` reutilizável.
- Estilos organizados com tokens CSS e preparação para temas.
- Estrutura mobile-first.
- Tratamento amigável de falhas de rede.
- Proxy Vite preservando Origin/Host com `changeOrigin: false`.

### Testes realizados

- `npm run lint`: PASS.
- `npm run build`: PASS.
- Testes do backend: 58 passed.
- `git diff --check`: PASS.
- Validação manual no navegador: PASS nos seis pontos definidos.

### Commits correspondentes

- `5db5998` — feat: adiciona autenticacao no frontend

## Versão 0.0.7

### Status

CONCLUÍDA

### Objetivo

Implementar o cadastro e a listagem de pacientes integrados à autenticação do sistema.

### Principais alterações

- Cadastro e listagem de pacientes no backend e frontend.
- Validação de nome completo, CPF, telefone, data de nascimento e sexo, com erros por campo.
- Migrations para os dados dos pacientes, com verificações que abortam se houver `NULL` antes de aplicar `NOT NULL`.
- Sessão de login marcada como permanente para aplicar o limite configurado.

### Testes realizados

- Backend: `255 passed`, com 12 avisos.
- Frontend: `npm run lint` e `npm run build` concluídos com sucesso.

### Commits correspondentes

- `00ef937` — feat: adiciona cadastro e listagem de pacientes

### Pendências futuras

- Busca de pacientes.
- Edição de pacientes.
- Paginação completa da lista.

Nota: essas pendências foram resolvidas posteriormente nas versões 0.0.8 e
0.0.9.

## Versão 0.0.8

### Status

CONCLUÍDA

### Objetivo

Completar a consulta e permitir visualizar, editar, inativar e reativar
pacientes.

### Principais alterações

- Consulta e pesquisa de pacientes, com carregamento dos dados atuais para edição.
- Endpoints de detalhe, atualização e alteração de status.
- Formulário de edição integrado à API.

### Evidências e cobertura de testes

- Backend: `backend/app/routes/patients.py` e
  `backend/tests/test_patients_api.py`.
- Validação: `backend/tests/test_patient_validation.py`.
- Frontend: `frontend/src/features/patients/` e
  `frontend/tests/patients-validation.test.mjs`.
- Os arquivos indicam cobertura do fluxo; este registro não afirma uma
  execução de testes específica para esta versão.

### Commits correspondentes

- `d1e36e6` — melhora consulta e pesquisa de pacientes.
- `afab564` — adiciona gerenciamento de pacientes na API.
- `5d265d2` — adiciona serviços de gerenciamento de pacientes.
- `83b64c8` — adiciona edição na consulta de pacientes.
- `ffb2bf6` — adiciona tela de edição de pacientes.
- `12f57a7` — atualiza o roadmap da versão 0.0.8.

## Versão 0.0.9

### Status

CONCLUÍDA

### Objetivo

Adicionar pesquisa server-side e paginação à consulta de pacientes.

### Principais alterações

- Pesquisa por nome, CPF e telefone com normalização de caixa, acentos e
  pontuação.
- Paginação de 20 pacientes por página e total de resultados na resposta.
- Controles de página e estados de carregamento, erro e ausência de resultados.

### Evidências e cobertura de testes

- Backend: `backend/app/patient_search.py`,
  `backend/app/routes/patients.py` e testes de pesquisa e paginação em
  `backend/tests/test_patients_api.py`.
- Frontend: `frontend/src/features/patients/` e
  `frontend/tests/patients-validation.test.mjs`.
- O roadmap registra os itens como concluídos; este histórico não afirma uma
  execução de testes específica para esta versão.

### Commits correspondentes

- `0950c70` — adiciona pesquisa e paginação de pacientes na API.
- `7ea700f` — adiciona pesquisa e paginação na consulta de pacientes.
- `2987ecc` — registra a conclusão da versão 0.0.9 no roadmap.

## Versão 0.0.10

### Status

CONCLUÍDA

### Objetivo

Consolidar o fluxo de pacientes existente e registrar a regra de inativação
para fluxos clínicos futuros.

### Principais alterações

- Revisão e consolidação de cadastro, edição, validações e tratamento de
  conflitos de pacientes.
- Pacientes inativos permanecem registrados; a exclusão de novos fluxos
  clínicos será aplicada quando esses fluxos existirem.
- Aniversariantes inativos são excluídos do resumo do Dashboard.

### Evidências e cobertura de testes

- Backend: `backend/app/routes/patients.py`,
  `backend/app/validators/patient.py` e testes de validação, status,
  duplicidade e atualização em `backend/tests/`.
- Frontend: `frontend/src/features/patients/` e
  `frontend/tests/patients-validation.test.mjs`.
- A regra para agendamentos permanece futura; esta versão não implementa
  Agenda nem Agendamentos.

### Commits correspondentes

- `8c07409` — consolida fluxo de pacientes.
- `b79706f` — ajusta aniversariantes ativos no Dashboard.
- `ef9fe5f` — redefine o roadmap da primeira versão clínica e registra a
  regra de pacientes inativos.

## Versão 0.0.11

### Status

CONCLUÍDA

### Objetivo

Implementar gestão de usuários, incluindo autenticação segura de contas,
associação a perfis e administração de senha e status.

### Principais alterações

- Cadastro, consulta, edição, ativação e inativação de usuários.
- Troca e redefinição de senha; usuários inativos não autenticam.
- Associação de múltiplos perfis e proteção para operações administrativas.
- Documentação dos contratos backend e dos fluxos frontend de Usuários.

### Evidências e cobertura de testes

- Backend: `backend/app/routes/users.py`, `backend/app/user_api.py`,
  `backend/app/validators/user.py`, `backend/docs/users-api.md` e testes de
  autenticação, validação e API em `backend/tests/`.
- Frontend: `frontend/src/features/users/` e testes em `frontend/tests/` para
  listagem, cadastro, edição, perfis e contratos da API.
- Os arquivos de teste registram cobertura; este histórico não afirma uma
  execução de testes específica para esta versão.

### Commits correspondentes

- `7d033c9` — conclui usuários, perfis e associação multiperfil na 0.0.11.
- Correções posteriores do fluxo de Usuários: `eb6f234` (feedback de falha ao
  alterar status) e `3ea276d` (status na edição conforme permissões).

## Versão 0.0.12

### Status

CONCLUÍDA

### Objetivo

Aplicar permissões por módulo e ação no backend e derivar acesso e navegação
das permissões efetivas do usuário.

### Principais alterações

- Catálogo persistido de permissões, perfis configuráveis e permissões
  efetivas resolvidas a partir dos perfis ativos.
- Proteção de endpoints de Pacientes, Usuários e Perfis, com distinção entre
  não autenticado e sem permissão.
- Navegação e destinos frontend filtrados por permissão.
- Correções de autorização no cadastro de Perfil e no Dashboard.

### Evidências e cobertura de testes

- Backend: migration `backend/migrations/versions/2c8e91b4a6d0_add_permissions.py`,
  `backend/app/permission_security.py`, rotas dos módulos e documentação em
  `backend/docs/permissions-0.0.12.md`.
- Cobertura backend em `test_permissions.py`, `test_permission_resolver.py`,
  `test_profiles_api.py`, `test_users_api.py` e `test_patients_api.py`.
- Cobertura frontend em `auth-state.test.mjs`, `profile-permissions.test.mjs`,
  `users.test.mjs` e `dashboard-permissions.test.mjs`.
- Este registro não afirma uma execução de testes específica para esta versão.

### Commits correspondentes

- `8a9c345` — adiciona sistema de permissões e autorização.
- `8357b68` — respeita permissão independente no cadastro de Perfil.
- `aa23aa2` — correção da 0.0.12 para respeitar `patients.view` no Dashboard.

## Melhorias posteriores sem versão atribuída

- `339df5d` — moderniza o Login e atualiza a identidade para TCQ Clinic.
- `d1365a1` — melhora a navegação mobile do Menu.

Esses commits são registrados como melhorias posteriores e não recebem número
de versão neste histórico.
