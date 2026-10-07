import { useEffect, useRef, useState } from "react";
import { createProfile, getPermissionCatalog, updateProfile } from "../../../services/api";
import { permissionIdsFromProfile } from "../state/permissionCatalog";

export default function useProfileForm({ profile, onSaved, permissionCatalog, canEditPermissions = true }) {
  const editing = Boolean(profile);
  const [name, setName] = useState(profile?.name ?? "");
  const [isActive, setIsActive] = useState(profile?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState(permissionCatalog ?? null);
  const [catalogLoading, setCatalogLoading] = useState(permissionCatalog === undefined);
  const [catalogError, setCatalogError] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    () => permissionIdsFromProfile(profile),
  );
  const nameInput = useRef(null);

  useEffect(() => { nameInput.current?.focus(); }, []);

  useEffect(() => {
    if (permissionCatalog !== undefined) return undefined;
    let active = true;
    getPermissionCatalog().then(
      (data) => { if (active) setCatalog(data.permissions ?? []); },
      (failure) => { if (active) setCatalogError(failure.message); },
    ).finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [permissionCatalog]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || catalogLoading || catalogError) return;
    if (!name.trim()) {
      setNameError("Informe o nome do perfil.");
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setNameError("");
    setError("");
    try {
      const payload = { name };
      if (editing) payload.is_active = isActive;
      if (!editing || canEditPermissions) payload.permission_ids = selectedPermissionIds;
      if (editing) await updateProfile(profile.id, payload);
      else await createProfile(payload);
      onSaved();
    } catch (failure) {
      if (failure.errors?.name || [400, 409].includes(failure.status)) {
        setNameError(failure.errors?.name || failure.message);
        nameInput.current?.focus();
      } else {
        setError(failure.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function retryCatalog() {
    setCatalog(null);
    setCatalogError("");
    setCatalogLoading(true);
    getPermissionCatalog().then(
      (data) => setCatalog(data.permissions ?? []),
      (failure) => setCatalogError(failure.message),
    ).finally(() => setCatalogLoading(false));
  }

  function handleStatusChange() {
    const action = isActive ? "inativar" : "reativar";
    if (window.confirm(`Deseja ${action} o perfil ${profile.name}?`)) setIsActive(!isActive);
  }

  const administrator = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR") === "administrador";
  const permissionsDisabled = saving || (editing && !canEditPermissions) || administrator;
  return {
    administrator,
    canEditPermissions,
    catalog,
    catalogError,
    catalogLoading,
    editing,
    error,
    handleNameChange: (event) => { setName(event.target.value); if (nameError) setNameError(""); },
    handleStatusChange,
    handleSubmit,
    isActive,
    name,
    nameError,
    nameInput,
    onPermissionIdsChange: setSelectedPermissionIds,
    permissionsDisabled,
    profile,
    retryCatalog,
    saving,
    selectedPermissionIds,
  };
}
