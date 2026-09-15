export const navigationItems = [
  { id: "inicio", label: "Início", href: "#/inicio" },
  {
    id: "pacientes",
    label: "Pacientes",
    href: "#/pacientes",
    children: [
      {
        id: "pacientes-cadastrar",
        label: "Cadastrar paciente",
        href: "#/pacientes/cadastrar",
        view: "cadastrar",
      },
      {
        id: "pacientes-consultar",
        label: "Consultar pacientes",
        href: "#/pacientes/consultar",
        view: "consultar",
      },
    ],
  },
];

// Stable objects keep useSyncExternalStore snapshots consistent.
const destinations = navigationItems.flatMap((module) => {
  const items = module.children ?? [module];
  return items.map((item) => ({
    ...item,
    routeId: item.id,
    id: module.id,
    moduleId: module.id,
  }));
});

export function resolveDestination(hash) {
  const href = hash === "#/pacientes" ? "#/pacientes/consultar" : hash;
  return destinations.find((item) => item.href === href) ?? destinations[0];
}

export function findDestination(destinationId) {
  const routeId = destinationId === "pacientes" ? "pacientes-consultar" : destinationId;
  return destinations.find((item) => item.routeId === routeId);
}
