import { useSyncExternalStore } from "react";
import { findDestination, resolveDestination } from "../routes/navigation";

function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getSnapshot() {
  return resolveDestination(window.location.hash);
}

function navigate(destinationId) {
  const destination = findDestination(destinationId);
  if (destination) window.location.hash = destination.href;
}

export function useNavigation() {
  const destination = useSyncExternalStore(subscribe, getSnapshot);
  return { destination, activeModuleId: destination.moduleId, navigate };
}
