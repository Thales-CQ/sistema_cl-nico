# API de usuários — 0.0.11, Etapa 2

Todas as respostas dos endpoints abaixo usam `Cache-Control: no-store`.
A autenticação usa a sessão existente. Sessão ausente, inválida ou de usuário
inativo retorna 401; a sessão inválida é limpa por `resolve_active_user`.
Os endpoints `/users` exigem também `is_admin=true`; usuário comum recebe 403.

Mutações exigem o CSRF existente: obtenha o token por `GET /api/v1/auth/me`,
envie o cookie recebido e o cabeçalho `X-CSRF-Token`. Quando presente, `Origin`
deve ser a própria origem. A verificação CSRF precede a autenticação: token
inválido/ausente ou origem inválida retorna 403 mesmo sem sessão.

## Contratos

| Método e caminho | Entrada JSON | Sucesso |
| --- | --- | --- |
| GET `/api/v1/users` | — | 200, `{"users": [...]}`, ordenados por id, incluindo inativos |
| GET `/api/v1/users/<id>` | — | 200, `{"user": {...}}` |
| POST `/api/v1/users` | `full_name`, `birth_date`, `email`, `username`, `password` e `profile_ids` não vazio obrigatórios; `is_active` e `is_admin` opcionais | 201, `{"user": {...}}` |
| PATCH `/api/v1/users/<id>` | Um ou mais dentre `full_name`, `birth_date`, `email`, `username`, `is_admin`, `is_active`, `profile_ids`; quando enviado, `profile_ids` não pode ser vazio | 200, `{"user": {...}}` |
| PATCH `/api/v1/users/<id>/status` | Exclusivamente `{"is_active": true}` ou `false` | 200, `{"user": {...}}` |
| PATCH `/api/v1/users/<id>/password` | Exclusivamente `{"new_password": "..."}` | 200, `{"message": "Senha atualizada com sucesso."}` |
| PATCH `/api/v1/auth/me/password` | Exclusivamente `current_password` e `new_password`, ambos obrigatórios | 200, mesma mensagem |

O objeto público contém exclusivamente `id`, `full_name`, `birth_date`, `email`,
`username`, `is_active`, `is_admin`, `profiles`, `created_at`. Cadastros legados podem ter
nome, nascimento e e-mail nulos. Senhas e hashes nunca são serializados.
Na Etapa 3, login, `/auth/me` e atualização de preferências acrescentam
`is_admin` ao objeto existente (`id`, `username`, `theme`). A leitura de
preferências permanece igual. Nenhum desses endpoints retorna senha ou hash.

`birth_date` usa **AAAA-MM-DD** estrito na entrada e na saída (exemplo:
`2000-02-29`). A interface humana/CLI continua usando DD/MM/AAAA. A API adapta
o formato e reutiliza a validação da Etapa 1: data real, não futura, sem mudar
o tipo `Date` do banco. `created_at` é uma string ISO 8601 em UTC com sufixo `+00:00`. Valores sem
fuso devolvidos pelo banco são interpretados como UTC, conforme o padrão do modelo.

Nome completo tem espaços normalizados; username e e-mail são aparados e
convertidos para minúsculas. Limites e política de senha são os da Etapa 1:
nome até 120 caracteres, username até 80, e-mail válido até 254 e senha com
pelo menos 12 caracteres. A senha não é aparada. Booleanos aceitam somente
`true`/`false`, nunca números ou textos. Na criação, `is_active` assume `true`
e `is_admin` é derivado da associação com o perfil Administrador quando `profile_ids`
é enviado. O campo `profile_ids` exige ao menos um ID; PATCH sem esse campo preserva
as associações existentes, inclusive usuários legados sem perfil.

Payload vazio, JSON inválido, tipo incorreto, campo desconhecido ou obrigatório
ausente retorna 400. PATCH de cadastro não aceita senha. Conflito de
username/e-mail ou tentativa de remover o último administrador ativo retorna
409. Id inexistente retorna 404. Falha de banco retorna erro genérico 503 (ou
409 para integridade), sem detalhes SQL. O limite existente de 64 KiB continua
valendo (413). Erros usam `{"error": "..."}`.

Redefinição administrativa dispensa a senha anterior e pode atingir contas
inativas. Alteração própria exige a senha atual correta (403 se incorreta),
aceita qualquer usuário ativo e não altera privilégios. Senhas legadas curtas
podem ser verificadas como senha atual; a nova precisa cumprir a política.
Trocar a senha não encerra sessões existentes. Inativar a conta faz com que
seu próximo acesso protegido seja rejeitado pelo resolvedor existente.

## Integridade e concorrência

Todas as escritas usam um único commit, com rollback em falha, e validam os
campos antes de alterar os dados persistidos. As restrições únicas do banco
são a proteção final contra duplicidades concorrentes, inclusive com o CLI.

A regra central `preserve_active_admin` protege inativação e remoção de
privilégio. Escritas desta API são serializadas por um bloqueio transacional
na primeira conta: `SELECT ... FOR UPDATE` em MySQL/InnoDB e PostgreSQL; no
SQLite, uma atualização sem mudança de valor adquire o bloqueio de escrita.
A API não exclui contas. Após adquirir o bloqueio, ator, alvo e administradores
são lidos com bloqueio para evitar snapshots antigos no MySQL REPEATABLE READ.
O bloqueio é liberado no commit/rollback e funciona entre processos.

Essa escolha prioriza integridade e serializa inclusive alterações de senha;
pode limitar a vazão com muitos cadastros simultâneos. Scripts externos que
removam/inativem administradores devem adotar o mesmo protocolo. A suíte usa
SQLite em arquivo e exercita requisições concorrentes; a execução em
MySQL/InnoDB precisa ser homologada no ambiente correspondente.

A listagem desta etapa não tem paginação. Não há frontend novo, permissões por
módulo, alteração de schema ou mudança no tema.
