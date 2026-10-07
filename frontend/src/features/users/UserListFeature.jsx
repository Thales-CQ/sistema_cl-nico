import UserList from "./components/UserList";
import useUserList from "./hooks/useUserList";

export default function UserListFeature(props) {
  const list = useUserList(props);
  return <UserList {...props} list={list} />;
}
