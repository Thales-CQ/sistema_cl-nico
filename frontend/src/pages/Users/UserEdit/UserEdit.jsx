import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import PasswordForm from "../../../components/PasswordForm/PasswordForm";
import { getProfiles, getUser } from "../../../services/api";
import { editableProfiles } from "../userProfileSelection";
import UserCreate from "../UserCreate/UserCreate";
import "./UserEdit.css";

export default function UserEdit({ userId, onSaved, onCancel, onFailure }) {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const passwordButton = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([getUser(userId), getProfiles()]).then(
      ([userData, profilesData]) => {
        if (!active) return;
        setUser(userData.user);
        setProfiles(editableProfiles(profilesData.profiles, userData.user.profiles ?? []));
      },
      (failure) => {
        if (!active) return;
        setLoadError(failure.message);
        onFailure(failure);
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, onFailure]);

  function changeStatus() {
    if (working) return;
    const action = user.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o usuário ${user.full_name || user.username}?`)) return;
    setUser((current) => ({ ...current, is_active: !current.is_active }));
  }

  if (loading) return <p className="user-edit__message" role="status">Carregando usuário...</p>;
  if (loadError) return <div className="user-edit__message user-edit__message--error" role="alert">
    <p>{loadError}</p><Button variant="secondary" onClick={onCancel}>Voltar</Button></div>;
  if (!user) return null;

  return <div className="users__edit">
    <UserCreate user={user} availableProfiles={profiles} onSaved={onSaved} onCancel={onCancel} onFailure={onFailure}
      disabled={working} onBusyChange={setWorking}
      isActive={user.is_active}
      extraActions={<>
        <Button className={`user-edit__status-button user-edit__status-button--${user.is_active ? "inactive" : "active"}`}
          type="button" variant="secondary" disabled={working} onClick={changeStatus}>
          {user.is_active ? "Inativar" : "Reativar"}
        </Button>
        <Button ref={passwordButton} variant="secondary" disabled={working || resettingPassword}
          onClick={() => setResettingPassword(true)} aria-expanded={resettingPassword}>
          Redefinir senha
        </Button>
      </>} />
    {resettingPassword && <PasswordForm userId={user.id} onFailure={onFailure} disabled={working}
      onBusyChange={setWorking} onCancel={() => {
        setResettingPassword(false);
        // The trigger becomes enabled after React commits the close.
        requestAnimationFrame(() => passwordButton.current?.focus());
      }} />}
  </div>;
}
