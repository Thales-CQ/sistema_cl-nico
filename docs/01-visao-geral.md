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

#### Estrutura planejada e evolutiva

A árvore abaixo é uma referência arquitetural planejada e evolutiva.
Nem todas as pastas e arquivos precisam existir imediatamente. A implementação
deve acontecer gradualmente, conforme cada funcionalidade for criada.

```text
frontend/
└── src/
    ├── components/
    │   ├── Header/
    │   ├── Menu/
    │   ├── Button/
    │   └── Form/
    ├── layouts/
    │   ├── AuthLayout/
    │   └── MainLayout/
    ├── pages/
    │   ├── Login/
    │   ├── Dashboard/
    │   └── Patients/
    ├── styles/
    │   ├── variables.css
    │   ├── themes.css
    │   ├── global.css
    │   └── responsive.css
    ├── services/
    │   └── api.js
    ├── contexts/
    │   └── AuthContext.jsx
    ├── hooks/
    ├── routes/
    ├── utils/
    └── App.jsx
```

## Princípios

- Segurança desde o início;
- Separação entre frontend e backend;
- API REST;
- Validação no backend;
- Controle de acesso no backend;
- Código organizado por responsabilidade;
- Testes antes de expandir;
- Git desde o início.
