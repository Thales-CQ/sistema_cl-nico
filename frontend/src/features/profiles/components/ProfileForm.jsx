import Button from "../../../components/Button/Button";
import FormField from "../../../components/FormField/FormField";
import TextField from "../../../components/TextField/TextField";
import PermissionSelector from "./PermissionSelector";
import "../styles/Profiles.css";

export default function ProfileForm({ form, onCancel }) {
  const {
    administrator, canEditPermissions, catalog, catalogError, catalogLoading, editing,
    error, handleNameChange, handleStatusChange, handleSubmit, isActive, name, nameError,
    nameInput, onPermissionIdsChange, permissionsDisabled, retryCatalog,
    saving, selectedPermissionIds,
  } = form;

  return <form className="profile-form" aria-labelledby="profiles-title" aria-busy={saving} onSubmit={handleSubmit}>
    <FormField className="profile-form__field" label="Nome do perfil" htmlFor="profile-name"
      error={nameError} errorId="profile-name-error" errorAs="small">
      <TextField ref={nameInput} id="profile-name" name="name" type="text" autoComplete="off"
        required value={name} disabled={saving} aria-invalid={Boolean(nameError)}
        aria-describedby={nameError ? "profile-name-error" : undefined} onChange={handleNameChange} />
    </FormField>
    {error && <p className="profiles__error" role="alert">{error}</p>}
    {catalogLoading && <p className="profiles__catalog-message" role="status">Carregando permissões...</p>}
    {catalogError && <div className="profiles__error" role="alert">
      <p>Não foi possível carregar as permissões: {catalogError}</p>
      <Button type="button" variant="secondary" onClick={retryCatalog}>Tentar novamente</Button>
    </div>}
    {catalog && (!editing || canEditPermissions) && <>
      <PermissionSelector catalog={catalog} selectedIds={selectedPermissionIds}
        onChange={onPermissionIdsChange} disabled={permissionsDisabled} />
      {administrator && <p className="profiles__catalog-message" role="note">
        As permissões estruturais do perfil Administrador não podem ser removidas.
      </p>}
    </>}
    <div className="profile-form__actions">
      <Button className="profile-form__save" type="submit" disabled={saving}>
        {saving ? (editing ? "Atualizando..." : "Salvando...") : (editing ? "Atualizar" : "Salvar")}
      </Button>
      <Button className="profile-form__cancel" type="button" variant="secondary" disabled={saving} onClick={onCancel}>
        Cancelar
      </Button>
      {editing && <Button className={`profile-form__status-button profile-form__status-button--${isActive ? "inactive" : "active"}`}
        type="button" variant="secondary" disabled={saving} onClick={handleStatusChange}>
        {isActive ? "Inativar" : "Reativar"}
      </Button>}
    </div>
  </form>;
}
