import ProfileEdit from "./components/ProfileEdit";
import ProfileFormFeature from "./ProfileFormFeature";
import useProfileEdit from "./hooks/useProfileEdit";

export default function ProfileEditFeature(props) {
  const edit = useProfileEdit(props);
  const form = !edit.loading && !edit.error && edit.profile ? (
    <ProfileFormFeature profile={edit.profile} permissionCatalog={edit.permissionCatalog}
      canEditPermissions={props.canEditPermissions} onSaved={props.onSaved} onCancel={props.onCancel} />
  ) : null;
  return <ProfileEdit loading={edit.loading} error={edit.error} onCancel={props.onCancel}>{form}</ProfileEdit>;
}
