---
name: Sistema Clínico
description: Interface clínica serena e organizada para tarefas administrativas e de cuidado.
colors:
  background: "#f3f8fc"
  surface: "#ffffff"
  surface-soft: "#eef8f7"
  text: "#18343b"
  text-muted: "#5d737b"
  care-teal: "#087f83"
  care-teal-hover: "#056469"
  action-blue: "#4267a9"
  action-blue-hover: "#31558f"
  on-action-primary: "#ffffff"
  amber-attention: "#e28b2f"
  action-edit-text: "#995000"
  on-action-edit: "#101112"
  action-status-inactive-text: "#805400"
  on-action-status-inactive: "#101112"
  action-status-active-text: "#246b4a"
  on-action-status-active: "#000000"
  focus: "#056469"
  success: "#2f8a61"
  success-text: "#246b4a"
  success-background: "#e7f5ec"
  danger: "#c53b4c"
  disabled-text: "#53666e"
  border: "#d7e5e9"
  nav-active: "#d8efec"
  nav-active-text: "#056469"
  dark-background: "#25272a"
  dark-surface: "#191a1b"
  dark-surface-soft: "#2b2c2d"
  dark-text: "#f1f1f1"
  dark-text-muted: "#b2b3b4"
  dark-action-blue: "#8ebcff"
  dark-action-blue-hover: "#b1d1ff"
  dark-on-action-primary: "#101112"
  dark-action-edit: "#f0ad55"
  dark-action-edit-text: "#f0ad55"
  dark-on-action-edit: "#101112"
  dark-amber-attention: "#e2b84a"
  dark-action-status-inactive-text: "#e2b84a"
  dark-on-action-status-inactive: "#101112"
  dark-action-status-active-text: "#70d69e"
  dark-on-action-status-active: "#101112"
  dark-focus: "#ffffff"
  dark-success: "#70d69e"
  dark-success-text: "#70d69e"
  dark-success-background: "#203b2d"
  dark-danger: "#ff737d"
  dark-border: "#38393a"
  dark-disabled-text: "#b0b4b8"
  dark-nav-active: "#3a3525"
  dark-nav-active-text: "#fff7db"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
  button:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
  meta:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "0.5rem"
  card: "0.875rem"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-6: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.on-action-primary}"
    typography: "{typography.button}"
    rounded: "11px"
    padding: "0.5rem 17px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "11px"
    padding: "0.5rem 17px"
    height: "46px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "42px"
  navigation-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.nav-active-text}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
    height: "38px"
  status-active:
    backgroundColor: "{colors.success-background}"
    textColor: "{colors.action-status-active-text}"
    rounded: "999px"
    padding: "4px 9px"
---
# Design System: Sistema Clínico

## Overview

**Creative North Star: "Organização serena"**

A interface organiza tarefas clínicas e administrativas com uma hierarquia previsível, linguagem visual precisa e uso funcional da cor. A paleta contemporânea combina superfícies frias e claras no tema claro com fundos grafite e texto de alto contraste no tema escuro. O conjunto mantém uma presença calma sem esconder ações, estados ou próximos passos.

A mesma linguagem de componentes atravessa os dois temas: cantos moderadamente arredondados, bordas finas, elevação suave e estados de interação explícitos. O espaço e a tipografia sustentam a leitura de formulários, listas e painéis de operação.

**Key Characteristics:**
- Organização visual orientada a tarefas, com títulos e rótulos legíveis.
- Teal de cuidado para identidade e foco no tema claro; azul funcional para ações; âmbar de atenção para edição.
- Superfícies claras no tema claro e grafite no tema escuro.
- Cartões com elevação leve e controles com estados claros.
- Layout responsivo de autenticação e área interna.

## Colors

A paleta comunica saúde contemporânea e mantém acentos funcionais distintos para ação, edição, foco e estados do sistema.

### Primary
- **Teal de cuidado:** identifica a marca, links, foco e realces principais no tema claro.
- **Azul funcional:** conduz ações primárias e seus estados de interação.
- **Âmbar de atenção:** sinaliza edição e atenção sem competir com a ação principal.

### Secondary
- **Verde de sucesso:** indica operações e estados ativos concluídos; textos de sucesso usam o token `success-text`.
- **Vermelho de erro:** identifica falhas, erros de validação e estados inativos.
- **Foco:** usa teal escuro (`#056469`) no tema claro e branco (`#ffffff`) no tema escuro.
- Textos funcionais de edição, status, sucesso e desabilitado usam tokens próprios para preservar contraste nos dois temas.
- No tema escuro, ações usam azul claro e âmbar destaca a navegação ativa.

### Neutral
- **Fundo azul névoa:** base do tema claro.
- **Superfície branca:** cartões, menus e campos no tema claro.
- **Texto azul petróleo:** conteúdo principal; o texto secundário usa um tom mais suave.
- **Grafite e carvão:** fundos e superfícies do tema escuro, com texto claro.
- **Bordas azul acinzentado:** delimitam superfícies e campos sem criar divisórias pesadas.

**The Color-Has-a-Job Rule.** Use teal for identity, blue for primary actions, amber for attention, and semantic colors for success or errors. Keep these roles distinct.

## Typography

**Display Font:** Inter (with system sans-serif fallbacks)
**Body Font:** Inter (with system sans-serif fallbacks)
**Label/Mono Font:** Inter; no separate monospace role is established.

**Character:** A neutral, highly legible sans-serif system. Weight and size create hierarchy without introducing a separate display voice.

### Hierarchy
- **Headline** (600, clamp from 1.875rem to 2.5rem, line-height 1.2): page-level headings.
- **Title** (600, 1.25rem, line-height 1.2): section headings.
- **Body** (400, 0.9375rem, line-height 1.5): primary interface copy.
- **Button** (650, 0.875rem, line-height 1.5): action labels.
- **Label** (600, 0.8125rem, line-height 1.5): form labels and compact control text.
- **Meta** (400, 0.75rem, line-height 1.5): supporting and status details.

**The One-Family Rule.** Keep Inter and its system fallbacks across the interface; use size and weight for hierarchy.

## Layout

The authenticated area uses a centered content region capped at 80rem (1280px), with fluid page padding from 1rem to 2.25rem. The internal module layout pairs a 13rem sidebar with a flexible content column and a 1rem gap on wide screens; it collapses to one column at 40rem (640px). The authentication panel is capped at 32rem.

Spacing follows a compact, reusable rhythm: 0.25rem, 0.5rem, 0.75rem, 1rem, and 1.5rem. Standard controls are generally at least 2.75rem tall; some buttons and fields define their own heights.

The header stacks its brand and account areas below 56.25rem (900px). The menu switches to a compact toggle at 760px; tablet-specific rules cover widths above 40rem through 64rem (640px–1024px). Patient and user tables adapt into labeled cards at narrower container widths, preserving their table semantics for assistive technology.

## Elevation & Depth

The system uses light tonal layering and restrained shadows to separate surfaces. Cards use an ambient shadow in the light theme (0 8px 24px, 7% teal-black); menus use a more pronounced shadow (0 14px 30px, 14% teal-black). The dark theme increases card shadow opacity to 22% black. Focus halos are state indicators and are documented with component behavior, not treated as surface elevation.

### Shadow Vocabulary
- **Card separation:** 0 8px 24px rgb(24 71 78 / 7%); dark theme uses 0 8px 24px rgb(0 0 0 / 22%).
- **Dropdown separation:** 0 14px 30px rgb(24 71 78 / 14%).
- **Compact menu separation:** 0 4px 12px rgb(24 71 78 / 16%).

**The Soft-Layer Rule.** Use shadows only to distinguish overlapping or separate surfaces; keep cards visually calm at rest.

## Shapes

Controls use gently rounded corners (8px); cards use a broader radius (14px). Buttons use a slightly fuller corner (11px), while status chips are fully pill-shaped (999px) and avatars or icon toggles are circular. Most boundaries are a 1px border. Keyboard focus uses a 2px outline with a 2px offset. A few local elements use nearby radii for fit, such as compact header controls and search fields.

## Components

Os componentes são precisos, calmos e fáceis de usar. Forma e cor apoiam a conclusão das tarefas; estados de hover, ativo, desabilitado, validação e foco por teclado permanecem distintos.

### Botões
- **Forma:** cantos suaves, raio de 11px.
- **Primário:** superfície azul funcional com rótulo contrastante; altura mínima de 46px e preenchimento de 8px por 17px.
- **Hover / Ativo:** escurece a cor de ação e sobe 1px no hover; retorna à posição de repouso ao pressionar.
- **Foco / Desabilitado:** contorno de foco de 2px, deslocado 2px; estado desabilitado usa superfície e texto atenuados.
- **Secundário:** cor de superfície com borda; hover acrescenta um leve tom de superfície e reforça a borda.
- **Ações contextuais:** edição usa âmbar; ações destrutivas ou de cancelamento usam a cor de erro.

### Etiquetas de status
- **Estilo:** status ativo usa superfície verde suave, texto verde e marcador circular pequeno; inativo usa a paleta de erro.
- **Estado:** use texto além da cor para comunicar o status.

### Cartões e contêineres
- **Cantos:** suavemente arredondados (14px).
- **Fundo:** token de superfície do tema.
- **Sombra:** leve, para separação; consulte Elevação e Profundidade.
- **Borda:** borda do tema com 1px.
- **Preenchimento interno:** varia conforme a superfície; cartões do dashboard usam 24px, formulários de paciente usam 20px e painéis compactos seguem a escala de espaçamento.

### Campos de entrada
- **Estilo:** superfície do tema, borda de 1px e raio de 8px; campos de formulário de paciente têm pelo menos 42px de altura.
- **Foco:** halo usando a cor de foco do tema: teal no claro e branco no escuro.
- **Erro / Desabilitado:** erro altera borda e halo; campos desabilitados usam fundo e texto atenuados.
- **Pesquisa:** campo arredondado compacto com ícone de pesquisa e halo ao receber foco.

### Navegação
- **Estilo:** links horizontais centralizados no desktop; submenus agrupados usam superfície com borda e sombra.
- **Ativa:** superfície tonal e borda de acento; a barra lateral do módulo também usa acento interno na borda inicial.
- **Dispositivos móveis:** recolhe atrás de um botão de menu; o submenu expandido ocupa seu próprio espaço no fluxo.

### Alternador de tema
- **Estilo:** controle circular com borda, 42px, e ícone linear de 20px.
- **Comportamento:** alterna os ícones atual e de hover; em telas estreitas, o ícone permanece estável.

## Do's and Don'ts

### Do:
- **Do** preserve os papéis funcionais de teal, azul e âmbar e a distinção semântica entre sucesso e erro.
- **Do** mantenha os temas claro e escuro legíveis, com tokens de superfície, texto e borda mapeados para cada tema.
- **Do** preserve o foco visível por teclado e respeite a preferência por movimento reduzido.
- **Do** adapte as tabelas de pacientes e usuários para cartões com rótulos quando o contêiner não comportar uma tabela confortável.
- **Do** use sombras suaves para separar superfícies, não como decoração.

### Don't:
- **Don't** introduza uma segunda fonte de display ou uma voz monospace separada sem necessidade confirmada.
- **Don't** use apenas a cor para comunicar estados ativo, erro, sucesso ou inativo.
- **Don't** reduza os papéis semânticos das cores a um único acento.
- **Don't** remova rótulos responsivos das tabelas ou feedback de foco por teclado.
