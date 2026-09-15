# Modelo visual da prévia clínica

Este conjunto é independente do código principal e serve como base visual reutilizável.

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
