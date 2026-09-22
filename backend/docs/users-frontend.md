# Usuários — frontend da 0.0.11, Etapa 3

## Navegação e acesso

- `#/usuarios` abre a consulta (`#/usuarios/consultar`).
- `#/usuarios/cadastrar` abre o cadastro.
- A edição abre a partir de **Editar**, na consulta, como no módulo de pacientes.
- **Alterar senha**, no cabeçalho, abre `#/alterar-senha` para qualquer conta autenticada.
- O menu Usuários aparece somente com `is_admin === true`. Acesso direto ao hash
  administrativo por usuário comum mostra acesso restrito sem montar a tela administrativa.
- Login, `/auth/me` e a atualização de tema agora incluem `is_admin` no objeto de
  sessão, além dos campos existentes `id`, `username` e `theme`. A leitura periódica
  de preferências permanece igual, sem rotação de CSRF.
- 401 usa o tratamento global existente, encerra o estado autenticado e desmonta os
  formulários. 403 administrativo bloqueia a tela e reconsulta a sessão. Erros de
  CSRF e senha atual incorreta são apresentados sem confundir os dois casos com
  remoção de privilégio administrativo.

## Cadastro, edição e senha

A listagem mostra nome, username, e-mail, status, perfis e Editar. Ela segue a
listagem integral da Etapa 2, sem paginação artificial. Tem estados de carregamento,
erro com nova tentativa e lista vazia. Em telas pequenas, as linhas viram cartões.

O cadastro exige os campos cadastrais, senha, confirmação e pelo menos um perfil.
Não há controle de status no cadastro: novos usuários criados pela interface são
ativos. A ativação/inativação é feita posteriormente na edição. A data usa texto DD/MM/AAAA e é validada/convertida para
AAAA-MM-DD sem conversão de fuso. Datas inexistentes ou futuras são rejeitadas.
A confirmação e o mínimo de 12 caracteres são validados antes do envio.

A edição salva os campos cadastrais, perfis e status; permite completar dados
legados nulos sem forçar seu preenchimento para outras alterações. Na edição,
Inativar/Reativar exige confirmação e altera apenas o estado local do formulário.
Atualizar salva o status junto com os demais campos; Cancelar descarta a mudança
de status não salva.
Erros do backend, inclusive último administrador e duplicidade, são apresentados.

Redefinir senha abre um formulário separado na edição: apenas nova senha e
confirmação. Alterar minha senha solicita também a senha atual. Confirmações não
são enviadas à API. Senhas ficam apenas nos campos e na requisição em andamento,
sem armazenamento persistente, contexto de autenticação ou logs. Os campos são
limpos depois da tentativa de envio e são desmontados na saída; erros locais de
confirmação permitem corrigir os valores antes de enviar.

Alterações na própria conta atualizam username e privilégio no contexto sem
sobrescrever o tema. A própria inativação encerra o estado autenticado.
A proteção definitiva continua nos endpoints da Etapa 2.

## Validação

No frontend:

```sh
npm run lint
npm run build
node --test tests/users.test.mjs
```

Não havia suíte frontend no repositório. Os novos testes usam `node:test`, sem
novas dependências, e cobrem datas, confirmação de senha, navegação administrativa,
contratos da API, CSRF e propagação de 401/403/409.

No backend:

```sh
.venv/bin/python -m pytest -q tests/test_auth.py tests/test_users_api.py
```

Teste manual no navegador: fluxo completo com administrador e usuário comum,
atalho direto por hash, status confirmado/cancelado e último administrador,
redefinição e troca de senha, duplicidade, sessão expirada, temas claro/escuro,
mobile e navegação por Tab/Shift+Tab/Escape. Validar também menu e tema após
alterações na própria conta. Não foi feita automação visual de navegador.
