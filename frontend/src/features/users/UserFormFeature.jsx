import UserForm from "./components/UserForm";
import useUserForm from "./hooks/useUserForm";

export default function UserFormFeature(props) {
  const form = useUserForm(props);
  return <UserForm form={form} onCancel={props.onCancel} extraActions={props.extraActions} />;
}
