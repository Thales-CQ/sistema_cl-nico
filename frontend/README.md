# Frontend da Clínica

Aplicação web do Sistema Clínico para organizar a operação da clínica e simplificar o atendimento e os cadastros. A interface atende equipes administrativas e profissionais de saúde, em português do Brasil, com temas claro e escuro e layouts responsivos.

## Stack

- React 19;
- Vite 8;
- JavaScript com JSX;
- CSS, tokens semânticos e temas por variáveis CSS;
- ESLint.

## Arquitetura

```text
src/
  App.jsx                 composição de páginas e áreas pública/autenticada
  components/             componentes compartilhados e primitivas visuais
  contexts/               estado compartilhado de autenticação
  features/               módulos de pacientes, usuários e perfis
  hooks/                  coordenação compartilhada da aplicação
  layouts/                composição de autenticação e área interna
  pages/                  Login, Dashboard e ChangePassword
  routes/                 resolução e metadados de navegação
  services/               integração HTTP compartilhada
  styles/                 reset, estilos globais, tokens e temas
tests/                    testes automatizados do frontend
```

### Ownership

- `pages/` representa páginas da aplicação e compõe as features necessárias; não é o local proprietário dos módulos de pacientes, usuários ou perfis.
- `features/<módulo>/` mantém apresentação, hooks, regras/funções específicas e estilos próprios daquele módulo.
- `components/` contém UI compartilhada sem regras de negócio ou acesso direto à API.
- `layouts/` controla a composição de shell e conteúdo; autenticação, autorização, rotas e decisões de navegação permanecem na aplicação.
- `styles/` contém a fundação global e regras globais de layout que não pertencem a uma feature ou componente.
- A lógica e a integração com serviços ficam em JavaScript/JSX; CSS controla a apresentação. Evite CSS inline e preserve os contratos e comportamentos das features.

## Instalação e execução

Na pasta `frontend/`:

```sh
npm install
npm run dev
```

## Verificações

Execute na pasta `frontend/`:

```sh
npm run lint
npm run build
node --test tests/*.test.mjs
```
