import ProfileForm from "./components/ProfileForm";
import useProfileForm from "./hooks/useProfileForm";

export default function ProfileFormFeature(props) {
  const form = useProfileForm(props);
  return <ProfileForm form={form} onCancel={props.onCancel} />;
}
