import { groupedPermissions, togglePermissionId } from "../state/permissionCatalog";
import "../styles/PermissionSelector.css";

export default function PermissionSelector({ catalog, selectedIds, onChange, disabled = false }) {
  const selected = new Set(selectedIds);
  const groups = groupedPermissions(catalog);

  function toggle(permissionId, checked) {
    onChange(togglePermissionId([...selected], permissionId, checked));
  }

  return (
    <fieldset className="permission-selector" disabled={disabled}>
      <legend>Permissões</legend>
      {groups.map((group) => (
        <section className="permission-selector__group" key={group.id}>
          <h3>{group.label}</h3>
          <div className="permission-selector__options">
            {group.permissions.map((permission) => (
              <label className="permission-selector__option" key={permission.id}>
                <input
                  type="checkbox"
                  checked={selected.has(permission.id)}
                  onChange={(event) => toggle(permission.id, event.target.checked)}
                />
                <span>{permission.label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </fieldset>
  );
}
