# Normalização de Usuários

`normalize_username` aplica `strip().upper()`; `validate_full_name` compacta espaços
entre palavras e aplica `upper()`; `normalize_email` mantém `strip().lower()`.
Os limites são verificados após a conversão, inclusive expansões Unicode como ß → SS.
API, model e comandos administrativos usam os mesmos validadores.
Senha não passa por esses normalizadores: os bytes textuais, inclusive espaços e
caixa, seguem intactos para o hashing e a comparação. A política vigente permanece.

## Compatibilidade e unicidade

O login normaliza a entrada e compara com os usernames existentes usando a mesma
função Python. Isso evita depender de SQL UPPER/LOWER ou da collation do banco,
que podem tratar Unicode de forma diferente. Contas legadas sem colisão continuam
acessíveis sem regravação no login. Uma identidade ambígua recebe a mesma resposta
genérica de credenciais inválidas; não se escolhe uma conta pelo hash ou pela caixa.

Criação e edição pela API e CLI verificam username e e-mail canônicos, inclusive
contra registros legados. As operações compartilham o bloqueio transacional de
escrita já usado pela API. Os índices únicos existentes permanecem; não há migração
ou alteração de schema. Atribuições ORM normalizam os campos novos/modificados;
carregar um objeto ou mudar apenas seu tema não regulariza os demais campos.
Atualizações parciais da API continuam alterando somente os campos enviados.

A comparação compatível lê IDs e identificadores, sem hashes, e tem custo linear
no número de usuários. É uma escolha explícita para manter o comportamento Unicode
idêntico antes e depois da regularização. Escritores externos por SQL/bulk não
passam pelos validadores: devem ser parados durante a operação e adotar o mesmo
contrato antes de voltar a escrever.

## Auditoria e regularização controlada

Na pasta `backend`, a operação padrão é somente leitura:

```bash
.venv/bin/python -m flask --app run normalize-users
```

A saída contém contagens, IDs e campos afetados, sem nomes, e-mails, senhas ou hashes.
Dados inválidos e colisões de username/e-mail bloqueiam a aplicação inteira.
Nenhuma conta é fundida, excluída ou renomeada automaticamente para resolver colisões.
Corrija esses casos por um procedimento administrativo revisado e repita a auditoria.

Depois de revisar o relatório, verificar um backup e parar escritores antigos,
a aplicação pode ser solicitada explicitamente:

```bash
.venv/bin/python -m flask --app run normalize-users --apply
```

O comando pede confirmação, adquire o mesmo bloqueio da API, recalcula a auditoria
e só então altera os campos. A transação é atômica e idempotente; falhas causam
rollback. Somente `username`, `full_name` e `email` são alterados. Campos legados
nulos continuam nulos; IDs, senhas/hashes, datas, permissões, status e tema permanecem.
`complete-legacy-user` continua direcionado a uma conta e também normaliza sua
identidade e dados cadastrais ao ser executado explicitamente; não é uma operação
em lote e não resolve identidades ambíguas.

A auditoria somente de leitura desta tarefa encontrou 3 usuários, todos com nome
e username a normalizar, nenhum e-mail a alterar e nenhuma colisão. Este relatório
é uma fotografia: repita a auditoria antes de aplicar. **Não foi executada
regularização no banco real.**
