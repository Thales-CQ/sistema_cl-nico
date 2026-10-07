# 0.0.12 — contrato inicial de permissões (Etapa 1)

Este documento fixa o comportamento **futuro** da 0.0.12. Nesta etapa, a API
continua autorizando Pacientes por sessão ativa e Usuários/Perfis por `is_admin`.
Nenhuma das permissões abaixo é aplicada ainda. Autenticação e CSRF continuam
obrigatórios conforme os contratos atuais; falta de sessão retorna 401 e falta
de permissão deverá retornar 403.

## Catálogo inicial

| Módulo | Códigos |
| --- | --- |
| Pacientes | `patients.view`, `patients.create`, `patients.update`, `patients.change_status` |
| Usuários | `users.view`, `users.create`, `users.update`, `users.change_status`, `users.reset_password`, `users.assign_profiles` |
| Perfis | `profiles.view`, `profiles.create`, `profiles.update` |

A permissão efetiva é a **união** das permissões dos perfis **ativos** associados
ao usuário. Perfil inativo não concede nenhuma permissão, mesmo se continuar
associado. A autorização deve consultar o estado persistido em cada requisição:
alterações de associação, estado do perfil ou permissões do perfil valem na
próxima requisição, sem novo login. A sessão identifica o usuário, mas não deve
guardar uma cópia permanente das permissões.

## Correspondência com a API existente

Todos os caminhos abaixo têm prefixo `/api/v1`.

| Método e caminho | Permissões exigidas |
| --- | --- |
| GET `/patients`, `/patients/<id>`, `/patients/birthdays/today` | `patients.view` |
| POST `/patients` | `patients.create` |
| PATCH `/patients/<id>` | `patients.update`; também `patients.change_status` quando o payload contém `is_active` |
| PATCH `/patients/<id>/status` | `patients.change_status` |
| GET `/users`, `/users/<id>` | `users.view` |
| POST `/users` | `users.create`; também `users.assign_profiles` se contiver `profile_ids` e `users.change_status` se `is_active=false` for enviado explicitamente |
| PATCH `/users/<id>` | `users.update`; também `users.change_status` se contiver `is_active` e `users.assign_profiles` se contiver `profile_ids` ou alterar `is_admin` |
| PATCH `/users/<id>/status` | `users.change_status` |
| PATCH `/users/<id>/password` | `users.reset_password` |
| GET `/profiles`, `/profiles/<id>` | `profiles.view` |
| POST `/profiles` | `profiles.create` |
| PATCH `/profiles/<id>` | `profiles.update` |

POST `/users` continua exigindo ao menos um perfil; portanto, no contrato
atual, toda criação usa `profile_ids` e exige também `users.assign_profiles`.
Assim, na prática, a criação pela API administrativa exige ambas as permissões.
Se `is_active=false` for enviado explicitamente, exige ainda
`users.change_status`. Qualquer alteração de `is_admin` no PATCH `/users/<id>`
exige `users.assign_profiles`, mesmo sem `profile_ids`; a sincronização atual
entre `is_admin` e o perfil Administrador permanece durante a transição.
PATCH `/auth/me/password` continua sendo direito do próprio usuário autenticado,
com verificação da senha atual, sem permissão administrativa. Não há operação
de exclusão neste catálogo. O campo `is_active` de Perfis é tratado por
`profiles.update`, pois não existe endpoint de status separado para Perfis.

## Perfis atribuíveis e proteção estrutural

Os formulários de Usuários usarão o futuro endpoint
GET `/api/v1/users/assignable-profiles`. Ele exige usuário autenticado e
`users.assign_profiles`, sem exigir `profiles.view`. Retorna somente perfis
ativos que o ator pode atribuir e não é endpoint de administração de Perfis.
O perfil Administrador só aparece quando o ator é Administrador estrutural
ativo. A API atual oferece somente GET `/profiles`, restrito a administradores;
o endpoint separado ainda não existe e não é implementado nesta etapa.

`users.assign_profiles` não autoriza atribuir qualquer perfil: o ator só pode
atribuir perfis cujas permissões efetivas estejam contidas nas permissões
efetivas do próprio ator. Perfil inativo nunca aparece como nova opção
atribuível. Associações inativas já existentes continuam sujeitas às regras de
compatibilidade da 0.0.11 até sua alteração explícita: podem ser mantidas em
uma atualização, mas não atribuídas pela primeira vez. Enquanto inativas, não
concedem permissões.

O perfil estrutural **Administrador** permanece protegido contra renomeação e
inativação. Somente um Administrador estrutural ativo pode atribuir ou remover
esse perfil, inclusive pela alteração de `is_admin`. `is_admin` continua
existindo durante a transição; sua remoção não
faz parte desta etapa. A associação estrutural e o campo precisam permanecer
coerentes enquanto ambos existirem. A regra que impede remover ou inativar o
último administrador ativo deve permanecer eficaz durante toda a migração,
inclusive em alterações combinadas de `is_active` e `profile_ids` e em
requisições concorrentes.

## Pontos de integração a resolver antes da implementação

- Definir o formato de resposta do catálogo de perfis atribuíveis e como
  exibir uma associação inativa preexistente sem oferecê-la como nova opção.
- O formato de exposição das permissões efetivas em `/auth/me` e a invalidação
  visual das ações após mudança externa ainda precisam ser definidos; o backend
  deve ser a fonte definitiva da autorização.
- A ordem de validação de CSRF, autenticação, autorização e payload deve ser
  fixada nos testes da etapa de implementação para evitar diferenças de 401/403.

## Etapa 3D-2 — configuração de permissões de Perfis

Esta seção descreve a implementação atual e substitui, para Perfis, as
indicações de comportamento futuro da Etapa 1 acima. As rotas usam
`profiles.view`, `profiles.create` e `profiles.update`; `is_admin` não é bypass.

POST `/api/v1/profiles` e PATCH `/api/v1/profiles/<id>` aceitam
`permission_ids`: uma lista de IDs inteiros positivos, sem duplicatas.
Booleanos, strings, valores nulos e IDs inexistentes são rejeitados com 400.
No POST, a ausência equivale a `[]`. No PATCH, a ausência preserva o conjunto
atual; uma lista presente substitui todo o conjunto. `[]` remove todas as
permissões de um perfil comum. Os formatos das respostas existentes de Perfis
permanecem inalterados.

GET `/api/v1/profiles/permissions` exige `profiles.view` e retorna
`{"permissions": [{"id": 1, "code": "patients.view", "description": "Consultar pacientes"}]}`
(exemplo de um item). A resposta contém as 13 permissões persistidas pelo
catálogo existente, ordenadas por `code` e depois `id`.

Quando `permission_ids` é enviado, todo o conjunto solicitado deve estar
contido nas permissões efetivas atuais do ator, inclusive permissões que o
perfil já possuía. Uma tentativa de concessão fora desse limite retorna 403.
A validação ocorre após o bloqueio compartilhado das escritas, antes de alterar
o perfil ou seus vínculos, dentro da mesma transação. Erros provocam rollback.

O perfil Administrador permanece protegido contra renomeação e inativação.
Seu conjunto deve preservar todas as permissões do catálogo; reduzi-lo retorna
409. POST com seu nome continua sujeito à proteção contra nomes duplicados.
Autenticação, CSRF e as autorizações de Usuários e Pacientes são preservados;
frontend, migrations e o catálogo não são alterados nesta etapa.

## Etapa 4A — permissões efetivas em `/auth/me`

GET `/api/v1/auth/me` inclui o campo `permissions` dentro de `user`. Ele é uma
lista ordenada dos códigos efetivos atuais. O cálculo reutiliza o resolvedor
único de permissões: considera a união das permissões de todos os perfis ativos
associados ao usuário, remove duplicatas e ignora perfis inativos. `is_admin`
não adiciona permissões por si só. A consulta ocorre a cada requisição, então
alterações persistidas aparecem sem novo login. Os demais campos e a semântica
de autenticação permanecem inalterados; usuário ausente ou inativo continua
recebendo 401.
