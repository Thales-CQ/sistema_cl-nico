export const navigationItems = [
  {
    id: "inicio", label: "Início", href: "#/inicio",
  },
  {
    id: "atendimento", label: "Atendimento",
    children: [
      {
        id: "pacientes", routeId: "pacientes-consultar", pageId: "pacientes",
        label: "Pacientes", href: "#/pacientes/consultar", view: "consultar",
      },
      { id: "agendamentos", label: "Agendamento", disabled: true },
      { id: "atendimentos", label: "Atendimento", disabled: true },
    ],
  },
  { id: "financeiro", label: "Financeiro", disabled: true },
  { id: "relatorios", label: "Relatório", disabled: true },
  {
    id: "configuracoes", label: "Configurações",
    children: [
      {
        id: "usuarios", routeId: "usuarios-consultar", pageId: "usuarios",
        label: "Usuários", href: "#/usuarios/consultar", view: "consultar",
      },
      {
        id: "perfis", routeId: "perfis-consultar", pageId: "perfis",
        label: "Perfis", href: "#/perfis/consultar", view: "consultar",
      },
    ],
  },
];

// Stable objects keep useSyncExternalStore snapshots consistent.
function flattenNavigation(items, moduleId, pageId) {
  return items.flatMap((item) => {
    const currentModuleId = moduleId ?? item.id;
    const currentPageId = item.pageId ?? pageId;
    if (item.disabled) return [];
    if (item.children?.length) return flattenNavigation(item.children, currentModuleId, currentPageId);
    return [{ ...item, routeId: item.routeId ?? item.id, id: currentPageId ?? currentModuleId, moduleId: currentModuleId }];
  });
}

const destinations = flattenNavigation(navigationItems);

// Internal module navigation remains hash-addressable without exposing these
// actions as expandable items in the main menu.
destinations.push(
  { id: "pacientes", moduleId: "atendimento", routeId: "pacientes-cadastrar", label: "Cadastrar paciente", href: "#/pacientes/cadastrar", view: "cadastrar" },
  { id: "usuarios", moduleId: "configuracoes", routeId: "usuarios-cadastrar", label: "Cadastrar usuário", href: "#/usuarios/cadastrar", view: "cadastrar" },
  { id: "perfis", moduleId: "configuracoes", routeId: "perfis-cadastrar", label: "Cadastrar perfil", href: "#/perfis/cadastrar", view: "cadastrar" },
);

destinations.push({
  id: "alterar-senha", moduleId: "alterar-senha", routeId: "alterar-senha",
  label: "Alterar minha senha", href: "#/alterar-senha",
});

export function resolveDestination(hash) {
  const href = ["#/pacientes", "#/usuarios", "#/perfis"].includes(hash) ? `${hash}/consultar` : hash;
  return destinations.find((item) => item.href === href) ?? destinations[0];
}

export function findDestination(destinationId) {
  const routeId = ["pacientes", "usuarios", "perfis"].includes(destinationId) ? `${destinationId}-consultar` : destinationId;
  return destinations.find((item) => item.routeId === routeId);
}


export function navigationForUser(user) {
  return navigationItems.filter((item) => item.id !== "configuracoes" || user?.is_admin === true);
}
