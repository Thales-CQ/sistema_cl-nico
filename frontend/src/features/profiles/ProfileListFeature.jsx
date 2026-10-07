import ProfileList from "./components/ProfileList";
import useProfileList from "./hooks/useProfileList";

export default function ProfileListFeature(props) {
  const list = useProfileList(props);
  return <ProfileList {...props} list={list} />;
}
