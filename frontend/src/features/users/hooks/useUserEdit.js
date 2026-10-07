import { useEffect, useState } from "react";
import { getAssignableProfiles, getUser, updateUserStatus } from "../../../services/api";
import { statusChanged } from "../state/userEditState";

export default function useUserEdit({ userId, onSaved, onFailure, canAssignProfiles = false, passwordButton }) {
  const [user, setUser] = useState(null);
  const [originalIsActive, setOriginalIsActive] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;
    const request = canAssignProfiles
      ? Promise.all([getUser(userId), getAssignableProfiles()])
      : getUser(userId).then((userData) => [userData, { profiles: [] }]);
    request.then(
      ([userData, profilesData]) => {
        if (!active) return;
        setUser(userData.user);
        setOriginalIsActive(userData.user.is_active);
        setProfiles(profilesData.profiles.length ? profilesData.profiles : (userData.user.profiles ?? []));
      },
      (failure) => {
        if (!active) return;
        setLoadError(failure.message);
        onFailure(failure);
      },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, onFailure, canAssignProfiles]);

  async function changeStatus() {
    const action = user.is_active ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o usuário ${user.full_name || user.username}?`)) return;
    setStatusError("");
    setUser((current) => ({ ...current, is_active: !current.is_active }));
  }

  async function handleFormSaved(updatedUser) {
    const desiredStatus = user.is_active;
    if (statusChanged(originalIsActive, desiredStatus)) {
      try {
        const status = await updateUserStatus(user.id, desiredStatus);
        setUser(status.user);
        setOriginalIsActive(status.user.is_active);
        onSaved(status.user);
      } catch (failure) {
        setStatusError(failure.message);
        throw failure;
      }
      return;
    }
    setUser(updatedUser);
    onSaved(updatedUser);
  }

  function cancelPasswordReset() {
    setResettingPassword(false);
    // The trigger becomes enabled after React commits the close.
    requestAnimationFrame(() => passwordButton.current?.focus());
  }

  return {
    cancelPasswordReset, changeStatus, handleFormSaved, loadError, loading,
    profiles, resettingPassword, setResettingPassword, setWorking, statusError, user, working,
  };
}
