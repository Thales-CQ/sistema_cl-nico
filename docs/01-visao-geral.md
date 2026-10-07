# Visão Geral

## Objetivo

Construir um sistema clínico web seguro, organizado e escalável.

## Primeira meta

A primeira versão funcional será composta por:

- Login;
- Cadastro de pacientes;
- Consulta de pacientes.

## Arquitetura

React + Vite
        |
        | HTTPS / REST API
        v
Python + Flask
        |
        v
MySQL

### Arquitetura do frontend

- Layout reutilizável, responsivo e mobile-first;
- Preparado para temas;
- Componentes facilmente estilizados;
- Layouts separados para autenticação e área interna;
- Header/Menu reutilizáveis na área interna;
- Evitar CSS inline;
- Centralizar tokens visuais em variáveis CSS;
- Preparar estrutura para tema claro/escuro;
- Componentes com estados hover, focus, disabled e erro;
- Acessibilidade e navegação por teclado;
- Responsividade para mobile, tablet e desktop;
- Evitar acoplamento visual entre páginas;
- Páginas devem reutilizar componentes e layouts;
- AuthContext e proteção de rotas no frontend nunca substituem a validação/autorização no backend.

#### Estrutura atual do frontend

A aplicação organiza páginas, componentes compartilhados e funcionalidades por ownership. `App.jsx` compõe páginas e features; os módulos de pacientes, usuários e perfis pertencem a `features/`, não a `pages/`.

```text
frontend/
└── src/
    ├── App.jsx
    ├── components/
    │   ├── Header/, Menu/, Button/
    │   └── primitivas compartilhadas de formulário e senha
    ├── contexts/
    ├── layouts/
    │   ├── AuthLayout/
    │   └── MainLayout/
    ├── features/
    │   ├── patients/       # componentes, hooks e styles
    │   ├── users/          # componentes, hooks, state e styles
    │   └── profiles/       # componentes, hooks, state e styles
    ├── pages/
    │   ├── Login/
    │   ├── Dashboard/
    │   └── ChangePassword/
    ├── routes/
    ├── services/
    ├── styles/
    │   ├── variables.css
    │   ├── themes.css
    │   ├── global.css
    │   ├── reset.css
    │   └── tablet.css
    ├── hooks/
    └── main.jsx
frontend/tests/
```

Cada feature é proprietária da apresentação e dos estilos específicos do seu módulo. `components/` contém UI reutilizável sem regras de negócio; `styles/` mantém a fundação global. Consulte `frontend/README.md` para comandos e detalhes de ownership.

## Princípios

- Segurança desde o início;
- Separação entre frontend e backend;
- API REST;
- Validação no backend;
- Controle de acesso no backend;
- Código organizado por responsabilidade;
- Testes antes de expandir;
- Git desde o início.
