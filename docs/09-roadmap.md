# Roadmap

## Fundação

- [x] Estrutura inicial do projeto
- [x] Git
- [x] Documentação inicial

## Versão 0.0.1

- Estrutura do projeto
- Git
- Documentação

## Versão 0.0.2

- Backend Flask
- API Health
- Frontend React/Vite
- Comunicação frontend/backend

## Versão 0.0.3

- MySQL
- SQLAlchemy
- Migrações

## Versão 0.0.4

- Login
- Logout
- Autenticação

## Versão 0.0.5

- Permissões
- Autorização

## Versão 0.0.6

- Dashboard
- Layout principal

## Versão 0.0.7

- Cadastro de pacientes

## Versão 0.0.8

- [x] Consulta e pesquisa de pacientes
- [x] Edição de paciente
- [x] Carregamento dos dados atuais do paciente
- [x] Atualização dos dados do paciente
- [x] Inativação e reativação pela tela de edição
- [x] APIs de detalhes, atualização e status
- [x] Testes correspondentes

## Versão 0.0.9

- [x] Consulta paginada de pacientes
- [x] Pesquisa server-side por nome, CPF e telefone
- [x] Pesquisa tolerante a maiúsculas/minúsculas, acentos e pontuação
- [x] Paginação com 20 pacientes por página
- [x] Controles Anterior/Próxima e indicação da página
- [x] Total de resultados fornecido pela API
- [x] Estados de carregamento, erro e ausência de resultados
- [x] Responsividade e acessibilidade da paginação
- [x] Testes de pesquisa e paginação

## Versão 0.0.10

- Consolidação do cadastro de pacientes
- Definição e documentação da regra de pacientes inativos
- Revisão das validações, estados e regressões do cadastro
- Testes completos do fluxo de pacientes existente

### Regra de pacientes inativos

- Pacientes inativos permanecem no histórico e não são excluídos.
- A inativação impede sua seleção em novos fluxos clínicos quando esses fluxos forem implementados.
- A aplicação dessa regra a novos agendamentos será feita na versão de Agendamentos.
- A reativação torna o paciente elegível novamente conforme as regras do módulo correspondente.

## Versão 0.0.11

- Gestão de usuários
- Criação, edição, ativação e inativação de usuários
- Alteração e redefinição de senha
- Encerramento seguro de sessões de usuários inativos

### Dependências

- Autenticação e sessão existentes
- Modelo de usuário

### Critérios de conclusão

- Usuários autorizados administram contas.
- Usuários inativos não conseguem autenticar.
- Senhas nunca são expostas.
- Operações possuem validação backend e testes.

## Versão 0.0.12

- Perfis e permissões
- Autorização por módulo e ação
- Proteção backend para operações administrativas e clínicas
- Menu e navegação derivados das permissões

### Dependências

- Gestão de usuários da 0.0.11
- Autenticação existente

### Critérios de conclusão

- Toda operação sensível é autorizada no backend.
- Respostas 401 e 403 são coerentes.
- Testes cobrem acesso permitido e negado por perfil.

## Versão 0.0.13

- Cadastro de profissionais
- Registro profissional, contato e status
- Vínculo opcional com usuário
- Ativação, inativação, consulta e pesquisa

### Dependências

- Usuários da 0.0.11
- Perfis e permissões da 0.0.12

### Critérios de conclusão

- Profissionais possuem identificador único.
- Profissionais inativos não ficam disponíveis para novos fluxos clínicos.
- Vínculos e alterações são validados e testados.

## Versão 0.0.14

- Cadastro de especialidades
- Ativação e inativação de especialidades
- Vínculo entre profissionais e especialidades
- Validação de duplicidade

### Dependências

- Profissionais da 0.0.13
- Perfis e permissões da 0.0.12

### Critérios de conclusão

- Especialidades duplicadas são rejeitadas.
- Vínculos inválidos não são permitidos.
- Especialidades inativas não aparecem para novos fluxos clínicos.

## Versão 0.0.15

- Auditoria básica de ações sensíveis
- Registro de autoria, ação, entidade, data/hora e resultado
- Persistência protegida dos eventos

### Dependências

- Usuários da 0.0.11
- Perfis e permissões da 0.0.12

### Critérios de conclusão

- Ações administrativas e alterações de dados geram eventos básicos.
- Cada evento identifica autor, ação, entidade, data/hora e resultado.
- Usuários comuns não podem alterar os eventos.
- Testes confirmam autoria e persistência.

## Versão 0.0.16

- Agenda básica
- Disponibilidade de profissionais
- Horários por dia e período
- Duração dos horários
- Visualização diária e semanal
- Bloqueio de horários indisponíveis

### Dependências

- Pacientes da 0.0.10
- Profissionais da 0.0.13
- Especialidades da 0.0.14
- Auditoria básica da 0.0.15

### Critérios de conclusão

- Horários disponíveis são calculados consistentemente.
- Períodos inválidos são rejeitados.
- Horários bloqueados não podem ser utilizados.
- Alterações relevantes são auditadas.

## Versão 0.0.17

- Agendamentos
- Vínculo entre paciente, profissional, especialidade e horário
- Prevenção de conflito para paciente e profissional
- Status marcado, confirmado, cancelado, concluído e faltou
- Regras para pacientes e profissionais inativos

### Dependências

- Agenda da 0.0.16
- Pacientes da 0.0.10
- Profissionais da 0.0.13
- Especialidades da 0.0.14
- Auditoria básica da 0.0.15

### Critérios de conclusão

- Não existem agendamentos conflitantes.
- A prevenção de conflito também funciona sob concorrência.
- Transições de status são validadas.
- Pacientes e profissionais inativos não recebem novos agendamentos.
- Cancelamentos preservam histórico e autoria.

## Versão 0.0.18

- Registro de atendimento
- Início e conclusão a partir do agendamento
- Associação com paciente e profissional
- Status do atendimento
- Controle de acesso por perfil

### Dependências

- Agendamentos da 0.0.17
- Perfis e permissões da 0.0.12
- Auditoria básica da 0.0.15

### Critérios de conclusão

- Somente agendamentos válidos iniciam atendimento.
- Atendimento concluído obedece às regras de alteração.
- Autoria, data e status são persistidos.
- Fluxos normais e falhas possuem testes.

## Versão 0.0.19

- Prontuário clínico mínimo
- Prontuário por paciente
- Vínculo com atendimento
- Acesso pelo histórico do paciente
- Autoria e data de criação/atualização

### Dependências

- Atendimento da 0.0.18
- Perfis e permissões da 0.0.12
- Auditoria básica da 0.0.15

### Critérios de conclusão

- Cada registro pertence a paciente e atendimento válidos.
- Registros não podem ser atribuídos a usuário inexistente.
- Acesso é restrito por permissão.
- Histórico é ordenado cronologicamente.

## Versão 0.0.20

- Anamnese
- Evolução clínica
- Observações e condutas
- Histórico cronológico completo
- Autoria e data/hora de cada registro
- Regras de edição controlada

### Dependências

- Prontuário da 0.0.19
- Atendimento da 0.0.18
- Auditoria básica da 0.0.15

### Critérios de conclusão

- Anamnese e evolução são persistidas separadamente.
- Cada registro exibe autor e data/hora.
- A ordenação cronológica é estável.
- Alterações posteriores seguem regras explícitas e são auditadas.

## Versão 0.0.21

- Ampliação da auditoria clínica e administrativa
- Cobertura de login, usuários, pacientes, agenda, agendamentos e registros clínicos
- Consulta administrativa da auditoria
- Filtros por autor, entidade, ação e período

### Dependências

- Auditoria básica da 0.0.15
- Todos os módulos clínicos até a 0.0.20
- Perfis e permissões da 0.0.12

### Critérios de conclusão

- Ações sensíveis dos módulos existentes são registradas.
- Consulta é restrita a perfis autorizados.
- Eventos não podem ser alterados pela interface comum.
- Testes confirmam cobertura e filtros.

## Versão 0.0.22

- Segurança operacional
- HTTPS e configuração de produção
- Cookies seguros e política de sessão
- Limitação de tentativas de login
- Logs estruturados
- Tratamento de erros sem vazamento de dados
- Revisão de CSRF, origem e dados sensíveis

### Dependências

- Autenticação e permissões
- Auditoria básica e ampliada
- Fluxo clínico implementado

### Critérios de conclusão

- Checklist de segurança aprovado.
- Ambientes de desenvolvimento e produção estão separados.
- Operações protegidas possuem limites e logs adequados.
- Erros internos não expõem informações sensíveis.

## Versão 0.0.23

- Testes backend completos
- Testes frontend de componentes e estados
- Testes de integração
- Testes de permissões e concorrência de agenda
- Testes do fluxo paciente → agendamento → atendimento → prontuário
- Validação responsiva e acessível

### Dependências

- Módulos clínicos até a 0.0.20
- Auditoria da 0.0.21
- Segurança operacional da 0.0.22

### Critérios de conclusão

- Suíte backend aprovada.
- Lint e build frontend aprovados.
- Testes frontend e de integração aprovados.
- Cenários críticos automatizados.
- Nenhuma falha crítica permanece aberta.

## Versão 0.0.24

- Backup automatizado do banco
- Retenção e armazenamento protegido
- Restauração em ambiente isolado
- Verificação de integridade
- Procedimento documentado
- Teste periódico de recuperação

### Dependências

- Modelo de dados estabilizado
- Segurança operacional da 0.0.22
- Auditoria da 0.0.21

### Critérios de conclusão

- Backup automático executado com sucesso.
- Restauração recupera os dados clínicos integralmente.
- Procedimento é repetível e documentado.
- Falhas de backup são detectáveis.

## Versão 0.0.25

- Homologação do fluxo clínico completo
- Criação de paciente, profissional e agendamento
- Atendimento, anamnese, evolução e histórico
- Validação de permissões, auditoria e restauração

### Dependências

- Todas as versões anteriores.

### Critérios de conclusão

- Fluxo completo aprovado por usuários responsáveis.
- Nenhum bloqueio crítico permanece.
- Dados de teste estão isolados ou removidos.
- Backup e restauração foram aprovados.
- Documentação mínima de uso está disponível.

## Versão 0.1.0

- Primeira versão clínica utilizável
- Autenticação, usuários, profissionais e permissões
- Especialidades, pacientes, agenda e agendamentos
- Prevenção de conflitos e status de agendamento
- Atendimento e prontuário
- Anamnese, evolução e histórico cronológico
- Autoria, data/hora e auditoria
- Testes backend, frontend e integração
- Backup e restauração testados
- Preparação operacional para uso real

### Critérios de conclusão

- O fluxo paciente → agendamento → atendimento → prontuário/histórico funciona ponta a ponta.
- Permissões bloqueiam operações indevidas.
- Ações sensíveis são auditadas.
- Testes críticos passam.
- Backup e restauração foram executados com sucesso.
- Homologação foi aprovada.
- Nenhuma dependência essencial permanece aberta.

## Posterior à 0.1.0

- Financeiro
- Relatórios avançados
- Convênios
- Exportação PDF
- Procedimentos e preços avançados
- Integrações externas
- Adendos avançados
- Instalador completo
- Recursos avançados de produção
