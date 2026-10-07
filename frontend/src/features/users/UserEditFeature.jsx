import { useRef } from "react";
import Button from "../../components/Button/Button";
import PasswordForm from "../../components/PasswordForm/PasswordForm";
import UserEdit from "./components/UserEdit";
import UserFormFeature from "./UserFormFeature";
import usePasswordForm from "./hooks/usePasswordForm";
import useUserEdit from "./hooks/useUserEdit";

export default function UserEditFeature(props) {
  const passwordButton = useRef(null);
  const edit = useUserEdit({ ...props, passwordButton });
  const password = usePasswordForm({
    mode: "reset",
    userId: edit.user?.id,
    disabled: edit.working,
    onFailure: props.onFailure,
    onBusyChange: edit.setWorking,
  });
  let form = null;
  if (!edit.loading && !edit.loadError && edit.user) {
    const {
      canUpdateData = false, canChangeStatus = false, canResetPassword = false,
      canAssignProfiles = false,
    } = props;
    const extraActions = <>
      {canChangeStatus && <Button className={`user-edit__status-button user-edit__status-button--${edit.user.is_active ? "inactive" : "active"}`}
        type="button" variant="secondary" disabled={edit.working} onClick={edit.changeStatus}>
        {edit.user.is_active ? "Inativar" : "Reativar"}
      </Button>}
      {canResetPassword && <Button ref={passwordButton} variant="secondary" disabled={edit.working || edit.resettingPassword}
        onClick={() => edit.setResettingPassword(true)} aria-expanded={edit.resettingPassword}>
        Redefinir senha
      </Button>}
    </>;
    form = <>
      <UserFormFeature user={edit.user} availableProfiles={edit.profiles} canUpdateData={canUpdateData}
        canAssignProfiles={canAssignProfiles} canChangeStatus={false}
        canSubmit={canUpdateData || canAssignProfiles || canChangeStatus}
        onSaved={edit.handleFormSaved} onCancel={props.onCancel} onFailure={props.onFailure}
        disabled={edit.working} onBusyChange={edit.setWorking} isActive={edit.user.is_active}
        extraActions={extraActions} />
      {edit.resettingPassword && <PasswordForm {...password} disabled={edit.working}
        onCancel={edit.cancelPasswordReset} />}
    </>;
  }
  return <UserEdit loading={edit.loading} loadError={edit.loadError} statusError={edit.statusError}
    onCancel={props.onCancel}>{form}</UserEdit>;
}
