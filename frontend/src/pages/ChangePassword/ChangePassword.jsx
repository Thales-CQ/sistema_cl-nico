import PasswordForm from "../../components/PasswordForm/PasswordForm";
import { useNavigation } from "../../hooks/useNavigation";

export default function ChangePassword() {
  const { navigate } = useNavigation();
  return <PasswordForm onCancel={() => navigate("inicio")} />;
}
