# Referência visual exploratória arquivada

Este conjunto preserva uma exploração visual anterior da Clínica. É uma referência histórica, independente da aplicação: não participa do runtime nem do build e não é fonte de verdade do produto. `DESIGN.md` e a implementação atual do frontend prevalecem. Elementos demonstrados aqui que ainda não foram implementados não representam requisitos automaticamente.

## Arquivos

- `index.html`: estrutura semântica, conteúdo demonstrativo e interações da prévia.
- `theme.css`: tokens de cor e variações `light`/`dark`.
- `layout.css`: reset, tipografia, componentes e estados comuns.
- `desktop.css`: composição para telas a partir de 761px.
- `mobile.css`: menu compacto, cartões e ajustes até 760px.

## Como alterar

1. Altere cores apenas nos tokens do arquivo de tema.
2. Altere dimensões e componentes no layout.
3. Coloque regras exclusivas de viewport no arquivo desktop ou mobile.
4. Preserve os estados `hover`, `focus`, `active` e `selected`.
5. Abra o HTML no navegador e teste os dois temas e larguras principais.

A ordem de carregamento é: tema, layout, desktop e mobile. O mobile fica por último para ajustar o que muda em telas menores.
