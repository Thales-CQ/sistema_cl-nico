# Segurança

## Princípios

A segurança será implementada desde o início do projeto.

## Regras

- Senhas armazenadas somente em formato seguro;
- Segredos fora do código-fonte;
- Arquivo `.env` nunca deve ser enviado ao Git;
- Validação obrigatória no backend;
- Autenticação nas rotas protegidas;
- Autorização no backend;
- Uso de HTTPS em produção;
- Proteção contra SQL Injection;
- Proteção contra XSS;
- Controle de uploads quando houver;
- Registro de eventos importantes em auditoria;
- Princípio do menor privilégio.

## Respostas HTTP

401 - usuário não autenticado.

403 - usuário autenticado, mas sem permissão.

404 - recurso não encontrado.

422 - dados inválidos.

500 - erro interno do servidor.

## Regra importante

Ocultar uma opção no frontend não representa segurança.

Toda operação protegida deverá ser validada pelo backend.
